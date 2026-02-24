import { and, eq, isNull, sql } from "drizzle-orm";
import {
  inventory,
  orderLineSerialAllocations,
  serializedItemEvents,
  serializedItems,
  shipmentItemSerials,
} from "drizzle/schema";
import { normalizeSerial } from "@/lib/serials";
import type { TransactionExecutor } from "@/lib/db";
import { ValidationError } from "@/lib/server/errors";
import {
  emitSerializedFallbackTelemetry,
  SERIAL_LINEAGE_FLAGS,
} from "@/lib/server/serialized-lineage-cutover";

type DbTransaction = TransactionExecutor;
type SerializedItemStatus =
  | "available"
  | "allocated"
  | "shipped"
  | "returned"
  | "quarantined"
  | "scrapped";

export function isMissingSerializedInfraError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message ?? "";
  return code === "42P01" || code === "42703" || message.includes("does not exist");
}

async function withSerializedInfraGuard<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (isMissingSerializedInfraError(error)) {
      return null;
    }
    throw error;
  }
}

export async function upsertSerializedItemForInventory(
  tx: DbTransaction,
  params: {
    organizationId: string;
    productId: string;
    serialNumber: string;
    inventoryId: string;
    status?: "available" | "allocated" | "shipped" | "returned" | "quarantined" | "scrapped";
    sourceReceiptItemId?: string;
    userId: string;
  }
): Promise<string | null> {
  if (!SERIAL_LINEAGE_FLAGS.canonicalWrite) {
    return null;
  }
  const normalized = normalizeSerial(params.serialNumber);
  const result = await withSerializedInfraGuard(async () => {
    const [existing] = await tx
      .select({ id: serializedItems.id })
      .from(serializedItems)
      .where(
        and(
          eq(serializedItems.organizationId, params.organizationId),
          eq(serializedItems.serialNumberNormalized, normalized)
        )
      )
      .limit(1);

    const effectiveStatus = params.status ?? "available";

    if (existing) {
      await tx
        .update(serializedItems)
        .set({
          productId: params.productId,
          status: effectiveStatus,
          currentInventoryId: params.inventoryId,
          updatedBy: params.userId,
          updatedAt: new Date(),
        })
        .where(eq(serializedItems.id, existing.id));

      if (effectiveStatus === "available") {
        await releaseSerializedItemAllocation(tx, {
          organizationId: params.organizationId,
          serializedItemId: existing.id,
          userId: params.userId,
        });
      }
      return existing.id;
    }

    const [created] = await tx
      .insert(serializedItems)
      .values({
        organizationId: params.organizationId,
        productId: params.productId,
        serialNumberRaw: params.serialNumber,
        serialNumberNormalized: normalized,
        status: effectiveStatus,
        currentInventoryId: params.inventoryId,
        sourceReceiptItemId: params.sourceReceiptItemId,
        createdBy: params.userId,
        updatedBy: params.userId,
      })
      .returning({ id: serializedItems.id });

    if (effectiveStatus === "available") {
      await releaseSerializedItemAllocation(tx, {
        organizationId: params.organizationId,
        serializedItemId: created.id,
        userId: params.userId,
      });
    }
    return created.id;
  });
  return result;
}

export async function addSerializedItemEvent(
  tx: DbTransaction,
  params: {
    organizationId: string;
    serializedItemId: string;
    eventType:
      | "received"
      | "allocated"
      | "deallocated"
      | "shipped"
      | "returned"
      | "warranty_registered"
      | "warranty_claimed"
      | "rma_requested"
      | "rma_received"
      | "status_changed";
    entityType?: string;
    entityId?: string;
    notes?: string;
    userId: string;
  }
): Promise<void> {
  if (!SERIAL_LINEAGE_FLAGS.canonicalWrite) {
    return;
  }
  await withSerializedInfraGuard(async () => {
    await tx.insert(serializedItemEvents).values({
      organizationId: params.organizationId,
      serializedItemId: params.serializedItemId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      notes: params.notes,
      createdBy: params.userId,
      updatedBy: params.userId,
    });
  });
}

