import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import { db, type TransactionExecutor } from '@/lib/db';
import {
  activities,
  customers,
  orders,
  orderShipments,
  projects,
  products,
  serviceLinkageReviews,
  serviceOwners,
  serviceSystemOwnerships,
  serviceSystems,
  warranties,
  warrantyEntitlements,
} from 'drizzle/schema';
import {
  formatAddressLabel,
  type ServiceOwnerAddress,
  type ServiceSystemAddress,
} from './service-normalization';

export interface ServiceOwnerSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: ServiceOwnerAddress | null;
  notes: string | null;
}

export interface ServiceSystemSummary {
  id: string;
  displayName: string;
  siteAddress: ServiceSystemAddress | null;
  siteAddressLabel: string | null;
  commercialCustomer: {
    id: string;
    name: string | null;
  } | null;
  sourceOrder: {
    id: string;
    orderNumber: string | null;
  } | null;
  project: {
    id: string;
    title: string | null;
  } | null;
}

export interface ServiceContextSummary {
  serviceSystem: ServiceSystemSummary | null;
  currentOwner: ServiceOwnerSummary | null;
  ownershipHistorySummary: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    transferReason: string | null;
    owner: ServiceOwnerSummary;
  }>;
}

export interface ServicePendingReviewSummary {
  id: string;
  status: 'pending';
  reasonCode: 'multiple_system_matches' | 'conflicting_owner_match' | 'backfill_manual_review';
  candidateCount: number;
  createdAt: string;
}

export interface ServiceHistoryPreviewItem {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
}

export interface WarrantyServiceMissionControlContext extends ServiceContextSummary {
  serviceLinkageStatus: 'linked' | 'pending_review' | 'unlinked' | 'owner_missing';
  pendingServiceReview: ServicePendingReviewSummary | null;
  systemHistoryPreview: ServiceHistoryPreviewItem[];
}

export interface ServiceSystemsListFilters {
  search?: string;
  ownershipStatus?: 'owned' | 'unassigned';
}

export interface ServiceLinkageReviewCandidateSummary {
  id: string;
  displayName: string;
  commercialCustomer: {
    id: string;
    name: string | null;
  } | null;
  currentOwner: ServiceOwnerSummary | null;
  siteAddressLabel: string | null;
}

async function loadCurrentOwnershipRows(
  organizationId: string,
  serviceSystemIds: string[],
  executor: TransactionExecutor = db
) {
  if (serviceSystemIds.length === 0) return [];

  return executor
    .select({
      serviceSystemId: serviceSystemOwnerships.serviceSystemId,
      id: serviceSystemOwnerships.id,
      startedAt: serviceSystemOwnerships.startedAt,
      endedAt: serviceSystemOwnerships.endedAt,
      transferReason: serviceSystemOwnerships.transferReason,
      ownerId: serviceOwners.id,
      ownerFullName: serviceOwners.fullName,
      ownerEmail: serviceOwners.email,
      ownerPhone: serviceOwners.phone,
      ownerAddress: serviceOwners.address,
      ownerNotes: serviceOwners.notes,
    })
    .from(serviceSystemOwnerships)
    .innerJoin(serviceOwners, eq(serviceOwners.id, serviceSystemOwnerships.serviceOwnerId))
    .where(
      and(
        eq(serviceSystemOwnerships.organizationId, organizationId),
        inArray(serviceSystemOwnerships.serviceSystemId, serviceSystemIds),
        isNull(serviceSystemOwnerships.endedAt)
      )
    );
}

function toOwnerSummary(row: {
  ownerId: string;
  ownerFullName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerAddress: ServiceOwnerAddress | null;
  ownerNotes: string | null;
}): ServiceOwnerSummary {
  return {
    id: row.ownerId,
    fullName: row.ownerFullName,
    email: row.ownerEmail,
    phone: row.ownerPhone,
    address: row.ownerAddress,
    notes: row.ownerNotes,
  };
}

