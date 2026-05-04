import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { TransactionExecutor } from '@/lib/db';
import {
  customers,
  orders,
  serviceLinkageReviews,
  serviceOwners,
  serviceSystemOwnerships,
  serviceSystems,
  warranties,
  warrantyOwnerRecords,
} from 'drizzle/schema';
import type { ServiceOwnerInput } from '@/lib/schemas/service';
import type { ServiceLinkageReviewSnapshot } from 'drizzle/schema/service/service-linkage-reviews';
import {
  buildAddressKey,
  normalizeOwnerInput,
  ownerConflicts,
  ownerMatchesExactly,
  toServiceSystemAddress,
  type ServiceOwnerAddress,
} from './service-normalization';

export interface EnsureWarrantyServiceLinkageArgs {
  organizationId: string;
  warrantyId: string;
  commercialCustomerId: string | null;
  sourceOrderId: string | null;
  projectId: string | null;
  sourceEntitlementId?: string | null;
  owner: ServiceOwnerInput;
  sourceLabel: string;
  userId: string | null;
}

interface MatchingCandidate {
  id: string;
  displayName: string;
  commercialCustomerId: string | null;
  sourceOrderId: string | null;
  projectId: string | null;
  normalizedSiteAddressKey: string | null;
  currentOwnerId: string | null;
  normalizedFullName: string | null;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
}

interface SourceContext {
  order: {
    shippingAddress: unknown;
    orderNumber: string | null;
  } | null;
  customer: {
    name: string | null;
  } | null;
}

interface ResolvedServiceOwner {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: ServiceOwnerAddress | null;
  notes: string | null;
  wasCreated: boolean;
}

type PreparedWarrantyServiceLinkageDecision =
  | {
      type: 'review';
      reasonCode: 'multiple_system_matches' | 'conflicting_owner_match';
      candidateSystemIds: string[];
      snapshot: ServiceLinkageReviewSnapshot;
      normalizedOwner: ReturnType<typeof normalizeOwnerInput>;
    }
  | {
      type: 'link_existing';
      serviceSystemId: string;
      currentOwnerId: string | null;
      normalizedOwner: ReturnType<typeof normalizeOwnerInput>;
    }
  | {
      type: 'create_new';
      normalizedOwner: ReturnType<typeof normalizeOwnerInput>;
      sourceContext: SourceContext;
      siteAddress: ServiceOwnerAddress | null;
      normalizedSiteAddressKey: string | null;
    };

export interface WarrantyServiceLinkageResult {
  serviceSystemId: string | null;
  reviewId: string | null;
  currentOwner: Omit<ResolvedServiceOwner, 'wasCreated'> | null;
  resolutionType: 'linked_existing' | 'created_system' | 'review_created';
  createdOwner: boolean;
  createdSystem: boolean;
  createdReview: boolean;
}

function buildServiceSystemDisplayName(args: {
  sourceLabel: string;
  customerName: string | null;
  siteCity: string | null;
}) {
  const customerPart = args.customerName?.trim() || 'Customer';
  const cityPart = args.siteCity?.trim();
  return cityPart ? `${customerPart} System (${cityPart})` : `${customerPart} ${args.sourceLabel}`;
}

async function resolveOrCreateServiceOwnerTx(
  executor: TransactionExecutor,
  organizationId: string,
  owner: ServiceOwnerInput,
  userId: string | null
): Promise<ResolvedServiceOwner> {
  const normalized = normalizeOwnerInput(owner);

  const existing = await findExistingServiceOwnerTx(executor, organizationId, normalized);
  if (existing) {
    return existing;
  }

  const [created] = await executor
    .insert(serviceOwners)
    .values({
      organizationId,
      fullName: normalized.fullName,
      normalizedFullName: normalized.normalizedFullName,
      email: normalized.email,
      normalizedEmail: normalized.normalizedEmail,
      phone: normalized.phone,
      normalizedPhone: normalized.normalizedPhone,
      address: normalized.address,
      notes: normalized.notes,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    })
    .returning({
      id: serviceOwners.id,
      fullName: serviceOwners.fullName,
      email: serviceOwners.email,
      phone: serviceOwners.phone,
      address: serviceOwners.address,
      notes: serviceOwners.notes,
    });

  return { ...created, wasCreated: true };
}

