import { and, desc, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { db, type TransactionExecutor } from '@/lib/db';
import { normalizeSerial } from '@/lib/serials';
import { IssueAnchorConflictError } from '@/lib/server/errors';
import {
  customers,
  issues,
  orderLineItems,
  orderLineSerialAllocations,
  orderShipments,
  products,
  orders,
  returnAuthorizations,
  shipmentItemSerials,
  shipmentItems,
  serializedItems,
  warrantyEntitlements,
  warranties,
} from 'drizzle/schema';
import {
  getServiceContextForWarranty,
  getServiceSystemContextById,
} from '@/server/functions/service/_shared/service-resolver';

export const ISSUE_ANCHOR_FIELDS = [
  'warrantyId',
  'warrantyEntitlementId',
  'orderId',
  'shipmentId',
  'productId',
  'serializedItemId',
  'serviceSystemId',
  'serialNumber',
] as const;

export type IssueAnchorField = (typeof ISSUE_ANCHOR_FIELDS)[number];

export type IssueIntakeAnchor = 'serial' | 'warranty' | 'order' | 'customer';

export interface IssueAnchorValues {
  warrantyId: string | null;
  warrantyEntitlementId: string | null;
  orderId: string | null;
  shipmentId: string | null;
  productId: string | null;
  serializedItemId: string | null;
  serviceSystemId: string | null;
  serialNumber: string | null;
}

export interface IssueAnchorInput extends Partial<IssueAnchorValues> {
  customerId?: string | null;
  metadata?: unknown;
}

interface BuildIssueAnchorStateArgs {
  input: IssueAnchorInput;
  existing?: IssueAnchorValues & {
    metadata?: unknown;
  };
}

export type ExplicitFieldMap = Partial<Record<IssueAnchorField, boolean>> & {
  customerId?: boolean;
};

export type IssueAnchorResolutionState = 'resolved' | 'partial' | 'unresolved' | 'conflict';

export interface IssueAnchorConflict {
  field: string;
  expected?: string | null;
  actual?: string | null;
  reason: string;
}

interface ResolvedOrderSummary {
  id: string;
  orderNumber: string | null;
  customerId: string | null;
  customerName: string | null;
}

interface ResolvedShipmentSummary {
  id: string;
  shipmentNumber: string | null;
}

interface ResolvedCommercialCustomerSummary {
  id: string;
  name: string | null;
}

interface ResolvedWarrantySummary {
  id: string;
  warrantyNumber: string;
  status: string;
  productSerial: string | null;
}

export interface IssueRelatedContext {
  linkedWarranty: ResolvedWarrantySummary | null;
  linkedOrder: ResolvedOrderSummary | null;
  linkedShipment: ResolvedShipmentSummary | null;
  relatedSerials: Array<{
    serializedItemId: string | null;
    serialNumber: string;
    productName: string | null;
    orderLineItemId: string | null;
    orderLineDescription: string | null;
    shipmentId: string | null;
    shipmentNumber: string | null;
    source: 'shipment' | 'allocation' | 'order_line';
  }>;
  linkedRmas: Array<{
    id: string;
    rmaNumber: string;
    status: string;
    reason: string;
    createdAt: Date | string;
  }>;
  sameServiceSystemIssues: Array<{
    id: string;
    issueNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date | string;
  }>;
  sameSerializedItemIssues: Array<{
    id: string;
    issueNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date | string;
  }>;
  customerContext: {
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      orderDate: string | null;
      status: string;
    }>;
    warranties: Array<{
      id: string;
      productName: string | null;
      productSerial: string | null;
      status: string;
    }>;
    otherIssues: Array<{
      id: string;
      title: string;
      createdAt: Date | string;
      status: string;
    }>;
  } | null;
}

export interface ResolvedIssueSupportContext {
  resolutionSource:
    | 'warranty'
    | 'entitlement'
    | 'order'
    | 'shipment'
    | 'serial'
    | 'unresolved';
  commercialCustomer: ResolvedCommercialCustomerSummary | null;
  warranty: ResolvedWarrantySummary | null;
  shipment: ResolvedShipmentSummary | null;
  serializedItem: {
    id: string;
    serialNumber: string;
  } | null;
  serviceSystem: {
    id: string;
    displayName: string;
  } | null;
  currentOwner: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  } | null;
  order: ResolvedOrderSummary | null;
}

export interface IssueAnchorResolutionOutcome {
  resolutionSource: ResolvedIssueSupportContext['resolutionSource'];
  anchors: IssueAnchorValues;
  commercialCustomerId: string | null;
  supportContext: ResolvedIssueSupportContext;
}