export async function allocateSerializedItemToOrderLine(
  tx: DbTransaction,
  params: {
    organizationId: string;
    serializedItemId: string;
    orderLineItemId: string;
    userId: string;
  }
): Promise<void> {
  if (!SERIAL_LINEAGE_FLAGS.canonicalWrite) {
    return;
  }
  await withSerializedInfraGuard(async () => {
    await tx
      .update(orderLineSerialAllocations)
      .set({ isActive: false, releasedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(orderLineSerialAllocations.organizationId, params.organizationId),
          eq(orderLineSerialAllocations.serializedItemId, params.serializedItemId),
          eq(orderLineSerialAllocations.isActive, true),
          isNull(orderLineSerialAllocations.releasedAt)
        )
      );

    await tx.insert(orderLineSerialAllocations).values({
      organizationId: params.organizationId,
      serializedItemId: params.serializedItemId,
      orderLineItemId: params.orderLineItemId,
      isActive: true,
    });

    await tx
      .update(serializedItems)
      .set({
        status: "allocated",
        updatedBy: params.userId,
        updatedAt: new Date(),
      })
      .where(eq(serializedItems.id, params.serializedItemId));
  });
}

export async function releaseSerializedItemAllocation(
  tx: DbTransaction,
  params: {
    organizationId: string;
    serializedItemId: string;
    userId: string;
  }
): Promise<void> {
  if (!SERIAL_LINEAGE_FLAGS.canonicalWrite) {
    return;
  }
  await withSerializedInfraGuard(async () => {
    await tx
      .update(orderLineSerialAllocations)
      .set({
        isActive: false,
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orderLineSerialAllocations.organizationId, params.organizationId),
          eq(orderLineSerialAllocations.serializedItemId, params.serializedItemId),
          eq(orderLineSerialAllocations.isActive, true)
        )
      );

    await tx
      .update(serializedItems)
      .set({
        status: "available",
        updatedBy: params.userId,
        updatedAt: new Date(),
      })
      .where(eq(serializedItems.id, params.serializedItemId));
  });
}

export async function linkSerializedItemToShipmentItem(
  tx: DbTransaction,
  params: {
    organizationId: string;
    shipmentItemId: string;
    serializedItemId: string;
    userId: string;
  }
): Promise<void> {
  if (!SERIAL_LINEAGE_FLAGS.canonicalWrite) {
    return;
  }
  await withSerializedInfraGuard(async () => {
    const [existing] = await tx
      .select({ id: shipmentItemSerials.id })
      .from(shipmentItemSerials)
      .where(
        and(
          eq(shipmentItemSerials.shipmentItemId, params.shipmentItemId),
          eq(shipmentItemSerials.serializedItemId, params.serializedItemId)
        )
      )
      .limit(1);

    if (!existing) {
      await tx.insert(shipmentItemSerials).values({
        organizationId: params.organizationId,
        shipmentItemId: params.shipmentItemId,
        serializedItemId: params.serializedItemId,
      });
    }

    await tx
      .update(serializedItems)
      .set({
        status: "shipped",
        currentInventoryId: null,
        updatedBy: params.userId,
        updatedAt: new Date(),
      })
      .where(eq(serializedItems.id, params.serializedItemId));
  });
}