export async function findExistingServiceOwnerTx(
  executor: TransactionExecutor,
  organizationId: string,
  owner: ReturnType<typeof normalizeOwnerInput> | ServiceOwnerInput
): Promise<ResolvedServiceOwner | null> {
  const normalized =
    'normalizedFullName' in owner ? owner : normalizeOwnerInput(owner);

  if (normalized.normalizedEmail) {
    const matches = await executor
      .select({
        id: serviceOwners.id,
        fullName: serviceOwners.fullName,
        email: serviceOwners.email,
        phone: serviceOwners.phone,
        address: serviceOwners.address,
        notes: serviceOwners.notes,
      })
      .from(serviceOwners)
      .where(
        and(
          eq(serviceOwners.organizationId, organizationId),
          eq(serviceOwners.normalizedEmail, normalized.normalizedEmail)
        )
      )
      .limit(2);

    if (matches.length === 1) {
      return { ...matches[0], wasCreated: false };
    }
  }

  if (normalized.normalizedPhone) {
    const matches = await executor
      .select({
        id: serviceOwners.id,
        fullName: serviceOwners.fullName,
        email: serviceOwners.email,
        phone: serviceOwners.phone,
        address: serviceOwners.address,
        notes: serviceOwners.notes,
      })
      .from(serviceOwners)
      .where(
        and(
          eq(serviceOwners.organizationId, organizationId),
          eq(serviceOwners.normalizedPhone, normalized.normalizedPhone),
          eq(serviceOwners.normalizedFullName, normalized.normalizedFullName)
        )
      )
      .limit(2);

    if (matches.length === 1) {
      return { ...matches[0], wasCreated: false };
    }
  }

  return null;
}

