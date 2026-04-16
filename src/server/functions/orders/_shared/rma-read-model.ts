import { and, eq, inArray } from 'drizzle-orm';

import { db, type TransactionExecutor } from '@/lib/db';
import type { RmaLineItemResponse, RmaResponse } from '@/lib/schemas/support/rma';
import { customers } from 'drizzle/schema/customers';
import { orderLineItems } from 'drizzle/schema/orders';
import { products } from 'drizzle/schema/products/products';
import { issues } from 'drizzle/schema/support/issues';
import {
  returnAuthorizations,
  rmaLineItems,
} from 'drizzle/schema/support/return-authorizations';
import {
  buildRmaExecutionSummary,
  hydrateRmaExecutionArtifactsBatch,
  type RmaExecutionArtifactRequest,
} from './rma-remedy-execution';

export type RmaReadProfile = 'summary' | 'detail';
export type RmaRow = typeof returnAuthorizations.$inferSelect;
type HydratedRmaExecutionArtifacts = Awaited<
  ReturnType<typeof hydrateRmaExecutionArtifactsBatch>
> extends Map<string, infer T>
  ? T
  : never;

export const rmaLineItemsProjection = {
  id: rmaLineItems.id,
  rmaId: rmaLineItems.rmaId,
  orderLineItemId: rmaLineItems.orderLineItemId,
  quantityReturned: rmaLineItems.quantityReturned,
  itemReason: rmaLineItems.itemReason,
  itemCondition: rmaLineItems.itemCondition,
  serialNumber: rmaLineItems.serialNumber,
  createdAt: rmaLineItems.createdAt,
  updatedAt: rmaLineItems.updatedAt,
};

interface RmaIssueLink {
  id: string;
  title: string;
  status: string;
}

interface RmaCustomerLink {
  id: string;
  name: string;
}

interface RmaReadModelDependencies {
  fetchBasicLineItems: (
    executor: TransactionExecutor,
    rmaIds: string[]
  ) => Promise<Map<string, RmaLineItemResponse[]>>;
  fetchDetailedLineItems: (
    executor: TransactionExecutor,
    organizationId: string,
    rmaId: string
  ) => Promise<RmaLineItemResponse[]>;
  fetchCustomers: (
    executor: TransactionExecutor,
    organizationId: string,
    customerIds: string[]
  ) => Promise<Map<string, RmaCustomerLink>>;
  fetchIssues: (
    executor: TransactionExecutor,
    organizationId: string,
    issueIds: string[]
  ) => Promise<Map<string, RmaIssueLink>>;
  fetchExecutionArtifacts: (
    executor: TransactionExecutor,
    organizationId: string,
    requests: RmaExecutionArtifactRequest[]
  ) => Promise<Map<string, HydratedRmaExecutionArtifacts>>;
}

interface RmaResponseMappingInput {
  rma: RmaRow;
  lineItems: RmaLineItemResponse[];
  customer: RmaCustomerLink | null;
  issue: RmaIssueLink | null;
  artifacts: HydratedRmaExecutionArtifacts;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.toISOString();
}

function requireSourceOrderId(rma: Pick<RmaRow, 'id' | 'orderId'>): string {
  if (!rma.orderId) {
    throw new Error(`RMA ${rma.id} is missing its source order reference.`);
  }

  return rma.orderId;
}

async function fetchBasicLineItems(
  executor: TransactionExecutor,
  rmaIds: string[]
): Promise<Map<string, RmaLineItemResponse[]>> {
  if (rmaIds.length === 0) {
    return new Map();
  }

  const rows = (await executor
    .select(rmaLineItemsProjection)
    .from(rmaLineItems)
    .where(inArray(rmaLineItems.rmaId, rmaIds))) as RmaLineItemResponse[];

  const lineItemsByRma = new Map<string, RmaLineItemResponse[]>();
  for (const row of rows) {
    const existing = lineItemsByRma.get(row.rmaId) ?? [];
    existing.push(row);
    lineItemsByRma.set(row.rmaId, existing);
  }

  return lineItemsByRma;
}