export interface IssueAnchorPreview extends IssueAnchorResolutionOutcome {
  state: IssueAnchorResolutionState;
  summary: string;
  conflicts: IssueAnchorConflict[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeIssueAnchorValue(
  field: IssueAnchorField,
  value: unknown
): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return field === 'serialNumber' ? text : text;
}

function getMetadataValue(
  metadata: Record<string, unknown> | null | undefined,
  field: IssueAnchorField
): unknown {
  return metadata && field in metadata ? metadata[field] : undefined;
}

export function extractIssueAnchorValues(source: {
  warrantyId?: string | null;
  warrantyEntitlementId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  productId?: string | null;
  serializedItemId?: string | null;
  serviceSystemId?: string | null;
  serialNumber?: string | null;
  metadata?: unknown;
}): IssueAnchorValues {
  const metadata = isRecord(source.metadata) ? source.metadata : null;

  return {
    warrantyId: normalizeIssueAnchorValue(
      'warrantyId',
      source.warrantyId ?? getMetadataValue(metadata, 'warrantyId')
    ),
    warrantyEntitlementId: normalizeIssueAnchorValue(
      'warrantyEntitlementId',
      source.warrantyEntitlementId ?? getMetadataValue(metadata, 'warrantyEntitlementId')
    ),
    orderId: normalizeIssueAnchorValue(
      'orderId',
      source.orderId ?? getMetadataValue(metadata, 'orderId')
    ),
    shipmentId: normalizeIssueAnchorValue(
      'shipmentId',
      source.shipmentId ?? getMetadataValue(metadata, 'shipmentId')
    ),
    productId: normalizeIssueAnchorValue(
      'productId',
      source.productId ?? getMetadataValue(metadata, 'productId')
    ),
    serializedItemId: normalizeIssueAnchorValue(
      'serializedItemId',
      source.serializedItemId ?? getMetadataValue(metadata, 'serializedItemId')
    ),
    serviceSystemId: normalizeIssueAnchorValue(
      'serviceSystemId',
      source.serviceSystemId ?? getMetadataValue(metadata, 'serviceSystemId')
    ),
    serialNumber: normalizeIssueAnchorValue(
      'serialNumber',
      source.serialNumber ?? getMetadataValue(metadata, 'serialNumber')
    ),
  };
}

export function syncIssueAnchorMetadata(
  metadata: Record<string, unknown> | null | undefined,
  anchors: IssueAnchorValues
): Record<string, unknown> | null {
  const nextMetadata = metadata ? { ...metadata } : {};
  for (const field of ISSUE_ANCHOR_FIELDS) {
    const value = anchors[field];
    if (value) {
      nextMetadata[field] = value;
    } else {
      delete nextMetadata[field];
    }
  }
  return Object.keys(nextMetadata).length > 0 ? nextMetadata : null;
}

export function buildIssueAnchorState({
  input,
  existing,
}: BuildIssueAnchorStateArgs): {
  anchors: IssueAnchorValues;
  explicitFields: ExplicitFieldMap;
  metadata: Record<string, unknown> | null;
} {
  const inputMetadata = isRecord(input.metadata) ? { ...input.metadata } : null;
  const existingMetadata = isRecord(existing?.metadata) ? { ...existing.metadata } : null;
  const metadataBase =
    input.metadata === undefined
      ? existingMetadata ?? {}
      : input.metadata === null
        ? {}
        : inputMetadata ?? {};

  const explicitFields: ExplicitFieldMap = {
    customerId: Object.prototype.hasOwnProperty.call(input, 'customerId'),
  };

  const anchors = ISSUE_ANCHOR_FIELDS.reduce<IssueAnchorValues>(
    (acc, field) => {
      const hasTopLevel = Object.prototype.hasOwnProperty.call(input, field);
      const metadataValue = getMetadataValue(inputMetadata, field);
      const hasMetadataField = metadataValue !== undefined;

      if (hasTopLevel || hasMetadataField) {
        explicitFields[field] = true;
      }

      const nextValue = hasTopLevel
        ? normalizeIssueAnchorValue(field, input[field])
        : hasMetadataField
          ? normalizeIssueAnchorValue(field, metadataValue)
          : existing?.[field] ?? null;

      acc[field] = nextValue;
      return acc;
    },
    {
      warrantyId: null,
      warrantyEntitlementId: null,
      orderId: null,
      shipmentId: null,
      productId: null,
      serializedItemId: null,
      serviceSystemId: null,
      serialNumber: null,
    }
  );

  return {
    anchors,
    explicitFields,
    metadata: syncIssueAnchorMetadata(metadataBase, anchors),
  };
}

async function loadOrderSummary(
  organizationId: string,
  orderId: string,
  executor: TransactionExecutor = db
): Promise<ResolvedOrderSummary | null> {
  const [order] = await executor
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      customerName: customers.name,
    })
    .from(orders)
    .leftJoin(
      customers,
      and(
        eq(orders.customerId, customers.id),
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
      )
    )
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)))
    .limit(1);

  return order ?? null;
}

async function loadCommercialCustomerSummary(
  organizationId: string,
  customerId: string,
  executor: TransactionExecutor = db
): Promise<ResolvedCommercialCustomerSummary | null> {
  const [customer] = await executor
    .select({
      id: customers.id,
      name: customers.name,
    })
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
      )
    )
    .limit(1);

  return customer ?? null;
}