export async function syncWarrantyOwnerMirrorTx(args: {
  executor: TransactionExecutor;
  organizationId: string;
  warrantyIds: string[];
  owner: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    address?: ServiceOwnerAddress | null;
    notes?: string | null;
  };
  userId: string | null;
}) {
  if (args.warrantyIds.length === 0) return;

  const warrantyRows = await args.executor
    .select({
      id: warranties.id,
      ownerRecordId: warranties.ownerRecordId,
    })
    .from(warranties)
    .where(
      and(
        eq(warranties.organizationId, args.organizationId),
        inArray(warranties.id, args.warrantyIds)
      )
    );

  for (const warranty of warrantyRows) {
    let ownerRecordId = warranty.ownerRecordId;

    if (ownerRecordId) {
      await args.executor
        .update(warrantyOwnerRecords)
        .set({
          fullName: args.owner.fullName,
          email: args.owner.email ?? null,
          phone: args.owner.phone ?? null,
          address: (args.owner.address as never) ?? null,
          notes: args.owner.notes ?? null,
          updatedBy: args.userId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(warrantyOwnerRecords.id, ownerRecordId));
    } else {
      const [record] = await args.executor
        .insert(warrantyOwnerRecords)
        .values({
          organizationId: args.organizationId,
          fullName: args.owner.fullName,
          email: args.owner.email ?? null,
          phone: args.owner.phone ?? null,
          address: (args.owner.address as never) ?? null,
          notes: args.owner.notes ?? null,
          createdBy: args.userId ?? null,
          updatedBy: args.userId ?? null,
        })
        .returning({ id: warrantyOwnerRecords.id });

      ownerRecordId = record.id;
    }

    await args.executor
      .update(warranties)
      .set({
        ownerRecordId,
        updatedBy: args.userId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(warranties.id, warranty.id));
  }
}

async function loadSourceContext(
  executor: TransactionExecutor,
  organizationId: string,
  sourceOrderId: string | null,
  commercialCustomerId: string | null,
  _projectId: string | null
): Promise<SourceContext> {
  const [order] = sourceOrderId
    ? await executor
        .select({
          shippingAddress: orders.shippingAddress,
          orderNumber: orders.orderNumber,
        })
        .from(orders)
        .where(and(eq(orders.id, sourceOrderId), eq(orders.organizationId, organizationId)))
        .limit(1)
    : [null];

  const [customer] = commercialCustomerId
    ? await executor
        .select({
          name: customers.name,
        })
        .from(customers)
        .where(
          and(
            eq(customers.id, commercialCustomerId),
            eq(customers.organizationId, organizationId)
          )
        )
        .limit(1)
    : [null];

  return {
    order,
    customer,
  };
}

async function loadMatchingCandidates(
  executor: TransactionExecutor,
  args: {
    organizationId: string;
    sourceOrderId: string | null;
    projectId: string | null;
    commercialCustomerId: string | null;
    normalizedSiteAddressKey: string | null;
  }
): Promise<MatchingCandidate[]> {
  const selectQuery = executor
    .select({
      id: serviceSystems.id,
      displayName: serviceSystems.displayName,
      commercialCustomerId: serviceSystems.commercialCustomerId,
      sourceOrderId: serviceSystems.sourceOrderId,
      projectId: serviceSystems.projectId,
      normalizedSiteAddressKey: serviceSystems.normalizedSiteAddressKey,
      currentOwnerId: serviceOwners.id,
      normalizedFullName: serviceOwners.normalizedFullName,
      normalizedEmail: serviceOwners.normalizedEmail,
      normalizedPhone: serviceOwners.normalizedPhone,
    })
    .from(serviceSystems)
    .leftJoin(
      serviceSystemOwnerships,
      and(
        eq(serviceSystemOwnerships.serviceSystemId, serviceSystems.id),
        isNull(serviceSystemOwnerships.endedAt)
      )
    )
    .leftJoin(serviceOwners, eq(serviceOwners.id, serviceSystemOwnerships.serviceOwnerId));

  if (args.sourceOrderId) {
    return selectQuery.where(
      and(
        eq(serviceSystems.organizationId, args.organizationId),
        eq(serviceSystems.sourceOrderId, args.sourceOrderId)
      )
    );
  }

  if (args.projectId) {
    return selectQuery.where(
      and(
        eq(serviceSystems.organizationId, args.organizationId),
        eq(serviceSystems.projectId, args.projectId)
      )
    );
  }

  if (args.normalizedSiteAddressKey && args.commercialCustomerId) {
    return selectQuery.where(
      and(
        eq(serviceSystems.organizationId, args.organizationId),
        eq(serviceSystems.normalizedSiteAddressKey, args.normalizedSiteAddressKey),
        eq(serviceSystems.commercialCustomerId, args.commercialCustomerId)
      )
    );
  }

  return [];
}

async function createServiceLinkageReviewTx(
  executor: TransactionExecutor,
  args: {
    organizationId: string;
    warrantyId: string;
    sourceEntitlementId?: string | null;
    sourceOrderId: string | null;
    projectId: string | null;
    commercialCustomerId: string | null;
    reasonCode: 'multiple_system_matches' | 'conflicting_owner_match' | 'backfill_manual_review';
    candidateSystemIds: string[];
    snapshot: ServiceLinkageReviewSnapshot;
    userId: string | null;
  }
) {
  const existingSourceCondition = args.sourceEntitlementId
    ? eq(serviceLinkageReviews.sourceEntitlementId, args.sourceEntitlementId)
    : eq(serviceLinkageReviews.sourceWarrantyId, args.warrantyId);

  const [existing] = await executor
    .select({ id: serviceLinkageReviews.id })
    .from(serviceLinkageReviews)
    .where(
      and(
        eq(serviceLinkageReviews.organizationId, args.organizationId),
        eq(serviceLinkageReviews.status, 'pending'),
        existingSourceCondition
      )
    )
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [review] = await executor
    .insert(serviceLinkageReviews)
    .values({
      organizationId: args.organizationId,
      status: 'pending',
      reasonCode: args.reasonCode,
      sourceWarrantyId: args.warrantyId,
      sourceEntitlementId: args.sourceEntitlementId ?? null,
      sourceOrderId: args.sourceOrderId,
      projectId: args.projectId,
      commercialCustomerId: args.commercialCustomerId,
      candidateSystemIds: args.candidateSystemIds,
      snapshot: args.snapshot,
      createdBy: args.userId ?? null,
      updatedBy: args.userId ?? null,
    })
    .returning({ id: serviceLinkageReviews.id });

  return review.id;
}

function toWarrantyOwnerMirrorInput(owner: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: ServiceOwnerAddress | null;
  notes?: string | null;
}) {
  return {
    fullName: owner.fullName,
    email: owner.email ?? undefined,
    phone: owner.phone ?? undefined,
    address: owner.address ?? undefined,
    notes: owner.notes ?? undefined,
  };
}

function stripOwnerCreationFlag(
  owner: ResolvedServiceOwner | null
): Omit<ResolvedServiceOwner, 'wasCreated'> | null {
  if (!owner) return null;
  const { wasCreated: _wasCreated, ...ownerWithoutFlag } = owner;
  return ownerWithoutFlag;
}

async function createServiceSystemForWarrantyTx(
  executor: TransactionExecutor,
  args: {
    organizationId: string;
    warrantyId: string;
    commercialCustomerId: string | null;
    sourceOrderId: string | null;
    projectId: string | null;
    sourceContext: SourceContext;
    siteAddress: ServiceOwnerAddress | null;
    normalizedSiteAddressKey: string | null;
    normalizedOwner: ReturnType<typeof normalizeOwnerInput>;
    sourceLabel: string;
    userId: string | null;
  }
) {
  const canonicalOwner = await resolveOrCreateServiceOwnerTx(
    executor,
    args.organizationId,
    toWarrantyOwnerMirrorInput(args.normalizedOwner),
    args.userId
  );

  const [createdSystem] = await executor
    .insert(serviceSystems)
    .values({
      organizationId: args.organizationId,
      displayName: buildServiceSystemDisplayName({
        sourceLabel: args.sourceLabel,
        customerName: args.sourceContext.customer?.name ?? null,
        siteCity: args.siteAddress?.city ?? null,
      }),
      siteAddress: args.siteAddress,
      normalizedSiteAddressKey: args.normalizedSiteAddressKey,
      commercialCustomerId: args.commercialCustomerId,
      sourceOrderId: args.sourceOrderId,
      projectId: args.projectId,
      createdBy: args.userId ?? null,
      updatedBy: args.userId ?? null,
    })
    .returning({ id: serviceSystems.id });

  await executor.insert(serviceSystemOwnerships).values({
    organizationId: args.organizationId,
    serviceSystemId: createdSystem.id,
    serviceOwnerId: canonicalOwner.id,
    startedAt: new Date(),
    createdBy: args.userId ?? null,
    updatedBy: args.userId ?? null,
  });

  await executor
    .update(warranties)
    .set({
      serviceSystemId: createdSystem.id,
      updatedBy: args.userId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(warranties.id, args.warrantyId));

  await syncWarrantyOwnerMirrorTx({
    executor,
    organizationId: args.organizationId,
    warrantyIds: [args.warrantyId],
    owner: toWarrantyOwnerMirrorInput(canonicalOwner),
    userId: args.userId,
  });

  return {
    serviceSystemId: createdSystem.id,
    currentOwner: canonicalOwner,
  };
}

export async function previewWarrantyServiceLinkageTx(
  executor: TransactionExecutor,
  args: EnsureWarrantyServiceLinkageArgs
): Promise<PreparedWarrantyServiceLinkageDecision> {
  const normalizedOwner = normalizeOwnerInput(args.owner);
  const sourceContext = await loadSourceContext(
    executor,
    args.organizationId,
    args.sourceOrderId,
    args.commercialCustomerId,
    args.projectId
  );

  const siteAddress =
    toServiceSystemAddress(sourceContext.order?.shippingAddress as never) ??
    toServiceSystemAddress(normalizedOwner.address);
  const normalizedSiteAddressKey = buildAddressKey(siteAddress);

  const candidates = await loadMatchingCandidates(executor, {
    organizationId: args.organizationId,
    sourceOrderId: args.sourceOrderId,
    projectId: args.projectId,
    commercialCustomerId: args.commercialCustomerId,
    normalizedSiteAddressKey,
  });

  if (candidates.length > 1) {
    return {
      type: 'review',
      reasonCode: 'multiple_system_matches',
      candidateSystemIds: candidates.map((candidate) => candidate.id),
      snapshot: {
        ownerName: normalizedOwner.fullName,
        ownerEmail: normalizedOwner.email ?? undefined,
        ownerPhone: normalizedOwner.phone ?? undefined,
        normalizedSiteAddressKey,
        siteAddress,
        notes: `Review created from ${args.sourceLabel}`,
      },
      normalizedOwner,
    };
  }

  if (candidates.length === 1) {
    const [candidate] = candidates;
    const currentOwnerMatches = ownerMatchesExactly(
      {
        normalizedEmail: candidate.normalizedEmail,
        normalizedPhone: candidate.normalizedPhone,
        normalizedFullName: candidate.normalizedFullName,
      },
      normalizedOwner
    );
    const currentOwnerConflicts = ownerConflicts(
      {
        normalizedEmail: candidate.normalizedEmail,
        normalizedPhone: candidate.normalizedPhone,
        normalizedFullName: candidate.normalizedFullName,
      },
      normalizedOwner
    );

    if (currentOwnerConflicts) {
      return {
        type: 'review',
        reasonCode: 'conflicting_owner_match',
        candidateSystemIds: [candidate.id],
        snapshot: {
          ownerName: normalizedOwner.fullName,
          ownerEmail: normalizedOwner.email ?? undefined,
          ownerPhone: normalizedOwner.phone ?? undefined,
          normalizedSiteAddressKey,
          siteAddress,
          notes: `Conflicting owner match from ${args.sourceLabel}`,
        },
        normalizedOwner,
      };
    }

    if (candidate.currentOwnerId && (currentOwnerMatches || args.sourceOrderId || args.projectId)) {
      return {
        type: 'link_existing',
        serviceSystemId: candidate.id,
        currentOwnerId: candidate.currentOwnerId,
        normalizedOwner,
      };
    }
  }

  return {
    type: 'create_new',
    normalizedOwner,
    sourceContext,
    siteAddress,
    normalizedSiteAddressKey,
  };
}

export async function forceCreateWarrantyServiceLinkageTx(
  executor: TransactionExecutor,
  args: EnsureWarrantyServiceLinkageArgs
): Promise<WarrantyServiceLinkageResult> {
  const normalizedOwner = normalizeOwnerInput(args.owner);
  const sourceContext = await loadSourceContext(
    executor,
    args.organizationId,
    args.sourceOrderId,
    args.commercialCustomerId,
    args.projectId
  );
  const siteAddress =
    toServiceSystemAddress(sourceContext.order?.shippingAddress as never) ??
    toServiceSystemAddress(normalizedOwner.address);
  const normalizedSiteAddressKey = buildAddressKey(siteAddress);

  const created = await createServiceSystemForWarrantyTx(executor, {
    organizationId: args.organizationId,
    warrantyId: args.warrantyId,
    commercialCustomerId: args.commercialCustomerId,
    sourceOrderId: args.sourceOrderId,
    projectId: args.projectId,
    sourceContext,
    siteAddress,
    normalizedSiteAddressKey,
    normalizedOwner,
    sourceLabel: args.sourceLabel,
    userId: args.userId,
  });

  return {
    serviceSystemId: created.serviceSystemId,
    reviewId: null,
    currentOwner: stripOwnerCreationFlag(created.currentOwner),
    resolutionType: 'created_system',
    createdOwner: created.currentOwner.wasCreated,
    createdSystem: true,
    createdReview: false,
  };
}

export async function ensureWarrantyServiceLinkageTx(
  executor: TransactionExecutor,
  args: EnsureWarrantyServiceLinkageArgs
) : Promise<WarrantyServiceLinkageResult> {
  const decision = await previewWarrantyServiceLinkageTx(executor, args);

  if (decision.type === 'review') {
    const reviewId = await createServiceLinkageReviewTx(executor, {
      organizationId: args.organizationId,
      warrantyId: args.warrantyId,
      sourceEntitlementId: args.sourceEntitlementId,
      sourceOrderId: args.sourceOrderId,
      projectId: args.projectId,
      commercialCustomerId: args.commercialCustomerId,
      reasonCode: decision.reasonCode,
      candidateSystemIds: decision.candidateSystemIds,
      snapshot: decision.snapshot,
      userId: args.userId,
    });

    await syncWarrantyOwnerMirrorTx({
      executor,
      organizationId: args.organizationId,
      warrantyIds: [args.warrantyId],
      owner: toWarrantyOwnerMirrorInput(decision.normalizedOwner),
      userId: args.userId,
    });

    return {
      serviceSystemId: null,
      reviewId,
      currentOwner: null,
      resolutionType: 'review_created',
      createdOwner: false,
      createdSystem: false,
      createdReview: true,
    };
  }

  if (decision.type === 'link_existing') {
    let canonicalOwner: ResolvedServiceOwner | null = null;

    if (decision.currentOwnerId) {
      const [currentOwnership] = await executor
        .select({
          id: serviceOwners.id,
          fullName: serviceOwners.fullName,
          email: serviceOwners.email,
          phone: serviceOwners.phone,
          address: serviceOwners.address,
          notes: serviceOwners.notes,
        })
        .from(serviceOwners)
        .where(eq(serviceOwners.id, decision.currentOwnerId))
        .limit(1);

      canonicalOwner = currentOwnership ? { ...currentOwnership, wasCreated: false } : null;
    }

    await executor
      .update(warranties)
      .set({
        serviceSystemId: decision.serviceSystemId,
        updatedBy: args.userId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(warranties.id, args.warrantyId));

    if (canonicalOwner) {
      await syncWarrantyOwnerMirrorTx({
        executor,
        organizationId: args.organizationId,
        warrantyIds: [args.warrantyId],
        owner: toWarrantyOwnerMirrorInput(canonicalOwner),
        userId: args.userId,
      });
    }

    return {
      serviceSystemId: decision.serviceSystemId,
      reviewId: null,
      currentOwner: stripOwnerCreationFlag(canonicalOwner),
      resolutionType: 'linked_existing',
      createdOwner: false,
      createdSystem: false,
      createdReview: false,
    };
  }

  const created = await createServiceSystemForWarrantyTx(executor, {
    organizationId: args.organizationId,
    warrantyId: args.warrantyId,
    commercialCustomerId: args.commercialCustomerId,
    sourceOrderId: args.sourceOrderId,
    projectId: args.projectId,
    sourceContext: decision.sourceContext,
    siteAddress: decision.siteAddress,
    normalizedSiteAddressKey: decision.normalizedSiteAddressKey,
    normalizedOwner: decision.normalizedOwner,
    sourceLabel: args.sourceLabel,
    userId: args.userId,
  });

  return {
    serviceSystemId: created.serviceSystemId,
    reviewId: null,
    currentOwner: stripOwnerCreationFlag(created.currentOwner),
    resolutionType: 'created_system',
    createdOwner: created.currentOwner.wasCreated,
    createdSystem: true,
    createdReview: false,
  };
}

export async function transferServiceSystemOwnershipTx(
  executor: TransactionExecutor,
  args: {
    organizationId: string;
    serviceSystemId: string;
    newOwner: ServiceOwnerInput;
    reason: string;
    effectiveAt: Date;
    userId: string | null;
  }
) {
  const [system] = await executor
    .select({
      id: serviceSystems.id,
    })
    .from(serviceSystems)
    .where(
      and(
        eq(serviceSystems.id, args.serviceSystemId),
        eq(serviceSystems.organizationId, args.organizationId)
      )
    )
    .limit(1);

  if (!system) {
    throw new Error('Service system not found');
  }

  const newOwner = await resolveOrCreateServiceOwnerTx(
    executor,
    args.organizationId,
    args.newOwner,
    args.userId
  );

  const [currentOwnership] = await executor
    .select({
      id: serviceSystemOwnerships.id,
      ownerId: serviceOwners.id,
    })
    .from(serviceSystemOwnerships)
    .innerJoin(serviceOwners, eq(serviceOwners.id, serviceSystemOwnerships.serviceOwnerId))
    .where(
      and(
        eq(serviceSystemOwnerships.organizationId, args.organizationId),
        eq(serviceSystemOwnerships.serviceSystemId, args.serviceSystemId),
        isNull(serviceSystemOwnerships.endedAt)
      )
    )
    .limit(1);

  if (currentOwnership?.ownerId === newOwner.id) {
    return {
      currentOwnershipId: currentOwnership.id,
      newOwner,
    };
  }

  if (currentOwnership) {
    await executor
      .update(serviceSystemOwnerships)
      .set({
        endedAt: args.effectiveAt,
        transferReason: args.reason,
        updatedBy: args.userId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(serviceSystemOwnerships.id, currentOwnership.id));
  }

  await executor.insert(serviceSystemOwnerships).values({
    organizationId: args.organizationId,
    serviceSystemId: args.serviceSystemId,
    serviceOwnerId: newOwner.id,
    startedAt: args.effectiveAt,
    transferReason: args.reason,
    createdBy: args.userId ?? null,
    updatedBy: args.userId ?? null,
  });

  const linkedWarranties = await executor
    .select({ id: warranties.id })
    .from(warranties)
    .where(
      and(
        eq(warranties.organizationId, args.organizationId),
        eq(warranties.serviceSystemId, args.serviceSystemId)
      )
    );

  await syncWarrantyOwnerMirrorTx({
    executor,
    organizationId: args.organizationId,
    warrantyIds: linkedWarranties.map((warranty) => warranty.id),
    owner: newOwner,
    userId: args.userId,
  });

  return {
    currentOwnershipId: currentOwnership?.id ?? null,
    newOwner,
    linkedWarrantyIds: linkedWarranties.map((warranty) => warranty.id),
  };
}
