import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { db, type TransactionExecutor } from '@/lib/db';
import { normalizeSerial } from '@/lib/serials';
import type {
  IssueDetail,
  IssueResolution,
  IssueRmaReadiness,
  IssueResolutionCategory,
} from '@/lib/schemas/support/issues';
import {
  orderLineItems,
  orderShipments,
  products,
  returnAuthorizations,
  rmaLineItems,
  shipmentItems,
} from 'drizzle/schema';

export const ACTIVE_RMA_STATUSES = ['requested', 'approved', 'received'] as const;
export const SHIPPED_RMA_ELIGIBLE_SHIPMENT_STATUSES = [
  'in_transit',
  'out_for_delivery',
  'delivered',
] as const;

type IssueSupportOrder = NonNullable<NonNullable<IssueDetail['supportContext']>['order']>;

interface IssueRemedyRow {
  id: string;
  status: string;
  orderId: string | null;
  serializedItemId: string | null;
  serialNumber: string | null;
  resolutionCategory: IssueResolutionCategory | null;
  resolutionNotes: string | null;
  diagnosisNotes: string | null;
  nextActionType: IssueResolution['nextActionType'] | null;
  resolvedAt: Date | string | null;
  resolvedByUserId: string | null;
}

function mapSuggestedReason(
  category: IssueResolutionCategory | null
): IssueRmaReadiness['suggestedReason'] {
  if (!category) return null;

  switch (category) {
    case 'hardware_fault':
      return 'defective';
    case 'shipping_damage':
      return 'damaged_in_shipping';
    case 'fulfillment_error':
      return 'wrong_item';
    case 'installation_issue':
      return 'installation_failure';
    case 'software_or_firmware':
      return 'performance_issue';
    default:
      return 'other';
  }
}

export function buildIssueResolution(issue: IssueRemedyRow): IssueResolution | null {
  if (!issue.resolutionCategory || !issue.resolutionNotes || !issue.nextActionType) {
    return null;
  }

  return {
    category: issue.resolutionCategory,
    summary: issue.resolutionNotes,
    diagnosisNotes: issue.diagnosisNotes ?? null,
    nextActionType: issue.nextActionType,
    resolvedAt: issue.resolvedAt ?? null,
    resolvedByUserId: issue.resolvedByUserId ?? null,
  };
}