async function loadShipmentSummary(
  organizationId: string,
  shipmentId: string,
  executor: TransactionExecutor = db
): Promise<ResolvedShipmentSummary | null> {
  const [shipment] = await executor
    .select({
      id: orderShipments.id,
      shipmentNumber: orderShipments.shipmentNumber,
    })
    .from(orderShipments)
    .where(
      and(
        eq(orderShipments.id, shipmentId),
        eq(orderShipments.organizationId, organizationId)
      )
    )
    .limit(1);

  return shipment ?? null;
}

async function loadRelatedSerialsForOrder(
  organizationId: string,
  orderId: string,
  executor: TransactionExecutor = db
): Promise<IssueRelatedContext['relatedSerials']> {
  const [shipmentSerialRows, allocationSerialRows, orderLineRows] = await Promise.all([
    executor
      .select({
        serializedItemId: serializedItems.id,
        serialNumber: serializedItems.serialNumberRaw,
        productName: products.name,
        orderLineItemId: orderLineItems.id,
        orderLineDescription: orderLineItems.description,
        shipmentId: orderShipments.id,
        shipmentNumber: orderShipments.shipmentNumber,
      })
      .from(shipmentItemSerials)
      .innerJoin(
        serializedItems,
        eq(shipmentItemSerials.serializedItemId, serializedItems.id)
      )
      .innerJoin(shipmentItems, eq(shipmentItemSerials.shipmentItemId, shipmentItems.id))
      .innerJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
      .innerJoin(orderLineItems, eq(shipmentItems.orderLineItemId, orderLineItems.id))
      .leftJoin(products, eq(serializedItems.productId, products.id))
      .where(
        and(
          eq(shipmentItemSerials.organizationId, organizationId),
          eq(orderShipments.organizationId, organizationId),
          eq(orderShipments.orderId, orderId)
        )
      )
      .orderBy(desc(shipmentItemSerials.shippedAt))
      .limit(100),
    executor
      .select({
        serializedItemId: serializedItems.id,
        serialNumber: serializedItems.serialNumberRaw,
        productName: products.name,
        orderLineItemId: orderLineItems.id,
        orderLineDescription: orderLineItems.description,
      })
      .from(orderLineSerialAllocations)
      .innerJoin(
        serializedItems,
        eq(orderLineSerialAllocations.serializedItemId, serializedItems.id)
      )
      .innerJoin(
        orderLineItems,
        eq(orderLineSerialAllocations.orderLineItemId, orderLineItems.id)
      )
      .leftJoin(products, eq(serializedItems.productId, products.id))
      .where(
        and(
          eq(orderLineSerialAllocations.organizationId, organizationId),
          eq(orderLineSerialAllocations.isActive, true),
          eq(orderLineItems.organizationId, organizationId),
          eq(orderLineItems.orderId, orderId)
        )
      )
      .orderBy(desc(orderLineSerialAllocations.allocatedAt))
      .limit(100),
    executor
      .select({
        orderLineItemId: orderLineItems.id,
        orderLineDescription: orderLineItems.description,
        productName: products.name,
        allocatedSerialNumbers: orderLineItems.allocatedSerialNumbers,
      })
      .from(orderLineItems)
      .leftJoin(products, eq(orderLineItems.productId, products.id))
      .where(
        and(
          eq(orderLineItems.organizationId, organizationId),
          eq(orderLineItems.orderId, orderId)
        )
      )
      .limit(100),
  ]);

  const bySerial = new Map<string, IssueRelatedContext['relatedSerials'][number]>();
  const addSerial = (serial: IssueRelatedContext['relatedSerials'][number]) => {
    const key = normalizeSerial(serial.serialNumber);
    if (!key || bySerial.has(key)) return;
    bySerial.set(key, serial);
  };

  for (const row of shipmentSerialRows) {
    addSerial({
      serializedItemId: row.serializedItemId,
      serialNumber: row.serialNumber,
      productName: row.productName,
      orderLineItemId: row.orderLineItemId,
      orderLineDescription: row.orderLineDescription,
      shipmentId: row.shipmentId,
      shipmentNumber: row.shipmentNumber,
      source: 'shipment',
    });
  }

  for (const row of allocationSerialRows) {
    addSerial({
      serializedItemId: row.serializedItemId,
      serialNumber: row.serialNumber,
      productName: row.productName,
      orderLineItemId: row.orderLineItemId,
      orderLineDescription: row.orderLineDescription,
      shipmentId: null,
      shipmentNumber: null,
      source: 'allocation',
    });
  }

  for (const row of orderLineRows) {
    const serials = (row.allocatedSerialNumbers as string[] | null) ?? [];
    for (const serialNumber of serials) {
      const trimmed = serialNumber.trim();
      if (!trimmed) continue;
      addSerial({
        serializedItemId: null,
        serialNumber: trimmed,
        productName: row.productName,
        orderLineItemId: row.orderLineItemId,
        orderLineDescription: row.orderLineDescription,
        shipmentId: null,
        shipmentNumber: null,
        source: 'order_line',
      });
    }
  }

  return Array.from(bySerial.values());
}