export async function getServiceContextForWarranty(
  organizationId: string,
  warrantyId: string,
  executor: TransactionExecutor = db
): Promise<ServiceContextSummary> {
  const [warranty] = await executor
    .select({
      serviceSystemId: warranties.serviceSystemId,
    })
    .from(warranties)
    .where(and(eq(warranties.id, warrantyId), eq(warranties.organizationId, organizationId)))
    .limit(1);

  if (!warranty?.serviceSystemId) {
    return {
      serviceSystem: null,
      currentOwner: null,
      ownershipHistorySummary: [],
    };
  }

  return getServiceSystemContextById(organizationId, warranty.serviceSystemId, executor);
}

export async function getPendingServiceReviewForWarranty(
  organizationId: string,
  warrantyId: string,
  executor: TransactionExecutor = db
): Promise<ServicePendingReviewSummary | null> {
  const [review] = await executor
    .select({
      id: serviceLinkageReviews.id,
      status: serviceLinkageReviews.status,
      reasonCode: serviceLinkageReviews.reasonCode,
      candidateSystemIds: serviceLinkageReviews.candidateSystemIds,
      createdAt: serviceLinkageReviews.createdAt,
    })
    .from(serviceLinkageReviews)
    .where(
      and(
        eq(serviceLinkageReviews.organizationId, organizationId),
        eq(serviceLinkageReviews.sourceWarrantyId, warrantyId),
        eq(serviceLinkageReviews.status, 'pending')
      )
    )
    .orderBy(desc(serviceLinkageReviews.createdAt))
    .limit(1);

  if (!review) return null;

  return {
    id: review.id,
    status: 'pending',
    reasonCode: review.reasonCode,
    candidateCount: review.candidateSystemIds?.length ?? 0,
    createdAt: review.createdAt.toISOString(),
  };
}