export async function getIssueRmaReadiness(params: {
  organizationId: string;
  issue: IssueRemedyRow;
  sourceOrder: IssueSupportOrder | null;
  executor?: TransactionExecutor;
}): Promise<IssueRmaReadiness> {
  const executor = params.executor ?? db;
  const { issue, sourceOrder } = params;

  const existingRmasRaw = await executor
    .select({
      id: returnAuthorizations.id,
      issueId: returnAuthorizations.issueId,
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
        sourceOrder?.id
          ? inArray(returnAuthorizations.orderId, [sourceOrder.id])
          : eq(returnAuthorizations.issueId, issue.id)
      )
    )
    .orderBy(desc(returnAuthorizations.createdAt))
    .limit(10);

  const existingRmas = existingRmasRaw.map(({ issueId: _issueId, ...rma }) => rma);
  const hasIssueLinkedRma = existingRmasRaw.some((rma) => rma.issueId === issue.id);

  if (hasIssueLinkedRma) {
    return {
      state: 'linked',
      blockedReasonCode: 'issue_rma_exists',
      blockedReason: 'This issue already has one or more linked RMAs.',
      sourceOrder: sourceOrder ?? null,
      eligibleLineItems: [],
      existingRmas,
      suggestedReason: mapSuggestedReason(issue.resolutionCategory),
    };
  }

  if (issue.status !== 'resolved' && issue.status !== 'closed') {
    return {
      state: 'blocked',
      blockedReasonCode: 'issue_not_resolved',
      blockedReason: 'Resolve the issue before creating an RMA.',
      sourceOrder: sourceOrder ?? null,
      eligibleLineItems: [],
      existingRmas,
      suggestedReason: mapSuggestedReason(issue.resolutionCategory),
    };
  }

  const resolution = buildIssueResolution(issue);
  if (!resolution || resolution.nextActionType !== 'create_rma') {
    return {
      state: 'blocked',
      blockedReasonCode: 'next_action_not_rma',
      blockedReason: 'The recorded next action for this issue is not to create an RMA.',
      sourceOrder: sourceOrder ?? null,
      eligibleLineItems: [],
      existingRmas,
      suggestedReason: mapSuggestedReason(issue.resolutionCategory),
    };
  }

  if (!sourceOrder?.id) {
    return {
      state: 'blocked',
      blockedReasonCode: 'source_order_missing',
      blockedReason: 'Source order could not be resolved from the current issue context.',
      sourceOrder: null,
      eligibleLineItems: [],
      existingRmas,
      suggestedReason: mapSuggestedReason(issue.resolutionCategory),
    };
  }

  const [lineItems, shippedQuantities, activeClaimedQuantities] = await Promise.all([
    executor
      .select({
        id: orderLineItems.id,
        description: orderLineItems.description,
        isSerialized: products.isSerialized,
      })
      .from(orderLineItems)
      .leftJoin(products, eq(orderLineItems.productId, products.id))
      .where(
        and(
          eq(orderLineItems.organizationId, params.organizationId),
          eq(orderLineItems.orderId, sourceOrder.id)
        )
      ),
    executor
      .select({
        orderLineItemId: shipmentItems.orderLineItemId,
        shippedQuantity: sql<number>`COALESCE(SUM(${shipmentItems.quantity}), 0)`,
      })
      .from(shipmentItems)
      .innerJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
      .where(
        and(
          eq(orderShipments.organizationId, params.organizationId),
          eq(orderShipments.orderId, sourceOrder.id),
          inArray(orderShipments.status, [...SHIPPED_RMA_ELIGIBLE_SHIPMENT_STATUSES])
        )
      )
      .groupBy(shipmentItems.orderLineItemId),
    executor
      .select({
        orderLineItemId: rmaLineItems.orderLineItemId,
        activeQuantity: sql<number>`COALESCE(SUM(${rmaLineItems.quantityReturned}), 0)`,
      })
      .from(rmaLineItems)
      .innerJoin(returnAuthorizations, eq(rmaLineItems.rmaId, returnAuthorizations.id))
      .where(
        and(
          eq(returnAuthorizations.organizationId, params.organizationId),
          eq(returnAuthorizations.orderId, sourceOrder.id),
          inArray(returnAuthorizations.status, [...ACTIVE_RMA_STATUSES])
        )
      )
      .groupBy(rmaLineItems.orderLineItemId),
  ]);

  const shippedQuantityByLine = new Map(
    shippedQuantities.map((row) => [row.orderLineItemId, Number(row.shippedQuantity ?? 0)])
  );
  const activeClaimedByLine = new Map(
    activeClaimedQuantities.map((row) => [row.orderLineItemId, Number(row.activeQuantity ?? 0)])
  );

  const totalShippedQuantity = Array.from(shippedQuantityByLine.values()).reduce(
    (sum, value) => sum + value,
    0
  );

  if (totalShippedQuantity <= 0) {
    return {
      state: 'blocked',
      blockedReasonCode: 'no_shipped_items',
      blockedReason: 'This order has no shipped items available for return yet.',
      sourceOrder,
      eligibleLineItems: [],
      existingRmas,
      suggestedReason: mapSuggestedReason(issue.resolutionCategory),
    };
  }

  const eligibleLineItems = lineItems
    .map((line) => {
      const shippedQuantity = shippedQuantityByLine.get(line.id) ?? 0;
      const activeClaimedQuantity = activeClaimedByLine.get(line.id) ?? 0;
      const remainingReturnableQuantity = Math.max(
        shippedQuantity - activeClaimedQuantity,
        0
      );

      return {
        orderLineItemId: line.id,
        description: line.description,
        shippedQuantity,
        activeClaimedQuantity,
        remainingReturnableQuantity,
        isSerialized: Boolean(line.isSerialized),
      };
    })
    .filter((line) => line.remainingReturnableQuantity > 0);

  if (eligibleLineItems.length === 0) {
    return {
      state: 'blocked',
      blockedReasonCode: 'no_returnable_quantity',
      blockedReason: 'No returnable quantity remains for this order.',
      sourceOrder,
      eligibleLineItems: [],
      existingRmas,
      suggestedReason: mapSuggestedReason(issue.resolutionCategory),
    };
  }

  const normalizedSerial =
    issue.serialNumber && issue.serialNumber.trim()
      ? normalizeSerial(issue.serialNumber)
      : null;

  if (normalizedSerial) {
    const activeSerialClaim = await executor
      .select({ serialNumber: rmaLineItems.serialNumber })
      .from(rmaLineItems)
      .innerJoin(returnAuthorizations, eq(rmaLineItems.rmaId, returnAuthorizations.id))
      .where(
        and(
          eq(returnAuthorizations.organizationId, params.organizationId),
          eq(returnAuthorizations.orderId, sourceOrder.id),
          inArray(returnAuthorizations.status, [...ACTIVE_RMA_STATUSES]),
          eq(rmaLineItems.serialNumber, normalizedSerial)
        )
      )
      .limit(1);

    if (activeSerialClaim.length > 0) {
      return {
        state: 'blocked',
        blockedReasonCode: 'serial_already_on_active_rma',
        blockedReason: `Serial "${normalizedSerial}" is already attached to an active RMA.`,
        sourceOrder,
        eligibleLineItems: [],
        existingRmas,
        suggestedReason: mapSuggestedReason(issue.resolutionCategory),
      };
    }
  }

  return {
    state: 'ready',
    blockedReasonCode: null,
    blockedReason: null,
    sourceOrder,
    eligibleLineItems,
    existingRmas,
    suggestedReason: mapSuggestedReason(issue.resolutionCategory),
  };
}

export async function getIssueRemedyContext(params: {
  organizationId: string;
  issue: IssueRemedyRow;
  supportContext: NonNullable<IssueDetail['supportContext']> | null;
  executor?: TransactionExecutor;
}): Promise<{
  resolution: IssueResolution | null;
  rmaReadiness: IssueRmaReadiness;
}> {
  const resolution = buildIssueResolution(params.issue);
  const rmaReadiness = await getIssueRmaReadiness({
    organizationId: params.organizationId,
    issue: params.issue,
    sourceOrder: params.supportContext?.order ?? null,
    executor: params.executor,
  });

  return {
    resolution,
    rmaReadiness,
  };
}