async function loadSerializedItemResolution(
  organizationId: string,
  anchors: IssueAnchorValues,
  executor: TransactionExecutor = db
): Promise<{
  serializedItem: { id: string; serialNumber: string } | null;
  orderId: string | null;
  shipmentId: string | null;
}> {
  if (anchors.serializedItemId) {
    const [serializedItem] = await executor
      .select({
        id: serializedItems.id,
        serialNumber: serializedItems.serialNumberRaw,
        shipmentOrderId: orderShipments.orderId,
        shipmentId: shipmentItems.shipmentId,
        allocationOrderId: orderLineItems.orderId,
      })
      .from(serializedItems)
      .leftJoin(
        shipmentItemSerials,
        eq(serializedItems.id, shipmentItemSerials.serializedItemId)
      )
      .leftJoin(shipmentItems, eq(shipmentItemSerials.shipmentItemId, shipmentItems.id))
      .leftJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
      .leftJoin(
        orderLineSerialAllocations,
        and(
          eq(serializedItems.id, orderLineSerialAllocations.serializedItemId),
          eq(orderLineSerialAllocations.isActive, true)
        )
      )
      .leftJoin(
        orderLineItems,
        eq(orderLineSerialAllocations.orderLineItemId, orderLineItems.id)
      )
      .where(
        and(
          eq(serializedItems.id, anchors.serializedItemId),
          eq(serializedItems.organizationId, organizationId)
        )
      )
      .orderBy(desc(shipmentItemSerials.shippedAt), desc(orderLineSerialAllocations.allocatedAt))
      .limit(1);

    if (serializedItem) {
      return {
        serializedItem: {
          id: serializedItem.id,
          serialNumber: serializedItem.serialNumber,
        },
        orderId: serializedItem.shipmentOrderId ?? serializedItem.allocationOrderId ?? null,
        shipmentId: serializedItem.shipmentId ?? null,
      };
    }
  }

  if (!anchors.serialNumber) {
    return {
      serializedItem: null,
      orderId: null,
      shipmentId: null,
    };
  }

  const normalizedSerial = normalizeSerial(anchors.serialNumber);
  const [serializedItem] = await executor
    .select({
      id: serializedItems.id,
      serialNumber: serializedItems.serialNumberRaw,
      shipmentOrderId: orderShipments.orderId,
      shipmentId: shipmentItems.shipmentId,
      allocationOrderId: orderLineItems.orderId,
    })
    .from(serializedItems)
    .leftJoin(
      shipmentItemSerials,
      eq(serializedItems.id, shipmentItemSerials.serializedItemId)
    )
    .leftJoin(shipmentItems, eq(shipmentItemSerials.shipmentItemId, shipmentItems.id))
    .leftJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
    .leftJoin(
      orderLineSerialAllocations,
      and(
        eq(serializedItems.id, orderLineSerialAllocations.serializedItemId),
        eq(orderLineSerialAllocations.isActive, true)
      )
    )
    .leftJoin(
      orderLineItems,
      eq(orderLineSerialAllocations.orderLineItemId, orderLineItems.id)
    )
    .where(
      and(
        eq(serializedItems.organizationId, organizationId),
        eq(serializedItems.serialNumberNormalized, normalizedSerial)
      )
    )
    .orderBy(desc(shipmentItemSerials.shippedAt), desc(orderLineSerialAllocations.allocatedAt))
    .limit(1);

  if (!serializedItem) {
    return {
      serializedItem: null,
      orderId: null,
      shipmentId: null,
    };
  }

  return {
    serializedItem: {
      id: serializedItem.id,
      serialNumber: serializedItem.serialNumber,
    },
    orderId: serializedItem.shipmentOrderId ?? serializedItem.allocationOrderId ?? null,
    shipmentId: serializedItem.shipmentId ?? null,
  };
}

async function loadEntitlementResolution(
  organizationId: string,
  entitlementId: string,
  executor: TransactionExecutor = db
): Promise<{
  id: string;
  orderId: string;
  shipmentId: string;
  commercialCustomerId: string;
  serializedItemId: string | null;
} | null> {
  const [entitlement] = await executor
    .select({
      id: warrantyEntitlements.id,
      orderId: warrantyEntitlements.orderId,
      shipmentId: warrantyEntitlements.shipmentId,
      commercialCustomerId: warrantyEntitlements.commercialCustomerId,
      serializedItemId: warrantyEntitlements.serializedItemId,
    })
    .from(warrantyEntitlements)
    .where(
      and(
        eq(warrantyEntitlements.id, entitlementId),
        eq(warrantyEntitlements.organizationId, organizationId)
      )
    )
    .limit(1);

  return entitlement ?? null;
}

async function loadEntitlementForSerializedItem(
  organizationId: string,
  serializedItemId: string,
  executor: TransactionExecutor = db
): Promise<{
  id: string;
  orderId: string;
  shipmentId: string;
  commercialCustomerId: string;
  serializedItemId: string | null;
} | null> {
  const [entitlement] = await executor
    .select({
      id: warrantyEntitlements.id,
      orderId: warrantyEntitlements.orderId,
      shipmentId: warrantyEntitlements.shipmentId,
      commercialCustomerId: warrantyEntitlements.commercialCustomerId,
      serializedItemId: warrantyEntitlements.serializedItemId,
    })
    .from(warrantyEntitlements)
    .where(
      and(
        eq(warrantyEntitlements.organizationId, organizationId),
        eq(warrantyEntitlements.serializedItemId, serializedItemId)
      )
    )
    .orderBy(desc(warrantyEntitlements.createdAt))
    .limit(1);

  return entitlement ?? null;
}

