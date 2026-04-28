import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { TransactionExecutor } from '@/lib/db';
import { ValidationError } from '@/lib/server/errors';
import { inventory, inventoryMovements } from 'drizzle/schema/inventory/inventory';

type OrderTransaction = TransactionExecutor;

export interface ReservationInventoryRow {
  id: string;
  productId: string;
  locationId: string;
  quantityOnHand: number | null | undefined;
  quantityAllocated: number | null | undefined;
  quantityAvailable?: number | string | null | undefined;
  createdAt?: Date | null;
}

export interface ReservationMovementRow {
  id: string;
  inventoryId: string;
  orderLineItemId: string;
  movementType: 'allocate' | 'deallocate' | 'ship' | 'return' | string;
  quantity: number | null | undefined;
  createdAt?: Date | null;
}

export interface ActiveReservation {
  inventoryId: string;
  orderLineItemId: string;
  quantity: number;
  lastMovementAt: Date | null;
}

export interface ReservationStep {
  inventoryId: string;
  quantity: number;
}

export interface ReservationWriteContext {
  organizationId: string;
  orderId: string;
  orderLineItemId: string;
  productId: string;
  productName: string;
  userId: string;
}

function numeric(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function reservationDelta(movement: ReservationMovementRow): number {
  const quantity = numeric(movement.quantity);
  switch (movement.movementType) {
    case 'allocate':
      return Math.max(0, -quantity);
    case 'deallocate':
      return -Math.max(0, quantity);
    case 'ship':
      return quantity < 0 ? quantity : -quantity;
    default:
      return 0;
  }
}

export function summarizeActiveReservations(
  movements: ReservationMovementRow[]
): ActiveReservation[] {
  const active = new Map<string, ActiveReservation>();

  for (const movement of movements) {
    if (!movement.orderLineItemId || !movement.inventoryId) continue;

    const key = `${movement.orderLineItemId}:${movement.inventoryId}`;
    const current =
      active.get(key) ??
      ({
        inventoryId: movement.inventoryId,
        orderLineItemId: movement.orderLineItemId,
        quantity: 0,
        lastMovementAt: null,
      } satisfies ActiveReservation);

    current.quantity = Math.max(0, current.quantity + reservationDelta(movement));
    current.lastMovementAt = movement.createdAt ?? current.lastMovementAt;
    active.set(key, current);
  }

  return Array.from(active.values()).filter((reservation) => reservation.quantity > 0);
}

export function planReservationFromInventoryRows(
  rows: ReservationInventoryRow[],
  quantity: number,
  itemLabel: string
): ReservationStep[] {
  let remaining = quantity;
  const plan: ReservationStep[] = [];

  for (const row of rows) {
    if (remaining <= 0) break;

    const available = Math.max(
      0,
      row.quantityAvailable == null
        ? numeric(row.quantityOnHand) - numeric(row.quantityAllocated)
        : numeric(row.quantityAvailable)
    );
    if (available <= 0) continue;

    const reserveQuantity = Math.min(remaining, available);
    plan.push({ inventoryId: row.id, quantity: reserveQuantity });
    remaining -= reserveQuantity;
  }

  if (remaining > 0) {
    const available = quantity - remaining;
    throw new ValidationError('Insufficient inventory available to pick', {
      inventory: [
        `Only ${available} unit${available !== 1 ? 's are' : ' is'} available to reserve for "${itemLabel}".`,
      ],
    });
  }

  return plan;
}

export function planReservationRelease(
  reservations: ActiveReservation[],
  quantity: number,
  itemLabel: string
): ReservationStep[] {
  let remaining = quantity;
  const plan: ReservationStep[] = [];

  const ordered = [...reservations].sort((a, b) => {
    const aTime = a.lastMovementAt?.getTime() ?? 0;
    const bTime = b.lastMovementAt?.getTime() ?? 0;
    return bTime - aTime || b.inventoryId.localeCompare(a.inventoryId);
  });

  for (const reservation of ordered) {
    if (remaining <= 0) break;
    const releaseQuantity = Math.min(remaining, reservation.quantity);
    plan.push({ inventoryId: reservation.inventoryId, quantity: releaseQuantity });
    remaining -= releaseQuantity;
  }

  if (remaining > 0) {
    throw new ValidationError('Picked inventory reservation is incomplete', {
      inventory: [
        `Could not find ${remaining} reserved unit${remaining !== 1 ? 's' : ''} for "${itemLabel}". Unpick and pick this line again to reserve stock.`,
      ],
    });
  }

  return plan;
}

export function planReservedInventoryConsumption(
  reservations: ActiveReservation[],
  quantity: number,
  itemLabel: string
): ReservationStep[] {
  const reservedQuantity = reservations.reduce(
    (sum, reservation) => sum + reservation.quantity,
    0
  );
  if (reservedQuantity < quantity) {
    throw new ValidationError('Picked inventory is not reserved', {
      inventory: [
        `Only ${reservedQuantity} reserved picked unit${reservedQuantity !== 1 ? 's are' : ' is'} available for "${itemLabel}". Unpick and pick this line again so stock is reserved before shipping.`,
      ],
    });
  }

  const plan = planReservationRelease(reservations, quantity, itemLabel);
  return plan;
}

export async function readActiveReservationsForLineItems(
  tx: OrderTransaction,
  params: {
    organizationId: string;
    orderLineItemIds: string[];
  }
): Promise<Map<string, ActiveReservation[]>> {
  if (params.orderLineItemIds.length === 0) return new Map();

  const rows = await tx
    .select({
      id: inventoryMovements.id,
      inventoryId: inventoryMovements.inventoryId,
      referenceId: inventoryMovements.referenceId,
      movementType: inventoryMovements.movementType,
      quantity: inventoryMovements.quantity,
      metadata: inventoryMovements.metadata,
      createdAt: inventoryMovements.createdAt,
    })
    .from(inventoryMovements)
    .where(
      and(
        eq(inventoryMovements.organizationId, params.organizationId),
        or(
          and(
            eq(inventoryMovements.referenceType, 'order_line_item'),
            inArray(inventoryMovements.referenceId, params.orderLineItemIds),
            inArray(inventoryMovements.movementType, ['allocate', 'deallocate'])
          ),
          and(
            eq(inventoryMovements.referenceType, 'shipment'),
            inArray(inventoryMovements.movementType, ['ship']),
            inArray(
              sql<string>`${inventoryMovements.metadata}->>'orderLineItemId'`,
              params.orderLineItemIds
            )
          )
        )
      )
    )
    .orderBy(asc(inventoryMovements.createdAt), asc(inventoryMovements.id));

  const reservations = summarizeActiveReservations(
    rows.flatMap((row) => {
      const metadata = (row.metadata ?? {}) as { orderLineItemId?: unknown };
      const orderLineItemId =
        row.movementType === 'ship' && typeof metadata.orderLineItemId === 'string'
          ? metadata.orderLineItemId
          : row.referenceId;

      return orderLineItemId
        ? [
            {
              ...row,
              orderLineItemId,
            },
          ]
        : [];
    })
  );

  const byLine = new Map<string, ActiveReservation[]>();
  for (const reservation of reservations) {
    const current = byLine.get(reservation.orderLineItemId) ?? [];
    current.push(reservation);
    byLine.set(reservation.orderLineItemId, current);
  }
  return byLine;
}

export async function reserveNonSerializedPickInventory(
  tx: OrderTransaction,
  params: ReservationWriteContext & { quantity: number }
): Promise<ReservationStep[]> {
  const rows = await tx
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.organizationId, params.organizationId),
        eq(inventory.productId, params.productId),
        isNull(inventory.serialNumber),
        sql`${inventory.quantityAvailable} > 0`
      )
    )
    .orderBy(asc(inventory.createdAt), asc(inventory.id))
    .for('update');

  const plan = planReservationFromInventoryRows(rows, params.quantity, params.productName);

  for (const step of plan) {
    const row = rows.find((item) => item.id === step.inventoryId);
    if (!row) continue;

    const previousAvailable = numeric(row.quantityAvailable);
    const newAvailable = previousAvailable - step.quantity;

    await tx
      .update(inventory)
      .set({
        quantityAllocated: sql`${inventory.quantityAllocated} + ${step.quantity}`,
        status: newAvailable <= 0 ? 'allocated' : 'available',
        updatedBy: params.userId,
      })
      .where(eq(inventory.id, step.inventoryId));

    await tx.insert(inventoryMovements).values({
      organizationId: params.organizationId,
      inventoryId: step.inventoryId,
      productId: row.productId,
      locationId: row.locationId,
      movementType: 'allocate',
      quantity: -step.quantity,
      previousQuantity: previousAvailable,
      newQuantity: newAvailable,
      referenceType: 'order_line_item',
      referenceId: params.orderLineItemId,
      metadata: {
        orderId: params.orderId,
        orderLineItemId: params.orderLineItemId,
        source: 'order_picking',
      },
      notes: `Picked for order ${params.orderId}`,
      createdBy: params.userId,
    });
  }

  return plan;
}