export async function findSerializedItemBySerial(
  tx: DbTransaction,
  organizationId: string,
  serialNumber: string,
  options?: {
    userId?: string;
    productId?: string | null;
    inventoryId?: string | null;
    sourceReceiptItemId?: string | null;
    status?: SerializedItemStatus;
    allowAutoUpsert?: boolean;
    source?: string;
  }
): Promise<{ id: string } | null> {
  const normalized = normalizeSerial(serialNumber);
  const canonicalResult = await withSerializedInfraGuard(async () => {
    const [row] = await tx
      .select({ id: serializedItems.id })
      .from(serializedItems)
      .where(
        and(
          eq(serializedItems.organizationId, organizationId),
          eq(serializedItems.serialNumberNormalized, normalized)
        )
      )
      .limit(1);
    return row ?? null;
  });

  if (canonicalResult) {
    emitSerializedFallbackTelemetry('canonical_hit', {
      organizationId,
      serialNumber: normalized,
      source: options?.source,
      productId: options?.productId,
      inventoryId: options?.inventoryId,
    });
    return canonicalResult;
  }

  emitSerializedFallbackTelemetry('canonical_miss', {
    organizationId,
    serialNumber: normalized,
    source: options?.source,
    productId: options?.productId,
    inventoryId: options?.inventoryId,
  });

  if (!SERIAL_LINEAGE_FLAGS.readCanonicalFirst || !SERIAL_LINEAGE_FLAGS.legacyFallbackRead) {
    return null;
  }

  const fallbackRows = await withSerializedInfraGuard(async () =>
    tx
      .select({
        inventoryId: inventory.id,
        productId: inventory.productId,
        status: inventory.status,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.organizationId, organizationId),
          sql`UPPER(TRIM(${inventory.serialNumber})) = ${normalized}`
        )
      )
      .orderBy(inventory.createdAt)
      .limit(2)
  );

  const fallbackCandidates = fallbackRows ?? [];
  if (fallbackCandidates.length === 0) {
    emitSerializedFallbackTelemetry('legacy_fallback_miss', {
      organizationId,
      serialNumber: normalized,
      source: options?.source,
      productId: options?.productId,
      inventoryId: options?.inventoryId,
    });
    return null;
  }

  let selected = fallbackCandidates[0];
  if (options?.productId) {
    const exactMatch = fallbackCandidates.find((row: { productId?: string }) => row.productId === options.productId);
    if (exactMatch) {
      selected = exactMatch;
    } else {
      throw new ValidationError(
        `Serial "${normalized}" does not belong to the expected product for this action.`,
        { code: ['allocation_conflict'] }
      );
    }
  }

  if (fallbackCandidates.length > 1 && !options?.productId) {
    throw new ValidationError(
      `Serial "${normalized}" is ambiguous across multiple inventory rows.`,
      { code: ['allocation_conflict'] }
    );
  }

  emitSerializedFallbackTelemetry('legacy_fallback_hit', {
    organizationId,
    serialNumber: normalized,
    source: options?.source,
    productId: selected.productId,
    inventoryId: selected.inventoryId,
  });

  const allowAutoUpsert = options?.allowAutoUpsert ?? SERIAL_LINEAGE_FLAGS.autoUpsertOnMiss;
  if (!allowAutoUpsert || !SERIAL_LINEAGE_FLAGS.canonicalWrite) {
    return null;
  }

  const userId = options?.userId;
  if (!userId) {
    return null;
  }

  const mappedStatus: SerializedItemStatus =
    options?.status ??
    (selected.status === 'allocated'
      ? 'allocated'
      : selected.status === 'quarantined'
        ? 'quarantined'
        : 'available');
  const serializedItemId = await upsertSerializedItemForInventory(tx, {
    organizationId,
    productId: options?.productId ?? selected.productId,
    serialNumber: normalized,
    inventoryId: options?.inventoryId ?? selected.inventoryId,
    status: mappedStatus,
    sourceReceiptItemId: options?.sourceReceiptItemId ?? undefined,
    userId,
  });

  if (!serializedItemId) {
    return null;
  }

  await addSerializedItemEvent(tx, {
    organizationId,
    serializedItemId,
    eventType: 'status_changed',
    entityType: options?.source ?? 'legacy_serial_fallback',
    entityId: options?.inventoryId ?? selected.inventoryId,
    notes: `legacy_backfill_autocreate serial=${normalized}`,
    userId,
  });

  emitSerializedFallbackTelemetry('auto_upsert_on_miss', {
    organizationId,
    serialNumber: normalized,
    source: options?.source,
    productId: options?.productId ?? selected.productId,
    inventoryId: options?.inventoryId ?? selected.inventoryId,
    reason: 'canonical_miss_legacy_hit',
  });

  return { id: serializedItemId };
}