async function fetchDetailedLineItems(
  executor: TransactionExecutor,
  organizationId: string,
  rmaId: string
): Promise<RmaLineItemResponse[]> {
  const rows = await executor
    .select({
      ...rmaLineItemsProjection,
      productId: orderLineItems.productId,
      quantity: orderLineItems.quantity,
      unitPrice: orderLineItems.unitPrice,
      productName: products.name,
    })
    .from(rmaLineItems)
    .innerJoin(orderLineItems, eq(rmaLineItems.orderLineItemId, orderLineItems.id))
    .leftJoin(
      products,
      and(
        eq(orderLineItems.productId, products.id),
        eq(products.organizationId, organizationId)
      )
    )
    .where(eq(rmaLineItems.rmaId, rmaId));

  return rows.map((row) => ({
    id: row.id,
    rmaId: row.rmaId,
    orderLineItemId: row.orderLineItemId,
    quantityReturned: row.quantityReturned,
    itemReason: row.itemReason,
    itemCondition: row.itemCondition,
    serialNumber: row.serialNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    orderLineItem: {
      id: row.orderLineItemId,
      productId: row.productId ?? '',
      productName: row.productName ?? 'Unknown Product',
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
    },
  }));
}

async function fetchCustomers(
  executor: TransactionExecutor,
  organizationId: string,
  customerIds: string[]
): Promise<Map<string, RmaCustomerLink>> {
  if (customerIds.length === 0) {
    return new Map();
  }

  const rows = await executor
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        inArray(customers.id, customerIds)
      )
    );

  return new Map(rows.map((row) => [row.id, row]));
}

async function fetchIssues(
  executor: TransactionExecutor,
  organizationId: string,
  issueIds: string[]
): Promise<Map<string, RmaIssueLink>> {
  if (issueIds.length === 0) {
    return new Map();
  }

  const rows = await executor
    .select({ id: issues.id, title: issues.title, status: issues.status })
    .from(issues)
    .where(
      and(
        eq(issues.organizationId, organizationId),
        inArray(issues.id, issueIds)
      )
    );

  return new Map(rows.map((row) => [row.id, row]));
}

function mapRmaResponse(params: RmaResponseMappingInput): RmaResponse {
  const { rma, lineItems, customer, issue, artifacts } = params;

  return {
    id: rma.id,
    organizationId: rma.organizationId,
    rmaNumber: rma.rmaNumber,
    issueId: rma.issueId,
    customerId: rma.customerId,
    orderId: requireSourceOrderId(rma),
    status: rma.status,
    reason: rma.reason,
    reasonDetails: rma.reasonDetails,
    resolution: rma.resolution,
    resolutionDetails: rma.resolutionDetails,
    executionStatus: rma.executionStatus,
    executionBlockedReason: rma.executionBlockedReason,
    executionCompletedAt: toIsoString(rma.executionCompletedAt),
    executionCompletedBy: rma.executionCompletedBy,
    refundPaymentId: rma.refundPaymentId,
    creditNoteId: rma.creditNoteId,
    replacementOrderId: rma.replacementOrderId,
    inspectionNotes: rma.inspectionNotes,
    internalNotes: rma.internalNotes,
    customerNotes: rma.customerNotes,
    approvedAt: toIsoString(rma.approvedAt),
    approvedBy: rma.approvedBy,
    receivedAt: toIsoString(rma.receivedAt),
    receivedBy: rma.receivedBy,
    processedAt: toIsoString(rma.processedAt),
    processedBy: rma.processedBy,
    rejectedAt: toIsoString(rma.rejectedAt),
    rejectedBy: rma.rejectedBy,
    rejectionReason: rma.rejectionReason,
    sequenceNumber: rma.sequenceNumber,
    createdAt: rma.createdAt,
    updatedAt: rma.updatedAt,
    createdBy: rma.createdBy,
    updatedBy: rma.updatedBy,
    lineItems,
    customer,
    issue: issue ? { id: issue.id, title: issue.title } : null,
    linkedIssueOpen: artifacts.linkedIssueOpen,
    execution: buildRmaExecutionSummary({
      rma: {
        executionStatus: rma.executionStatus,
        executionBlockedReason: rma.executionBlockedReason ?? null,
        executionCompletedAt: toIsoString(rma.executionCompletedAt),
        executionCompletedBy: rma.executionCompletedBy ?? null,
        refundPaymentId: rma.refundPaymentId ?? null,
        creditNoteId: rma.creditNoteId ?? null,
        replacementOrderId: rma.replacementOrderId ?? null,
      },
      artifacts,
    }),
  };
}