async function loadWarrantySummary(
  organizationId: string,
  warrantyId: string,
  executor: TransactionExecutor = db
): Promise<ResolvedWarrantySummary | null> {
  const [warranty] = await executor
    .select({
      id: warranties.id,
      warrantyNumber: warranties.warrantyNumber,
      status: warranties.status,
      productSerial: warranties.productSerial,
    })
    .from(warranties)
    .where(
      and(
        eq(warranties.id, warrantyId),
        eq(warranties.organizationId, organizationId),
        isNull(warranties.deletedAt)
      )
    )
    .limit(1);

  return warranty ?? null;
}

async function loadWarrantyResolution(
  organizationId: string,
  anchors: IssueAnchorValues,
  serializedResolution: { serializedItem: { id: string; serialNumber: string } | null },
  executor: TransactionExecutor = db
): Promise<{
  warranty: ResolvedWarrantySummary | null;
  warrantyEntitlementId: string | null;
  orderId: string | null;
  shipmentId: string | null;
  commercialCustomerId: string | null;
}> {
  if (anchors.warrantyId) {
    const [warranty] = await executor
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        status: warranties.status,
        productSerial: warranties.productSerial,
        sourceEntitlementId: warranties.sourceEntitlementId,
        orderId: warranties.orderId,
      })
      .from(warranties)
      .where(
        and(
          eq(warranties.id, anchors.warrantyId),
          eq(warranties.organizationId, organizationId),
          isNull(warranties.deletedAt)
        )
      )
      .limit(1);

    if (!warranty) {
      return {
        warranty: null,
        warrantyEntitlementId: anchors.warrantyEntitlementId,
        orderId: anchors.orderId,
        shipmentId: anchors.shipmentId,
        commercialCustomerId: null,
      };
    }

    let entitlement = warranty.sourceEntitlementId
      ? await loadEntitlementResolution(organizationId, warranty.sourceEntitlementId, executor)
      : null;

    return {
      warranty: {
        id: warranty.id,
        warrantyNumber: warranty.warrantyNumber,
        status: warranty.status,
        productSerial: warranty.productSerial,
      },
      warrantyEntitlementId: warranty.sourceEntitlementId ?? anchors.warrantyEntitlementId,
      orderId: entitlement?.orderId ?? warranty.orderId ?? null,
      shipmentId: entitlement?.shipmentId ?? null,
      commercialCustomerId: entitlement?.commercialCustomerId ?? null,
    };
  }

  const entitlementId = anchors.warrantyEntitlementId
    ? anchors.warrantyEntitlementId
    : serializedResolution.serializedItem?.id
      ? (await loadEntitlementForSerializedItem(
          organizationId,
          serializedResolution.serializedItem.id,
          executor
        ))?.id ?? null
      : null;

  let entitlement = entitlementId
    ? await loadEntitlementResolution(organizationId, entitlementId, executor)
    : null;

  if (entitlementId) {
    const [warranty] = await executor
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        status: warranties.status,
        productSerial: warranties.productSerial,
      })
      .from(warranties)
      .where(
        and(
          eq(warranties.organizationId, organizationId),
          eq(warranties.sourceEntitlementId, entitlementId),
          isNull(warranties.deletedAt)
        )
      )
      .orderBy(desc(warranties.createdAt))
      .limit(1);

    return {
      warranty: warranty ?? null,
      warrantyEntitlementId: entitlementId,
      orderId: entitlement?.orderId ?? null,
      shipmentId: entitlement?.shipmentId ?? null,
      commercialCustomerId: entitlement?.commercialCustomerId ?? null,
    };
  }

  if (anchors.serialNumber) {
    const normalizedSerial = normalizeSerial(anchors.serialNumber);
    const [warranty] = await executor
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        status: warranties.status,
        productSerial: warranties.productSerial,
        sourceEntitlementId: warranties.sourceEntitlementId,
        orderId: warranties.orderId,
      })
      .from(warranties)
      .where(
        and(
          eq(warranties.organizationId, organizationId),
          eq(warranties.productSerial, normalizedSerial),
          isNull(warranties.deletedAt)
        )
      )
      .orderBy(desc(warranties.createdAt))
      .limit(1);

    if (warranty) {
      entitlement = warranty.sourceEntitlementId
        ? await loadEntitlementResolution(organizationId, warranty.sourceEntitlementId, executor)
        : null;
      return {
        warranty: {
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          status: warranty.status,
          productSerial: warranty.productSerial,
        },
        warrantyEntitlementId: warranty.sourceEntitlementId ?? null,
        orderId: entitlement?.orderId ?? warranty.orderId ?? null,
        shipmentId: entitlement?.shipmentId ?? null,
        commercialCustomerId: entitlement?.commercialCustomerId ?? null,
      };
    }
  }

  return {
    warranty: null,
    warrantyEntitlementId: anchors.warrantyEntitlementId,
    orderId: null,
    shipmentId: null,
    commercialCustomerId: null,
  };
}