export async function releaseNonSerializedPickInventory(
  tx: OrderTransaction,
  params: ReservationWriteContext & { quantity: number }
): Promise<ReservationStep[]> {
  const reservationsByLine = await readActiveReservationsForLineItems(tx, {
    organizationId: params.organizationId,
    orderLineItemIds: [params.orderLineItemId],
  });
  const plan = planReservationRelease(
    reservationsByLine.get(params.orderLineItemId) ?? [],
    params.quantity,
    params.productName
  );

  for (const step of plan) {
    const [row] = await tx
      .select()
      .from(inventory)
      .where(and(eq(inventory.id, step.inventoryId), eq(inventory.organizationId, params.organizationId)))
      .for('update')
      .limit(1);

    if (!row) {
      throw new ValidationError('Reserved inventory row not found', {
        inventory: [`Inventory row ${step.inventoryId} is missing for "${params.productName}".`],
      });
    }

    const previousAvailable = numeric(row.quantityAvailable);

    await tx
      .update(inventory)
      .set({
        quantityAllocated: sql`greatest(${inventory.quantityAllocated} - ${step.quantity}, 0)`,
        status: sql`CASE WHEN greatest(${inventory.quantityAllocated} - ${step.quantity}, 0) > 0 THEN 'allocated'::inventory_status ELSE 'available'::inventory_status END`,
        updatedBy: params.userId,
      })
      .where(eq(inventory.id, row.id));

    await tx.insert(inventoryMovements).values({
      organizationId: params.organizationId,
      inventoryId: row.id,
      productId: row.productId,
      locationId: row.locationId,
      movementType: 'deallocate',
      quantity: step.quantity,
      previousQuantity: previousAvailable,
      newQuantity: previousAvailable + step.quantity,
      referenceType: 'order_line_item',
      referenceId: params.orderLineItemId,
      metadata: {
        orderId: params.orderId,
        orderLineItemId: params.orderLineItemId,
        source: 'order_unpick',
      },
      notes: `Unpicked from order ${params.orderId}`,
      createdBy: params.userId,
    });
  }

  return plan;
}