const defaultDependencies: RmaReadModelDependencies = {
  fetchBasicLineItems,
  fetchDetailedLineItems,
  fetchCustomers,
  fetchIssues,
  fetchExecutionArtifacts: (
    executor,
    organizationId,
    requests
  ) =>
    hydrateRmaExecutionArtifactsBatch({
      executor,
      organizationId,
      requests,
    }),
};

export function createRmaReadModel(
  deps: RmaReadModelDependencies = defaultDependencies
) {
  async function loadMany(params: {
    executor?: TransactionExecutor;
    organizationId: string;
    rmas: RmaRow[];
    profile: RmaReadProfile;
    preloadedLineItemsByRma?: Map<string, RmaLineItemResponse[]>;
  }): Promise<RmaResponse[]> {
    const executor = params.executor ?? db;
    if (params.rmas.length === 0) {
      return [];
    }

    const rmaIds = params.rmas.map((rma) => rma.id);
    const lineItemsByRma =
      params.preloadedLineItemsByRma ??
      (params.profile === 'summary'
        ? await deps.fetchBasicLineItems(executor, rmaIds)
        : new Map(
            await Promise.all(
              params.rmas.map(async (rma) => [
                rma.id,
                await deps.fetchDetailedLineItems(
                  executor,
                  params.organizationId,
                  rma.id
                ),
              ] as const)
            )
          ));

    const customerIds = Array.from(
      new Set(
        params.rmas
          .map((rma) => rma.customerId)
          .filter((id): id is string => Boolean(id))
      )
    );
    const issueIds = Array.from(
      new Set(
        params.rmas
          .map((rma) => rma.issueId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const [customersById, issuesById] = await Promise.all([
      deps.fetchCustomers(executor, params.organizationId, customerIds),
      deps.fetchIssues(executor, params.organizationId, issueIds),
    ]);

    const artifactRequests: RmaExecutionArtifactRequest[] = params.rmas.map((rma) => {
      const issue = rma.issueId ? issuesById.get(rma.issueId) ?? null : null;
      return {
        rmaId: rma.id,
        refundPaymentId: rma.refundPaymentId ?? null,
        creditNoteId: rma.creditNoteId ?? null,
        replacementOrderId: rma.replacementOrderId ?? null,
        issue: issue ? { id: issue.id, status: issue.status } : null,
      };
    });

    const executionArtifactsByRma = await deps.fetchExecutionArtifacts(
      executor,
      params.organizationId,
      artifactRequests
    );

    return params.rmas.map((rma) =>
      mapRmaResponse({
        rma,
        lineItems: lineItemsByRma.get(rma.id) ?? [],
        customer: rma.customerId ? customersById.get(rma.customerId) ?? null : null,
        issue: rma.issueId ? issuesById.get(rma.issueId) ?? null : null,
        artifacts:
          executionArtifactsByRma.get(rma.id) ?? {
            refundPayment: null,
            creditNote: null,
            replacementOrder: null,
            linkedIssueOpen: null,
          },
      })
    );
  }

  async function loadOne(params: {
    executor?: TransactionExecutor;
    organizationId: string;
    rma: RmaRow;
    profile: RmaReadProfile;
    preloadedLineItems?: RmaLineItemResponse[];
  }): Promise<RmaResponse> {
    const preloadedLineItemsByRma = params.preloadedLineItems
      ? new Map([[params.rma.id, params.preloadedLineItems]])
      : undefined;
    const [response] = await loadMany({
      executor: params.executor,
      organizationId: params.organizationId,
      rmas: [params.rma],
      profile: params.profile,
      preloadedLineItemsByRma,
    });

    return response;
  }

  return {
    loadMany,
    loadOne,
  };
}

export const rmaReadModel = createRmaReadModel();