function pushConflict(
  conflicts: IssueAnchorConflict[],
  conflict: IssueAnchorConflict | null
) {
  if (conflict) {
    conflicts.push(conflict);
  }
}

function compareExplicitAnchor(
  field: string,
  actual: string | null | undefined,
  expected: string | null | undefined,
  reason: string
): IssueAnchorConflict | null {
  if (!actual || !expected || actual === expected) {
    return null;
  }

  return {
    field,
    actual,
    expected,
    reason,
  };
}

export function validateIssueAnchors(params: {
  anchors: IssueAnchorValues;
  explicitFields: ExplicitFieldMap;
  customerId?: string | null;
  resolution: IssueAnchorResolutionOutcome;
}): IssueAnchorConflict[] {
  const { anchors, explicitFields, customerId, resolution } = params;
  const conflicts: IssueAnchorConflict[] = [];

  if (explicitFields.serialNumber && explicitFields.serializedItemId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'serialNumber',
        anchors.serialNumber,
        resolution.supportContext.serializedItem?.serialNumber ?? null,
        'Serial number does not match the selected serialized item.'
      )
    );
  }

  if (explicitFields.serializedItemId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'serializedItemId',
        anchors.serializedItemId,
        resolution.anchors.serializedItemId,
        'Serialized item does not match the resolved asset lineage.'
      )
    );
  }

  if (explicitFields.shipmentId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'shipmentId',
        anchors.shipmentId,
        resolution.anchors.shipmentId,
        'Shipment does not match the resolved asset or warranty lineage.'
      )
    );
  }

  if (explicitFields.orderId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'orderId',
        anchors.orderId,
        resolution.anchors.orderId,
        'Order does not match the resolved asset or warranty lineage.'
      )
    );
  }

  if (explicitFields.warrantyId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'warrantyId',
        anchors.warrantyId,
        resolution.anchors.warrantyId,
        'Warranty does not match the other selected anchors.'
      )
    );
  }

  if (explicitFields.warrantyEntitlementId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'warrantyEntitlementId',
        anchors.warrantyEntitlementId,
        resolution.anchors.warrantyEntitlementId,
        'Warranty entitlement does not match the resolved warranty lineage.'
      )
    );
  }

  if (explicitFields.serviceSystemId && anchors.warrantyId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'serviceSystemId',
        anchors.serviceSystemId,
        resolution.anchors.serviceSystemId,
        'Service system does not match the warranty-linked installed system.'
      )
    );
  }

  if (explicitFields.customerId) {
    pushConflict(
      conflicts,
      compareExplicitAnchor(
        'customerId',
        customerId,
        resolution.commercialCustomerId,
        'Customer does not match the resolved commercial lineage.'
      )
    );
  }

  return conflicts;
}

export function assertIssueAnchors(params: {
  anchors: IssueAnchorValues;
  explicitFields: ExplicitFieldMap;
  customerId?: string | null;
  resolution: IssueAnchorResolutionOutcome;
}) {
  const conflicts = validateIssueAnchors(params);
  if (conflicts.length === 0) return;

  throw new IssueAnchorConflictError(
    'These selections point to different records. Clear one of the conflicting anchors before continuing.',
    conflicts
  );
}

export function getIssueIntakePreviewState(params: {
  resolution: IssueAnchorResolutionOutcome;
  conflicts: IssueAnchorConflict[];
}): { state: IssueAnchorPreview['state']; summary: string } {
  const { resolution, conflicts } = params;

  if (conflicts.length > 0) {
    return {
      state: 'conflict',
      summary:
        'These selections point to different records. Clear one of the conflicting anchors before creating the issue.',
    };
  }

  const hasCommercial = !!resolution.supportContext.commercialCustomer?.id;
  const hasCoverage = !!resolution.supportContext.warranty?.id;
  const hasPhysical = !!resolution.supportContext.serializedItem?.id;
  const hasInstalled = !!resolution.supportContext.serviceSystem?.id;

  if (!hasCommercial && !hasCoverage && !hasPhysical && !hasInstalled) {
    return {
      state: 'unresolved',
      summary:
        'We couldn’t match this serial to a tracked asset yet. You can still create the issue, but downstream lineage will stay partial.',
    };
  }

  if (hasCommercial && hasCoverage && hasPhysical && hasInstalled) {
    return {
      state: 'resolved',
      summary: 'Resolved support context from the selected anchors.',
    };
  }

  return {
    state: 'partial',
    summary:
      !resolution.supportContext.order?.id
        ? 'No source order could be confirmed from the current context.'
        : !resolution.supportContext.serviceSystem?.id
          ? 'No installed system is linked yet for this support context.'
          : 'Resolved part of the support context. Remaining lineage will stay partial.',
  };
}