export async function getServiceSystemHistoryPreview(
  organizationId: string,
  serviceSystemId: string,
  limit = 3,
  executor: TransactionExecutor = db
): Promise<ServiceHistoryPreviewItem[]> {
  const rows = await executor
    .select({
      id: activities.id,
      action: activities.action,
      description: activities.description,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(
      and(
        eq(activities.organizationId, organizationId),
        eq(activities.entityType, 'service_system'),
        eq(activities.entityId, serviceSystemId)
      )
    )
    .orderBy(desc(activities.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }));
}

function getWarrantyServiceLinkageStatus(args: {
  hasServiceSystem: boolean;
  hasCurrentOwner: boolean;
  hasPendingReview: boolean;
}): WarrantyServiceMissionControlContext['serviceLinkageStatus'] {
  if (args.hasPendingReview) return 'pending_review';
  if (args.hasServiceSystem && !args.hasCurrentOwner) return 'owner_missing';
  if (args.hasServiceSystem) return 'linked';
  return 'unlinked';
}

export async function getWarrantyServiceMissionControlContext(
  organizationId: string,
  warrantyId: string,
  executor: TransactionExecutor = db
): Promise<WarrantyServiceMissionControlContext> {
  const [serviceContext, pendingServiceReview] = await Promise.all([
    getServiceContextForWarranty(organizationId, warrantyId, executor),
    getPendingServiceReviewForWarranty(organizationId, warrantyId, executor),
  ]);

  const systemHistoryPreview = serviceContext.serviceSystem
    ? await getServiceSystemHistoryPreview(
        organizationId,
        serviceContext.serviceSystem.id,
        3,
        executor
      )
    : [];

  return {
    ...serviceContext,
    serviceLinkageStatus: getWarrantyServiceLinkageStatus({
      hasServiceSystem: !!serviceContext.serviceSystem,
      hasCurrentOwner: !!serviceContext.currentOwner,
      hasPendingReview: !!pendingServiceReview,
    }),
    pendingServiceReview,
    systemHistoryPreview,
  };
}

export async function getServiceSystemContextById(
  organizationId: string,
  serviceSystemId: string,
  executor: TransactionExecutor = db
): Promise<ServiceContextSummary> {
  const [system] = await executor
    .select({
      id: serviceSystems.id,
      displayName: serviceSystems.displayName,
      siteAddress: serviceSystems.siteAddress,
      customerId: customers.id,
      customerName: customers.name,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      projectId: projects.id,
      projectTitle: projects.title,
    })
    .from(serviceSystems)
    .leftJoin(customers, eq(customers.id, serviceSystems.commercialCustomerId))
    .leftJoin(orders, eq(orders.id, serviceSystems.sourceOrderId))
    .leftJoin(projects, eq(projects.id, serviceSystems.projectId))
    .where(
      and(
        eq(serviceSystems.id, serviceSystemId),
        eq(serviceSystems.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!system) {
    return {
      serviceSystem: null,
      currentOwner: null,
      ownershipHistorySummary: [],
    };
  }

  const [currentOwnership] = await loadCurrentOwnershipRows(organizationId, [serviceSystemId], executor);
  const ownershipHistoryRows = await executor
    .select({
      id: serviceSystemOwnerships.id,
      startedAt: serviceSystemOwnerships.startedAt,
      endedAt: serviceSystemOwnerships.endedAt,
      transferReason: serviceSystemOwnerships.transferReason,
      ownerId: serviceOwners.id,
      ownerFullName: serviceOwners.fullName,
      ownerEmail: serviceOwners.email,
      ownerPhone: serviceOwners.phone,
      ownerAddress: serviceOwners.address,
      ownerNotes: serviceOwners.notes,
    })
    .from(serviceSystemOwnerships)
    .innerJoin(serviceOwners, eq(serviceOwners.id, serviceSystemOwnerships.serviceOwnerId))
    .where(
      and(
        eq(serviceSystemOwnerships.organizationId, organizationId),
        eq(serviceSystemOwnerships.serviceSystemId, serviceSystemId)
      )
    )
    .orderBy(desc(serviceSystemOwnerships.startedAt));

  return {
    serviceSystem: {
      id: system.id,
      displayName: system.displayName,
      siteAddress: system.siteAddress as ServiceSystemAddress | null,
      siteAddressLabel: formatAddressLabel(system.siteAddress as ServiceSystemAddress | null),
      commercialCustomer: system.customerId
        ? { id: system.customerId, name: system.customerName }
        : null,
      sourceOrder: system.orderId
        ? { id: system.orderId, orderNumber: system.orderNumber }
        : null,
      project: system.projectId ? { id: system.projectId, title: system.projectTitle } : null,
    },
    currentOwner: currentOwnership ? toOwnerSummary(currentOwnership) : null,
    ownershipHistorySummary: ownershipHistoryRows.map((row) => ({
      id: row.id,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      transferReason: row.transferReason,
      owner: toOwnerSummary(row),
    })),
  };
}

export async function getServiceSystemDetail(
  organizationId: string,
  serviceSystemId: string,
  executor: TransactionExecutor = db
) {
  const context = await getServiceSystemContextById(organizationId, serviceSystemId, executor);
  if (!context.serviceSystem) return null;

  const linkedWarranties = await executor
    .select({
      id: warranties.id,
      warrantyNumber: warranties.warrantyNumber,
      productSerial: warranties.productSerial,
      status: warranties.status,
      customerId: customers.id,
      customerName: customers.name,
      productName: products.name,
    })
    .from(warranties)
    .leftJoin(customers, eq(customers.id, warranties.customerId))
    .leftJoin(products, eq(products.id, warranties.productId))
    .where(
      and(
        eq(warranties.organizationId, organizationId),
        eq(warranties.serviceSystemId, serviceSystemId)
      )
    )
    .orderBy(asc(warranties.createdAt));

  return {
    ...context.serviceSystem,
    currentOwner: context.currentOwner,
    ownershipHistory: context.ownershipHistorySummary,
    linkedWarranties: linkedWarranties.map((warranty) => ({
      id: warranty.id,
      warrantyNumber: warranty.warrantyNumber,
      productName: warranty.productName,
      productSerial: warranty.productSerial,
      status: warranty.status,
      customerId: warranty.customerId,
      customerName: warranty.customerName,
    })),
  };
}

export async function listServiceSystemSummaries(
  organizationId: string,
  filters: ServiceSystemsListFilters,
  executor: TransactionExecutor = db
) {
  const conditions = [eq(serviceSystems.organizationId, organizationId)];

  if (filters.ownershipStatus === 'owned') {
    conditions.push(isNotNull(serviceOwners.id));
  }

  if (filters.ownershipStatus === 'unassigned') {
    conditions.push(isNull(serviceOwners.id));
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(serviceSystems.displayName, search),
        ilike(customers.name, search),
        ilike(serviceOwners.fullName, search),
        ilike(orders.orderNumber, search)
      )!
    );
  }

  const systems = await executor
    .select({
      id: serviceSystems.id,
      displayName: serviceSystems.displayName,
      siteAddress: serviceSystems.siteAddress,
      createdAt: serviceSystems.createdAt,
      customerId: customers.id,
      customerName: customers.name,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      projectId: projects.id,
      projectTitle: projects.title,
      ownerId: serviceOwners.id,
      ownerFullName: serviceOwners.fullName,
      ownerEmail: serviceOwners.email,
      ownerPhone: serviceOwners.phone,
      ownerAddress: serviceOwners.address,
      ownerNotes: serviceOwners.notes,
    })
    .from(serviceSystems)
    .leftJoin(customers, eq(customers.id, serviceSystems.commercialCustomerId))
    .leftJoin(orders, eq(orders.id, serviceSystems.sourceOrderId))
    .leftJoin(projects, eq(projects.id, serviceSystems.projectId))
    .leftJoin(
      serviceSystemOwnerships,
      and(
        eq(serviceSystemOwnerships.serviceSystemId, serviceSystems.id),
        isNull(serviceSystemOwnerships.endedAt)
      )
    )
    .leftJoin(serviceOwners, eq(serviceOwners.id, serviceSystemOwnerships.serviceOwnerId))
    .where(and(...conditions))
    .orderBy(desc(serviceSystems.createdAt), asc(serviceSystems.displayName));

  const serviceSystemIds = systems.map((system) => system.id);
  const linkedWarrantyRows = serviceSystemIds.length
    ? await executor
        .select({
          serviceSystemId: warranties.serviceSystemId,
          warrantyId: warranties.id,
        })
        .from(warranties)
        .where(
          and(
            eq(warranties.organizationId, organizationId),
            inArray(warranties.serviceSystemId, serviceSystemIds)
          )
        )
    : [];

  const linkedWarrantyCountBySystemId = linkedWarrantyRows.reduce(
    (acc, row) => {
      if (!row.serviceSystemId) return acc;
      acc.set(row.serviceSystemId, (acc.get(row.serviceSystemId) ?? 0) + 1);
      return acc;
    },
    new Map<string, number>()
  );

  return systems.map((system) => ({
    id: system.id,
    displayName: system.displayName,
    siteAddress: system.siteAddress as ServiceSystemAddress | null,
    siteAddressLabel: formatAddressLabel(system.siteAddress as ServiceSystemAddress | null),
    commercialCustomer: system.customerId
      ? { id: system.customerId, name: system.customerName }
      : null,
    sourceOrder: system.orderId
      ? { id: system.orderId, orderNumber: system.orderNumber }
      : null,
    project: system.projectId ? { id: system.projectId, title: system.projectTitle } : null,
    currentOwner: system.ownerId
      ? {
          id: system.ownerId,
          fullName: system.ownerFullName ?? 'Unknown owner',
          email: system.ownerEmail,
          phone: system.ownerPhone,
          address: system.ownerAddress as ServiceOwnerAddress | null,
          notes: system.ownerNotes,
        }
      : null,
    linkedWarrantyCount: linkedWarrantyCountBySystemId.get(system.id) ?? 0,
    createdAt: system.createdAt.toISOString(),
  }));
}

export async function getServiceLinkageReviewDetail(
  organizationId: string,
  reviewId: string,
  executor: TransactionExecutor = db
) {
  const [review] = await executor
    .select({
      id: serviceLinkageReviews.id,
      status: serviceLinkageReviews.status,
      reasonCode: serviceLinkageReviews.reasonCode,
      snapshot: serviceLinkageReviews.snapshot,
      candidateSystemIds: serviceLinkageReviews.candidateSystemIds,
      createdAt: serviceLinkageReviews.createdAt,
      customerId: customers.id,
      customerName: customers.name,
      warrantyId: warranties.id,
      warrantyNumber: warranties.warrantyNumber,
      entitlementId: warrantyEntitlements.id,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      shipmentNumber: orderShipments.shipmentNumber,
      projectId: projects.id,
      projectTitle: projects.title,
    })
    .from(serviceLinkageReviews)
    .leftJoin(customers, eq(customers.id, serviceLinkageReviews.commercialCustomerId))
    .leftJoin(warranties, eq(warranties.id, serviceLinkageReviews.sourceWarrantyId))
    .leftJoin(warrantyEntitlements, eq(warrantyEntitlements.id, serviceLinkageReviews.sourceEntitlementId))
    .leftJoin(orders, eq(orders.id, serviceLinkageReviews.sourceOrderId))
    .leftJoin(orderShipments, eq(orderShipments.id, warrantyEntitlements.shipmentId))
    .leftJoin(projects, eq(projects.id, serviceLinkageReviews.projectId))
    .where(
      and(
        eq(serviceLinkageReviews.id, reviewId),
        eq(serviceLinkageReviews.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!review) return null;

  const candidateIds = review.candidateSystemIds ?? [];
  const candidates = candidateIds.length
    ? await getServiceSystemCandidates(organizationId, candidateIds, executor)
    : [];

  return {
    id: review.id,
    status: review.status,
    reasonCode: review.reasonCode,
    commercialCustomer: review.customerId
      ? { id: review.customerId, name: review.customerName }
      : null,
    sourceWarranty: review.warrantyId
      ? { id: review.warrantyId, warrantyNumber: review.warrantyNumber ?? review.warrantyId }
      : null,
    sourceEntitlement: review.entitlementId
      ? {
          id: review.entitlementId,
          orderNumber: review.orderNumber,
          shipmentNumber: review.shipmentNumber,
        }
      : null,
    sourceOrder: review.orderId
      ? { id: review.orderId, orderNumber: review.orderNumber }
      : null,
    project: review.projectId ? { id: review.projectId, title: review.projectTitle } : null,
    snapshot: review.snapshot ?? {},
    candidateCount: candidates.length,
    createdAt: review.createdAt.toISOString(),
    candidates,
  };
}

export async function getServiceSystemCandidates(
  organizationId: string,
  serviceSystemIds: string[],
  executor: TransactionExecutor = db
): Promise<ServiceLinkageReviewCandidateSummary[]> {
  if (serviceSystemIds.length === 0) return [];

  const systems = await executor
    .select({
      id: serviceSystems.id,
      displayName: serviceSystems.displayName,
      siteAddress: serviceSystems.siteAddress,
      customerId: customers.id,
      customerName: customers.name,
    })
    .from(serviceSystems)
    .leftJoin(customers, eq(customers.id, serviceSystems.commercialCustomerId))
    .where(
      and(
        eq(serviceSystems.organizationId, organizationId),
        inArray(serviceSystems.id, serviceSystemIds)
      )
    );

  const currentOwnershipRows = await loadCurrentOwnershipRows(organizationId, serviceSystemIds, executor);
  const currentOwnershipBySystemId = new Map(
    currentOwnershipRows.map((row) => [row.serviceSystemId, row])
  );

  return systems.map((system) => {
    const ownership = currentOwnershipBySystemId.get(system.id);
    return {
      id: system.id,
      displayName: system.displayName,
      commercialCustomer: system.customerId
        ? { id: system.customerId, name: system.customerName }
        : null,
      currentOwner: ownership ? toOwnerSummary(ownership) : null,
      siteAddressLabel: formatAddressLabel(system.siteAddress as ServiceSystemAddress | null),
    };
  });
}