export async function resolveIssueAnchors(
  organizationId: string,
  anchors: IssueAnchorValues,
  executor: TransactionExecutor = db
): Promise<IssueAnchorResolutionOutcome> {
  let resolutionSource: ResolvedIssueSupportContext['resolutionSource'] = 'unresolved';
  const serializedResolution = await loadSerializedItemResolution(
    organizationId,
    anchors,
    executor
  );
  const warrantyResolution = await loadWarrantyResolution(
    organizationId,
    anchors,
    serializedResolution,
    executor
  );

  let resolvedOrderId =
    anchors.orderId ??
    warrantyResolution.orderId ??
    serializedResolution.orderId ??
    null;
  let resolvedShipmentId =
    anchors.shipmentId ??
    warrantyResolution.shipmentId ??
    serializedResolution.shipmentId ??
    null;
  let resolvedCommercialCustomerId =
    warrantyResolution.commercialCustomerId ?? null;

  if (!resolvedOrderId && anchors.shipmentId) {
    const [shipment] = await executor
      .select({ orderId: orderShipments.orderId })
      .from(orderShipments)
      .where(
        and(
          eq(orderShipments.id, anchors.shipmentId),
          eq(orderShipments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (shipment) {
      resolvedOrderId = shipment.orderId;
      resolutionSource = 'shipment';
    }
  }

  if (!resolutionSource) {
    resolutionSource = 'unresolved';
  }
  if (anchors.warrantyId) {
    resolutionSource = 'warranty';
  } else if (anchors.warrantyEntitlementId) {
    resolutionSource = 'entitlement';
  } else if (serializedResolution.serializedItem?.id) {
    resolutionSource = 'serial';
  } else if (anchors.shipmentId) {
    resolutionSource = 'shipment';
  } else if (resolvedOrderId) {
    resolutionSource = 'order';
  }

  const order = resolvedOrderId
    ? await loadOrderSummary(organizationId, resolvedOrderId, executor)
    : null;
  const shipment = resolvedShipmentId
    ? await loadShipmentSummary(organizationId, resolvedShipmentId, executor)
    : null;

  if (order?.customerId) {
    resolvedCommercialCustomerId = resolvedCommercialCustomerId ?? order.customerId;
  }

  const commercialCustomer = resolvedCommercialCustomerId
    ? await loadCommercialCustomerSummary(
        organizationId,
        resolvedCommercialCustomerId,
        executor
      )
    : null;

  const effectiveWarrantyId = warrantyResolution.warranty?.id ?? anchors.warrantyId ?? null;
  const serviceContext = anchors.serviceSystemId
    ? await getServiceSystemContextById(organizationId, anchors.serviceSystemId, executor)
    : effectiveWarrantyId
      ? await getServiceContextForWarranty(organizationId, effectiveWarrantyId, executor)
      : {
          serviceSystem: null,
          currentOwner: null,
          ownershipHistorySummary: [],
        };

  const supportContext: ResolvedIssueSupportContext = {
    resolutionSource,
    commercialCustomer,
    warranty: warrantyResolution.warranty,
    shipment,
    serializedItem: serializedResolution.serializedItem,
    serviceSystem: serviceContext.serviceSystem
      ? {
          id: serviceContext.serviceSystem.id,
          displayName: serviceContext.serviceSystem.displayName,
        }
      : null,
    currentOwner: serviceContext.currentOwner
      ? {
          id: serviceContext.currentOwner.id,
          fullName: serviceContext.currentOwner.fullName,
          email: serviceContext.currentOwner.email,
          phone: serviceContext.currentOwner.phone,
        }
      : null,
    order,
  };

  return {
    resolutionSource,
    commercialCustomerId: commercialCustomer?.id ?? null,
    anchors: {
      warrantyId: effectiveWarrantyId,
      warrantyEntitlementId:
        warrantyResolution.warrantyEntitlementId ?? anchors.warrantyEntitlementId ?? null,
      orderId: order?.id ?? resolvedOrderId ?? null,
      shipmentId: shipment?.id ?? resolvedShipmentId ?? null,
      productId: anchors.productId,
      serializedItemId: serializedResolution.serializedItem?.id ?? anchors.serializedItemId ?? null,
      serviceSystemId: supportContext.serviceSystem?.id ?? anchors.serviceSystemId ?? null,
      serialNumber:
        anchors.serialNumber ??
        serializedResolution.serializedItem?.serialNumber ??
        warrantyResolution.warranty?.productSerial ??
        null,
    },
    supportContext,
  };
}

export async function previewIssueAnchors(params: {
  organizationId: string;
  anchors: IssueAnchorValues;
  explicitFields: ExplicitFieldMap;
  customerId?: string | null;
  executor?: TransactionExecutor;
}): Promise<IssueAnchorPreview> {
  const resolution = await resolveIssueAnchors(
    params.organizationId,
    params.anchors,
    params.executor ?? db
  );
  const conflicts = validateIssueAnchors({
    anchors: params.anchors,
    explicitFields: params.explicitFields,
    customerId: params.customerId ?? null,
    resolution,
  });
  const previewState = getIssueIntakePreviewState({ resolution, conflicts });

  return {
    ...resolution,
    state: previewState.state,
    summary: previewState.summary,
    conflicts,
  };
}

export async function resolveIssueSupportContext(
  organizationId: string,
  anchors: IssueAnchorValues,
  executor: TransactionExecutor = db
): Promise<ResolvedIssueSupportContext> {
  const resolution = await resolveIssueAnchors(organizationId, anchors, executor);
  return resolution.supportContext;
}

export async function getIssueRelatedContext(params: {
  organizationId: string;
  issueId: string;
  issue: {
    id: string;
    customerId?: string | null;
    warrantyId?: string | null;
    orderId?: string | null;
    shipmentId?: string | null;
    serializedItemId?: string | null;
    serviceSystemId?: string | null;
  };
  supportContext: ResolvedIssueSupportContext;
  executor?: TransactionExecutor;
}): Promise<IssueRelatedContext> {
  const executor = params.executor ?? db;

  const linkedWarranty = params.issue.warrantyId
    ? await loadWarrantySummary(params.organizationId, params.issue.warrantyId, executor)
    : params.supportContext.warranty;

  const linkedOrder = params.supportContext.order;
  const linkedShipment = params.supportContext.shipment;
  const relatedSerials = linkedOrder?.id
    ? await loadRelatedSerialsForOrder(params.organizationId, linkedOrder.id, executor)
    : [];

  const linkedRmas = await executor
    .select({
      id: returnAuthorizations.id,
      rmaNumber: returnAuthorizations.rmaNumber,
      status: returnAuthorizations.status,
      executionStatus: returnAuthorizations.executionStatus,
      reason: returnAuthorizations.reason,
      refundPaymentId: returnAuthorizations.refundPaymentId,
      creditNoteId: returnAuthorizations.creditNoteId,
      replacementOrderId: returnAuthorizations.replacementOrderId,
      createdAt: returnAuthorizations.createdAt,
    })
    .from(returnAuthorizations)
    .where(
      and(
        eq(returnAuthorizations.organizationId, params.organizationId),
        or(
          eq(returnAuthorizations.issueId, params.issueId),
          linkedOrder?.id ? eq(returnAuthorizations.orderId, linkedOrder.id) : undefined
        )!
      )
    )
    .orderBy(desc(returnAuthorizations.createdAt))
    .limit(5);

  const sameServiceSystemIssues = params.issue.serviceSystemId
    ? await executor
        .select({
          id: issues.id,
          issueNumber: issues.issueNumber,
          title: issues.title,
          status: issues.status,
          priority: issues.priority,
          createdAt: issues.createdAt,
        })
        .from(issues)
        .where(
          and(
            eq(issues.organizationId, params.organizationId),
            eq(issues.serviceSystemId, params.issue.serviceSystemId),
            ne(issues.id, params.issueId),
            isNull(issues.deletedAt)
          )
        )
        .orderBy(desc(issues.createdAt))
        .limit(10)
    : [];

  const sameSerializedItemIssues = params.issue.serializedItemId
    ? await executor
        .select({
          id: issues.id,
          issueNumber: issues.issueNumber,
          title: issues.title,
          status: issues.status,
          priority: issues.priority,
          createdAt: issues.createdAt,
        })
        .from(issues)
        .where(
          and(
            eq(issues.organizationId, params.organizationId),
            eq(issues.serializedItemId, params.issue.serializedItemId),
            ne(issues.id, params.issueId),
            isNull(issues.deletedAt)
          )
        )
        .orderBy(desc(issues.createdAt))
        .limit(10)
    : [];

  let customerContext: IssueRelatedContext['customerContext'] = null;
  if (params.issue.customerId) {
    const [recentOrders, recentWarranties, recentIssues] = await Promise.all([
      executor
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          orderDate: orders.orderDate,
          status: orders.status,
        })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, params.organizationId),
            eq(orders.customerId, params.issue.customerId)
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(5),
      executor
        .select({
          id: warranties.id,
          productName: sql<string | null>`null`,
          productSerial: warranties.productSerial,
          status: warranties.status,
        })
        .from(warranties)
        .where(
          and(
            eq(warranties.organizationId, params.organizationId),
            eq(warranties.customerId, params.issue.customerId),
            isNull(warranties.deletedAt)
          )
        )
        .orderBy(desc(warranties.createdAt))
        .limit(5),
      executor
        .select({
          id: issues.id,
          title: issues.title,
          createdAt: issues.createdAt,
          status: issues.status,
        })
        .from(issues)
        .where(
          and(
            eq(issues.organizationId, params.organizationId),
            eq(issues.customerId, params.issue.customerId),
            ne(issues.id, params.issueId),
            isNull(issues.deletedAt)
          )
        )
        .orderBy(desc(issues.createdAt))
        .limit(5),
    ]);

    customerContext = {
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber ?? `Order ${order.id.slice(0, 8)}`,
        orderDate: order.orderDate ? String(order.orderDate) : null,
        status: order.status,
      })),
      warranties: recentWarranties,
      otherIssues: recentIssues,
    };
  }

  return {
    linkedWarranty,
    linkedOrder,
    linkedShipment,
    relatedSerials,
    linkedRmas,
    sameServiceSystemIssues,
    sameSerializedItemIssues,
    customerContext,
  };
}
