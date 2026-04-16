'use server'

/**
 * Warranty Claims Server Functions
 *
 * Handles warranty claim lifecycle: submission, status updates, approval,
 * denial, and resolution. Integrates with unified SLA engine.
 *
 * @see drizzle/schema/warranty-claims.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-006b
 */

import { cache } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { z } from 'zod';
import { eq, and, or, desc, asc, sql, count, like, inArray } from 'drizzle-orm';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
  cursorPaginationSchema,
} from '@/lib/db/pagination';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  warrantyClaims,
  warranties,
  warrantyPolicies,
  warrantyOwnerRecords,
  customers,
  products,
  users,
  slaTracking,
  slaConfigurations,
  slaEvents,
  businessHoursConfig,
  organizationHolidays,
  type WarrantyClaim,
} from 'drizzle/schema';
import {
  calculateInitialTracking,
  calculateResolutionUpdate,
  buildStartedEventData,
  buildResolvedEventData,
  toSlaTracking,
  toWeeklySchedule,
} from '@/lib/sla';
import type {
  SlaConfiguration,
  BusinessHoursConfig as BusinessHoursConfigType,
} from '@/lib/sla/types';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  client,
  warrantyEvents,
  type WarrantyClaimSubmittedPayload,
  type WarrantyClaimResolvedPayload,
} from '@/trigger/client';
import {
  createWarrantyClaimSchema,
  updateClaimStatusSchema,
  approveClaimSchema,
  denyClaimSchema,
  resolveClaimSchema,
  listWarrantyClaimsBaseSchema,
  listWarrantyClaimsSchema,
  getWarrantyClaimSchema,
  assignClaimSchema,
  isWarrantyClaimantRoleValue,
  type WarrantyClaimantRoleValue,
  type WarrantyClaimQuickFilterValue,
  type WarrantyClaimantSnapshot,
} from '@/lib/schemas/warranty/claims';
import { buildClaimAtRiskOrBreachedCondition } from '@/lib/warranty/claim-sla-filters';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { serializedMutationSuccess, type SerializedMutationEnvelope } from '@/lib/server/serialized-mutation-contract';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges, excludeFieldsForActivity } from '@/lib/activity-logger';
import { warrantyLogger } from '@/lib/logger';
import { normalizeSerial } from '@/lib/serials';
import {
  addSerializedItemEvent,
  findSerializedItemBySerial,
} from '@/server/functions/_shared/serialized-lineage';
import { hasProcessedIdempotencyKey } from '@/server/functions/_shared/idempotency';
import { getServiceContextForWarranty } from '@/server/functions/service/_shared/service-resolver';

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const WARRANTY_CLAIM_EXCLUDED_FIELDS = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'version',
  'organizationId',
  'slaTrackingId',
] as const satisfies readonly string[];

type CustomerSummary = {
  id: string;
  name: string | null;
  email?: string | null;
};

type OwnerRecordSummary = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  address?: unknown;
};

type ClaimActivityMetadataSource = Pick<
  WarrantyClaim,
  'customerId' | 'claimantRole' | 'claimantCustomerId' | 'claimantSnapshot' | 'channelBypassReason'
>;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate unique claim number for organization
 * Format: CLM-YYYY-NNNNN (e.g., CLM-2026-00001)
 */
async function generateClaimNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CLM-${year}-`;

  // Get current max sequence for this year in this org
  const result = await db
    .select({
      maxNumber: sql<string>`MAX(${warrantyClaims.claimNumber})`,
    })
    .from(warrantyClaims)
    .where(
      and(
        eq(warrantyClaims.organizationId, organizationId),
        like(warrantyClaims.claimNumber, `${prefix}%`)
      )
    );

  let nextSequence = 1;
  if (result[0]?.maxNumber) {
    const currentSequence = parseInt(result[0].maxNumber.split('-')[2], 10);
    nextSequence = currentSequence + 1;
  }

  return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
}

function getClaimantRole(
  role: string | null | undefined
): WarrantyClaimantRoleValue {
  return isWarrantyClaimantRoleValue(role) ? role : 'channel_partner';
}

function normalizeClaimantSnapshot(
  snapshot: WarrantyClaimantSnapshot | null | undefined
): WarrantyClaimantSnapshot | null {
  if (!snapshot?.fullName?.trim()) return null;
  return {
    fullName: snapshot.fullName.trim(),
    email: snapshot.email?.trim() || undefined,
    phone: snapshot.phone?.trim() || undefined,
  };
}

function buildOwnerClaimantSnapshot(
  ownerRecord: OwnerRecordSummary | null | undefined
): WarrantyClaimantSnapshot | null {
  if (!ownerRecord?.fullName?.trim()) return null;
  return {
    fullName: ownerRecord.fullName.trim(),
    email: ownerRecord.email ?? undefined,
    phone: ownerRecord.phone ?? undefined,
  };
}

function deriveClaimantDisplayName(args: {
  role: WarrantyClaimantRoleValue;
  commercialCustomer: CustomerSummary | null;
  claimantCustomer: CustomerSummary | null;
  claimantSnapshot: WarrantyClaimantSnapshot | null;
}) {
  if (args.claimantCustomer?.name) return args.claimantCustomer.name;
  if (args.claimantSnapshot?.fullName) return args.claimantSnapshot.fullName;
  if (args.role === 'channel_partner') return args.commercialCustomer?.name ?? null;
  return null;
}

function buildClaimantView(args: {
  claim: Pick<
    WarrantyClaim,
    'customerId' | 'claimantRole' | 'claimantCustomerId' | 'claimantSnapshot' | 'channelBypassReason'
  >;
  commercialCustomer: CustomerSummary | null;
  claimantCustomer: CustomerSummary | null;
}) {
  const role = getClaimantRole(args.claim.claimantRole);
  const effectiveClaimantCustomer =
    role === 'channel_partner'
      ? args.claimantCustomer ?? args.commercialCustomer
      : args.claimantCustomer;
  const claimantSnapshot = normalizeClaimantSnapshot(args.claim.claimantSnapshot ?? null);

  return {
    role,
    displayName: deriveClaimantDisplayName({
      role,
      commercialCustomer: args.commercialCustomer,
      claimantCustomer: effectiveClaimantCustomer,
      claimantSnapshot,
    }),
    customerId: effectiveClaimantCustomer?.id ?? (role === 'channel_partner' ? args.claim.customerId : null),
    customer: effectiveClaimantCustomer
      ? {
          id: effectiveClaimantCustomer.id,
          name: effectiveClaimantCustomer.name,
        }
      : null,
    snapshot: claimantSnapshot,
    channelBypassReason: args.claim.channelBypassReason ?? null,
  };
}

function buildClaimantModeCondition(mode: 'channel_partner' | 'direct' | undefined) {
  if (!mode) return null;
  return mode === 'channel_partner'
    ? sql`coalesce(${warrantyClaims.claimantRole}, 'channel_partner') = 'channel_partner'`
    : sql`coalesce(${warrantyClaims.claimantRole}, 'channel_partner') <> 'channel_partner'`;
}

function buildClaimActivityMetadata(args: {
  claim: ClaimActivityMetadataSource;
  commercialCustomer: CustomerSummary | null;
  claimantCustomer?: CustomerSummary | null;
  claimantName?: string | null;
  extra: Record<string, unknown>;
  customFields?: Record<string, unknown>;
}) {
  const claimantView = buildClaimantView({
    claim: args.claim,
    commercialCustomer: args.commercialCustomer,
    claimantCustomer: args.claimantCustomer ?? null,
  });

  return {
    customerId: args.claim.customerId,
    customerName: args.commercialCustomer?.name ?? undefined,
    commercialCustomerId: args.claim.customerId,
    commercialCustomerName: args.commercialCustomer?.name ?? undefined,
    claimantRole: claimantView.role,
    claimantCustomerId: claimantView.customerId,
    claimantName: args.claimantName ?? claimantView.displayName ?? undefined,
    channelBypassReason: claimantView.channelBypassReason,
    ...args.extra,
    customFields: {
      claimantRole: claimantView.role,
      claimantName: args.claimantName ?? claimantView.displayName ?? null,
      claimantCustomerId: claimantView.customerId,
      channelBypassReason: claimantView.channelBypassReason,
      ...(args.customFields ?? {}),
    },
  };
}

async function loadCustomerMap(organizationId: string, customerIds: Array<string | null | undefined>) {
  const uniqueCustomerIds = Array.from(
    new Set(customerIds.filter((value): value is string => !!value))
  );

  if (uniqueCustomerIds.length === 0) {
    return new Map<string, CustomerSummary>();
  }

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
    })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        inArray(customers.id, uniqueCustomerIds)
      )
    );

  return new Map(rows.map((row) => [row.id, row]));
}

function resolveClaimantForCreate(args: {
  commercialCustomer: CustomerSummary;
  ownerRecord: OwnerRecordSummary | null;
  input: z.infer<typeof createWarrantyClaimSchema>;
}) {
  const claimantRole = args.input.claimantRole ?? 'channel_partner';

  if (claimantRole === 'channel_partner') {
    return {
      claimantRole,
      claimantCustomerId: args.input.claimantCustomerId ?? args.commercialCustomer.id,
      claimantSnapshot: null,
      channelBypassReason: null,
    };
  }

  const channelBypassReason = args.input.channelBypassReason?.trim();
  if (!channelBypassReason) {
    throw new ValidationError('A channel bypass reason is required for direct warranty claims');
  }

  const claimantSnapshot =
    normalizeClaimantSnapshot(args.input.claimantSnapshot) ??
    (claimantRole === 'owner' ? buildOwnerClaimantSnapshot(args.ownerRecord) : null);

  if (!claimantSnapshot) {
    throw new ValidationError('Claimant details are required when the claimant is not the channel partner');
  }

  return {
    claimantRole,
    claimantCustomerId: null,
    claimantSnapshot,
    channelBypassReason,
  };
}

/**
 * Get or create default warranty SLA configuration
 */
async function getWarrantySlaConfig(organizationId: string) {
  // Try to find existing warranty SLA config
  const [existingConfig] = await db
    .select()
    .from(slaConfigurations)
    .where(
      and(
        eq(slaConfigurations.organizationId, organizationId),
        eq(slaConfigurations.domain, 'warranty'),
        eq(slaConfigurations.isDefault, true),
        eq(slaConfigurations.isActive, true)
      )
    )
    .limit(1);

  if (existingConfig) {
    return existingConfig;
  }

  // Fall back to any active warranty config
  const [fallbackConfig] = await db
    .select()
    .from(slaConfigurations)
    .where(
      and(
        eq(slaConfigurations.organizationId, organizationId),
        eq(slaConfigurations.domain, 'warranty'),
        eq(slaConfigurations.isActive, true)
      )
    )
    .orderBy(asc(slaConfigurations.priorityOrder))
    .limit(1);

  return fallbackConfig ?? null;
}

/**
 * Start SLA tracking for a warranty claim using unified SLA engine
 * Properly handles business hours and organization holidays
 */
async function startSlaTrackingForClaim(
  organizationId: string,
  userId: string,
  claimId: string,
  configId: string,
  executor?: typeof db
) {
  const exec = executor ?? db;
  // Get the SLA configuration
  const [config] = await db
    .select()
    .from(slaConfigurations)
    .where(eq(slaConfigurations.id, configId))
    .limit(1);

  if (!config) {
    throw new NotFoundError('SLA configuration not found', 'slaConfiguration');
  }

  // Get business hours if configured
  let businessHours: BusinessHoursConfigType | null = null;
  if (config.businessHoursConfigId) {
    const [bh] = await db
      .select()
      .from(businessHoursConfig)
      .where(eq(businessHoursConfig.id, config.businessHoursConfigId))
      .limit(1);
    if (bh) {
      businessHours = {
        id: bh.id,
        organizationId: bh.organizationId,
        name: bh.name,
        weeklySchedule: toWeeklySchedule(bh.weeklySchedule),
        timezone: bh.timezone,
        isDefault: bh.isDefault,
      };
    }
  }

  // Get organization holidays
  const holidays = await db
    .select()
    .from(organizationHolidays)
    .where(eq(organizationHolidays.organizationId, organizationId));

  const holidayDates = holidays.map((h) => new Date(h.date));

  // Build SLA configuration for calculator
  const configForCalc: SlaConfiguration = {
    id: config.id,
    organizationId: config.organizationId,
    domain: config.domain,
    name: config.name,
    description: config.description,
    responseTargetValue: config.responseTargetValue,
    responseTargetUnit: config.responseTargetUnit,
    resolutionTargetValue: config.resolutionTargetValue,
    resolutionTargetUnit: config.resolutionTargetUnit,
    atRiskThresholdPercent: config.atRiskThresholdPercent,
    escalateOnBreach: config.escalateOnBreach,
    escalateToUserId: config.escalateToUserId,
    businessHoursConfigId: config.businessHoursConfigId,
    isDefault: config.isDefault,
    priorityOrder: config.priorityOrder,
    isActive: config.isActive,
  };

  // Calculate initial tracking values using unified SLA engine
  const initialValues = calculateInitialTracking(
    {
      organizationId,
      domain: 'warranty',
      entityType: 'warranty_claim',
      entityId: claimId,
      configurationId: configId,
      userId,
    },
    configForCalc,
    businessHours,
    holidayDates
  );

  // Create tracking record and event (atomic)
  const [tracking] = await exec.insert(slaTracking).values(initialValues).returning();
  await exec.insert(slaEvents).values({
    organizationId,
    slaTrackingId: tracking.id,
    eventType: 'started',
    eventData: buildStartedEventData(toSlaTracking(tracking)),
    triggeredByUserId: userId,
  });

  return tracking;
}

function buildQuickFilterCondition(
  quickFilter: WarrantyClaimQuickFilterValue | undefined
) {
  if (quickFilter === 'submitted') {
    return eq(warrantyClaims.status, 'submitted');
  }
  if (quickFilter === 'awaiting_decision') {
    return or(
      eq(warrantyClaims.status, 'submitted'),
      eq(warrantyClaims.status, 'under_review')
    );
  }
  if (quickFilter === 'at_risk_sla') {
    return buildClaimAtRiskOrBreachedCondition();
  }
  return undefined;
}

// ============================================================================
// CREATE WARRANTY CLAIM
// ============================================================================

/**
 * Submit a new warranty claim
 * - Generates unique claim number
 * - Creates SLA tracking entry
 * - Triggers notification event
 */
export const createWarrantyClaim = createServerFn({ method: 'POST' })
  .inputValidator(createWarrantyClaimSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<WarrantyClaim & { notificationQueued: boolean }>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.create });
    const logger = createActivityLoggerWithContext(ctx);

    // Get warranty with related data
    const [warranty] = await db
      .select({
        warranty: warranties,
        customer: customers,
        product: products,
        policy: warrantyPolicies,
        ownerRecord: {
          id: warrantyOwnerRecords.id,
          fullName: warrantyOwnerRecords.fullName,
          email: warrantyOwnerRecords.email,
          phone: warrantyOwnerRecords.phone,
        },
      })
      .from(warranties)
      .innerJoin(customers, eq(warranties.customerId, customers.id))
      .innerJoin(products, eq(warranties.productId, products.id))
      .innerJoin(warrantyPolicies, eq(warranties.warrantyPolicyId, warrantyPolicies.id))
      .leftJoin(warrantyOwnerRecords, eq(warranties.ownerRecordId, warrantyOwnerRecords.id))
      .where(
        and(eq(warranties.id, data.warrantyId), eq(warranties.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!warranty) {
      throw new NotFoundError('Warranty not found', 'warranty');
    }

    // Check warranty is active
    // Business Rule: Only active or expiring_soon warranties can have claims filed.
    // Transferred warranties are considered inactive and cannot have new claims.
    // Voided warranties cannot have claims.
    // Expired warranties cannot have claims (unless expiring_soon).
    if (warranty.warranty.status !== 'active' && warranty.warranty.status !== 'expiring_soon') {
      throw new ValidationError(`Cannot submit claim for warranty with status: ${warranty.warranty.status}`);
    }

    // Generate claim number
    const claimNumber = await generateClaimNumber(ctx.organizationId);
    const now = new Date();
    const claimantSelection = resolveClaimantForCreate({
      commercialCustomer: warranty.customer,
      ownerRecord: warranty.ownerRecord?.id ? warranty.ownerRecord : null,
      input: data,
    });
    const claimantDisplayName = deriveClaimantDisplayName({
      role: claimantSelection.claimantRole,
      commercialCustomer: warranty.customer,
      claimantCustomer:
        claimantSelection.claimantRole === 'channel_partner'
          ? warranty.customer
          : null,
      claimantSnapshot: claimantSelection.claimantSnapshot,
    });

    // Get SLA configuration for warranty claims
    const slaConfig = await getWarrantySlaConfig(ctx.organizationId);

    // Create claim and SLA tracking atomically
    const [claim] = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const [inserted] = await tx
        .insert(warrantyClaims)
        .values({
          organizationId: ctx.organizationId,
          claimNumber,
          warrantyId: data.warrantyId,
          customerId: warranty.warranty.customerId,
          claimantRole: claimantSelection.claimantRole,
          claimantCustomerId: claimantSelection.claimantCustomerId,
          claimantSnapshot: claimantSelection.claimantSnapshot,
          channelBypassReason: claimantSelection.channelBypassReason,
          claimType: data.claimType,
          description: data.description,
          status: 'submitted',
          cycleCountAtClaim: data.cycleCountAtClaim ?? warranty.warranty.currentCycleCount,
          notes: data.notes,
          submittedAt: now,
          slaTrackingId: null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      if (slaConfig) {
        const slaEntry = await startSlaTrackingForClaim(
          ctx.organizationId,
          ctx.user.id,
          inserted.id,
          slaConfig.id,
          tx as unknown as typeof db
        );
        const [updated] = await tx
          .update(warrantyClaims)
          .set({ slaTrackingId: slaEntry.id })
          .where(eq(warrantyClaims.id, inserted.id))
          .returning();
        return [updated!];
      }

      return [inserted];
    });

    const commercialCustomerEmail = warranty.customer.email ?? undefined;
    const claimantEmail =
      claimantSelection.claimantRole === 'channel_partner'
        ? commercialCustomerEmail
        : claimantSelection.claimantSnapshot?.email ?? undefined;

    if (warranty.warranty.productSerial) {
      const serializedItem = await findSerializedItemBySerial(
        db,
        ctx.organizationId,
        normalizeSerial(warranty.warranty.productSerial),
        {
          userId: ctx.user.id,
          productId: warranty.warranty.productId,
          source: 'warranty_claim_submit',
        }
      );
      if (serializedItem) {
        await addSerializedItemEvent(db, {
          organizationId: ctx.organizationId,
          serializedItemId: serializedItem.id,
          eventType: 'warranty_claimed',
          entityType: 'warranty_claim',
          entityId: claim.id,
          notes: `Warranty claim submitted: ${claim.claimNumber}`,
          userId: ctx.user.id,
        });
      }
    }

    // Trigger notification event
    const payload: WarrantyClaimSubmittedPayload = {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      warrantyId: warranty.warranty.id,
      warrantyNumber: warranty.warranty.warrantyNumber,
      organizationId: ctx.organizationId,
      customerId: warranty.warranty.customerId,
      customerEmail: commercialCustomerEmail,
      customerName: warranty.customer.name ?? 'Unknown Customer',
      claimantRole: claimantSelection.claimantRole,
      claimantCustomerId: claimantSelection.claimantCustomerId ?? undefined,
      claimantName: claimantDisplayName ?? undefined,
      claimantEmail,
      channelBypassReason: claimantSelection.channelBypassReason ?? undefined,
      productId: warranty.product.id,
      productName: warranty.product.name ?? 'Unknown Product',
      claimType: data.claimType,
      description: data.description,
      submittedAt: now.toISOString(),
    };

    let notificationQueued = true;
    try {
      await client.sendEvent({
        name: warrantyEvents.claimSubmitted,
        payload,
      });
    } catch (error) {
      warrantyLogger.error('Failed to queue warranty claim notification', error, {
        claimId: claim.id,
        claimNumber: claim.claimNumber,
      });
      notificationQueued = false;
    }

    // Log claim creation
    logger.logAsync({
      entityType: 'warranty_claim',
      entityId: claim.id,
      action: 'created',
      description: `Created warranty claim: ${claimNumber}`,
      changes: computeChanges({
        before: null,
        after: claim,
        excludeFields: excludeFieldsForActivity<WarrantyClaim>(WARRANTY_CLAIM_EXCLUDED_FIELDS),
      }),
      metadata: buildClaimActivityMetadata({
        claim,
        commercialCustomer: warranty.customer,
        claimantCustomer:
          claimantSelection.claimantRole === 'channel_partner' ? warranty.customer : null,
        claimantName: claimantDisplayName ?? null,
        extra: {
          claimId: claim.id,
          claimNumber,
          warrantyId: warranty.warranty.id,
          warrantyNumber: warranty.warranty.warrantyNumber,
          claimType: data.claimType,
          claimStatus: 'submitted',
          productId: warranty.product.id,
          productName: warranty.product.name ?? undefined,
        },
      }),
    });

    return serializedMutationSuccess(
      { ...claim, notificationQueued },
      notificationQueued
        ? `Warranty claim ${claim.claimNumber} submitted.`
        : `Warranty claim ${claim.claimNumber} submitted, but notification failed.`,
      {
        affectedIds: [claim.id],
        partialFailure: notificationQueued
          ? undefined
          : {
              code: 'notification_failed',
              message: 'Claim was created successfully, but notification dispatch failed.',
            },
      }
    );
  });

// ============================================================================
// UPDATE CLAIM STATUS
// ============================================================================

/**
 * Update claim status with optional notes
 */
export const updateClaimStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateClaimStatusSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<WarrantyClaim>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);
    const transitionName = 'warranty_claim_status_update';
    const idempotencyKey = data.idempotencyKey?.trim();

    const [existingClaim] = await db
      .select()
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.id, data.claimId),
          eq(warrantyClaims.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existingClaim) {
      throw new NotFoundError('Warranty claim not found', 'warrantyClaim');
    }

    if (idempotencyKey) {
      const replayed = await hasProcessedIdempotencyKey(db, {
        organizationId: ctx.organizationId,
        entityType: 'warranty_claim',
        entityId: existingClaim.id,
        action: 'updated',
        idempotencyKey,
      });
      if (replayed) {
        return serializedMutationSuccess(
          existingClaim,
          `Idempotent replay ignored. Claim remains in ${existingClaim.status} status.`,
          {
            affectedIds: [existingClaim.id],
            transition: {
              transition: transitionName,
              fromStatus: existingClaim.status,
              toStatus: existingClaim.status,
              blockedBy: 'idempotency_key_replay',
            },
          }
        );
      }
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      submitted: ['under_review', 'approved', 'denied'],
      under_review: ['approved', 'denied', 'submitted'],
      approved: ['resolved', 'under_review'],
      denied: ['under_review'], // Can be reopened for review
      cancelled: ['submitted'], // Can be reopened
      resolved: [], // Final state
    };

    const currentStatus = existingClaim.status;
    if (!validTransitions[currentStatus]?.includes(data.status)) {
      throw new ValidationError(`Invalid status transition from '${currentStatus}' to '${data.status}'`, {
        code: ['transition_blocked'],
      });
    }

    // Update SLA tracking if status implies waiting (pause) or resuming
    if (existingClaim.slaTrackingId) {
      if (data.status === 'under_review' && existingClaim.status === 'submitted') {
        // Record response time
        await db
          .update(slaTracking)
          .set({
            respondedAt: new Date(),
            status: 'responded',
          })
          .where(eq(slaTracking.id, existingClaim.slaTrackingId));
      }
    }

    // Build notes
    const updatedNotes = data.notes
      ? existingClaim.notes
        ? `${existingClaim.notes}\n\n[${new Date().toISOString()}] Status changed to ${data.status}: ${data.notes}`
        : `[${new Date().toISOString()}] Status changed to ${data.status}: ${data.notes}`
      : existingClaim.notes;

    const [claim] = await db
      .update(warrantyClaims)
      .set({
        status: data.status,
        notes: updatedNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(warrantyClaims.id, data.claimId))
      .returning();

    // Log status update (request_info when under_review + notes from approval dialog)
    const isRequestInfo = data.status === 'under_review' && !!data.notes?.trim();
    logger.logAsync({
      entityType: 'warranty_claim',
      entityId: claim.id,
      action: 'updated',
      description: isRequestInfo
        ? `Requested more info: ${claim.claimNumber}`
        : `Updated warranty claim status: ${claim.claimNumber}`,
      changes: {
        before: { status: currentStatus },
        after: { status: data.status },
        fields: ['status'],
      },
      metadata: buildClaimActivityMetadata({
        claim: existingClaim,
        commercialCustomer: { id: existingClaim.customerId, name: null },
        extra: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          warrantyId: claim.warrantyId,
          previousStatus: currentStatus,
          newStatus: data.status,
          claimStatus: data.status,
          idempotencyKey: data.idempotencyKey ?? undefined,
          requestInfoRequest: isRequestInfo,
        },
      }),
    });

    const message = isRequestInfo
      ? `Requested more info for claim ${claim.claimNumber}.`
      : `Claim status updated to ${claim.status}.`;
    return serializedMutationSuccess(claim, message, {
      affectedIds: [claim.id],
      transition: {
        transition: transitionName,
        fromStatus: currentStatus,
        toStatus: data.status,
      },
    });
  });

// ============================================================================
// APPROVE CLAIM
// ============================================================================

/**
 * Approve a warranty claim
 * Sets status to 'approved' and records approver
 */
export const approveClaim = createServerFn({ method: 'POST' })
  .inputValidator(approveClaimSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<WarrantyClaim>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.approve });
    const logger = createActivityLoggerWithContext(ctx);

    const [existingClaim] = await db
      .select()
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.id, data.claimId),
          eq(warrantyClaims.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existingClaim) {
      throw new NotFoundError('Warranty claim not found', 'warrantyClaim');
    }

    if (existingClaim.status !== 'submitted' && existingClaim.status !== 'under_review') {
      throw new ValidationError(`Cannot approve claim with status: ${existingClaim.status}`);
    }

    // Check SLA breach status
    let slaBreached = false;
    if (existingClaim.slaTrackingId) {
      const [slaEntry] = await db
        .select()
        .from(slaTracking)
        .where(eq(slaTracking.id, existingClaim.slaTrackingId))
        .limit(1);

      if (slaEntry) {
        slaBreached = slaEntry.responseBreached || slaEntry.resolutionBreached;
      }
    }

    const updatedNotes = data.notes
      ? existingClaim.notes
        ? `${existingClaim.notes}\n\n[${new Date().toISOString()}] Approved by ${ctx.user.name || ctx.user.email}${slaBreached ? ' (SLA breached)' : ''}: ${data.notes}`
        : `[${new Date().toISOString()}] Approved by ${ctx.user.name || ctx.user.email}${slaBreached ? ' (SLA breached)' : ''}: ${data.notes}`
      : existingClaim.notes;

    const [claim] = await db
      .update(warrantyClaims)
      .set({
        status: 'approved',
        approvedByUserId: ctx.user.id,
        approvedAt: new Date(),
        notes: updatedNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(warrantyClaims.id, data.claimId))
      .returning();

    // Log claim approval
    logger.logAsync({
      entityType: 'warranty_claim',
      entityId: claim.id,
      action: 'updated',
      description: `Approved warranty claim: ${claim.claimNumber}`,
      changes: {
        before: { status: existingClaim.status },
        after: { status: 'approved' },
        fields: ['status', 'approvedByUserId', 'approvedAt'],
      },
      metadata: buildClaimActivityMetadata({
        claim: existingClaim,
        commercialCustomer: { id: existingClaim.customerId, name: null },
        extra: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          warrantyId: claim.warrantyId,
          previousStatus: existingClaim.status,
          newStatus: 'approved',
          claimStatus: 'approved',
        },
        customFields: {
          slaBreached,
        },
      }),
    });

    return serializedMutationSuccess(claim, `Claim ${claim.claimNumber} approved.`, {
      affectedIds: [claim.id],
    });
  });

// ============================================================================
// DENY CLAIM
// ============================================================================

/**
 * Deny a warranty claim
 * Sets status to 'denied' and records reason
 */
export const denyClaim = createServerFn({ method: 'POST' })
  .inputValidator(denyClaimSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<WarrantyClaim>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.approve });
    const logger = createActivityLoggerWithContext(ctx);

    const [existingClaim] = await db
      .select()
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.id, data.claimId),
          eq(warrantyClaims.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existingClaim) {
      throw new NotFoundError('Warranty claim not found', 'warrantyClaim');
    }

    if (existingClaim.status !== 'submitted' && existingClaim.status !== 'under_review') {
      throw new ValidationError(`Cannot deny claim with status: ${existingClaim.status}`);
    }

    const now = new Date();
    const updatedNotes = data.notes
      ? existingClaim.notes
        ? `${existingClaim.notes}\n\n[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}\nNotes: ${data.notes}`
        : `[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}\nNotes: ${data.notes}`
      : existingClaim.notes
        ? `${existingClaim.notes}\n\n[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}`
        : `[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}`;

    const [claim] = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      if (existingClaim.slaTrackingId) {
        const [currentTracking] = await tx
          .select()
          .from(slaTracking)
          .where(eq(slaTracking.id, existingClaim.slaTrackingId))
          .limit(1);

        if (currentTracking) {
          const resolutionUpdate = calculateResolutionUpdate(toSlaTracking(currentTracking), now);
          await tx
            .update(slaTracking)
            .set(resolutionUpdate)
            .where(eq(slaTracking.id, existingClaim.slaTrackingId));
          const updatedTracking = { ...currentTracking, ...resolutionUpdate };
          await tx.insert(slaEvents).values({
            organizationId: ctx.organizationId,
            slaTrackingId: existingClaim.slaTrackingId,
            eventType: 'resolved',
            eventData: buildResolvedEventData(toSlaTracking(updatedTracking), now),
            triggeredByUserId: ctx.user.id,
          });
        }
      }

      return await tx
        .update(warrantyClaims)
        .set({
          status: 'denied',
          denialReason: data.denialReason,
          notes: updatedNotes,
          updatedBy: ctx.user.id,
        })
        .where(eq(warrantyClaims.id, data.claimId))
        .returning();
    });

    // Log claim denial
    logger.logAsync({
      entityType: 'warranty_claim',
      entityId: claim.id,
      action: 'updated',
      description: `Denied warranty claim: ${claim.claimNumber}`,
      changes: {
        before: { status: existingClaim.status },
        after: { status: 'denied', denialReason: data.denialReason },
        fields: ['status', 'denialReason'],
      },
      metadata: buildClaimActivityMetadata({
        claim: existingClaim,
        commercialCustomer: { id: existingClaim.customerId, name: null },
        extra: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          warrantyId: claim.warrantyId,
          previousStatus: existingClaim.status,
          newStatus: 'denied',
          claimStatus: 'denied',
          denialReason: data.denialReason,
        },
      }),
    });

    return serializedMutationSuccess(claim, `Claim ${claim.claimNumber} denied.`, {
      affectedIds: [claim.id],
    });
  });

// ============================================================================
// RESOLVE CLAIM
// ============================================================================

/**
 * Resolve a warranty claim
 * Sets status to 'resolved' with resolution type and details
 * Can extend warranty if resolution type is 'warranty_extension'
 */
export const resolveClaim = createServerFn({ method: 'POST' })
  .inputValidator(resolveClaimSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<WarrantyClaim & { notificationQueued: boolean }>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.resolve });
    const logger = createActivityLoggerWithContext(ctx);

    const [existingClaim] = await db
      .select({
        claim: warrantyClaims,
        warranty: warranties,
        customer: customers,
        product: products,
      })
      .from(warrantyClaims)
      .innerJoin(warranties, eq(warrantyClaims.warrantyId, warranties.id))
      .innerJoin(customers, eq(warrantyClaims.customerId, customers.id))
      .innerJoin(products, eq(warranties.productId, products.id))
      .where(
        and(
          eq(warrantyClaims.id, data.claimId),
          eq(warrantyClaims.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existingClaim) {
      throw new NotFoundError('Warranty claim not found', 'warrantyClaim');
    }

    if (existingClaim.claim.status !== 'approved') {
      throw new ValidationError(
        `Cannot resolve claim with status: ${existingClaim.claim.status}. Must be approved first.`
      );
    }

    const now = new Date();
    const updatedNotes = data.resolutionNotes
      ? existingClaim.claim.notes
        ? `${existingClaim.claim.notes}\n\n[${now.toISOString()}] Resolved by ${ctx.user.name || ctx.user.email} - ${data.resolutionType}: ${data.resolutionNotes}`
        : `[${now.toISOString()}] Resolved by ${ctx.user.name || ctx.user.email} - ${data.resolutionType}: ${data.resolutionNotes}`
      : existingClaim.claim.notes;

    const [claim] = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      if (existingClaim.claim.slaTrackingId) {
        const [currentTracking] = await tx
          .select()
          .from(slaTracking)
          .where(eq(slaTracking.id, existingClaim.claim.slaTrackingId))
          .limit(1);

        if (currentTracking) {
          const resolutionUpdate = calculateResolutionUpdate(toSlaTracking(currentTracking), now);
          await tx
            .update(slaTracking)
            .set(resolutionUpdate)
            .where(eq(slaTracking.id, existingClaim.claim.slaTrackingId));
          const updatedTracking = { ...currentTracking, ...resolutionUpdate };
          await tx.insert(slaEvents).values({
            organizationId: ctx.organizationId,
            slaTrackingId: existingClaim.claim.slaTrackingId,
            eventType: 'resolved',
            eventData: buildResolvedEventData(toSlaTracking(updatedTracking), now),
            triggeredByUserId: ctx.user.id,
          });
        }
      }

      if (data.resolutionType === 'warranty_extension' && data.extensionMonths && data.extensionMonths > 0) {
        const currentExpiry = new Date(existingClaim.warranty.expiryDate);
        currentExpiry.setMonth(currentExpiry.getMonth() + data.extensionMonths);
        await tx
          .update(warranties)
          .set({
            expiryDate: currentExpiry,
            status:
              existingClaim.warranty.status === 'expiring_soon'
                ? 'active'
                : existingClaim.warranty.status,
          })
          .where(eq(warranties.id, existingClaim.warranty.id));
      }

      const [updated] = await tx
        .update(warrantyClaims)
        .set({
          status: 'resolved',
          resolutionType: data.resolutionType,
          resolutionNotes: data.resolutionNotes,
          cost: data.cost ?? null,
          resolvedAt: now,
          notes: updatedNotes,
          updatedBy: ctx.user.id,
        })
        .where(eq(warrantyClaims.id, data.claimId))
        .returning();
      return [updated!];
    });

    const resolvedClaimantRole = getClaimantRole(existingClaim.claim.claimantRole);
    const claimantName =
      existingClaim.claim.claimantSnapshot?.fullName ??
      (resolvedClaimantRole === 'channel_partner' ? existingClaim.customer.name : null);
    const commercialCustomerEmail = existingClaim.customer.email ?? undefined;
    const claimantEmail =
      resolvedClaimantRole === 'channel_partner'
        ? commercialCustomerEmail
        : existingClaim.claim.claimantSnapshot?.email ?? undefined;

    // Trigger notification event
    const payload: WarrantyClaimResolvedPayload = {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      warrantyId: existingClaim.warranty.id,
      warrantyNumber: existingClaim.warranty.warrantyNumber,
      organizationId: ctx.organizationId,
      customerId: existingClaim.warranty.customerId,
      customerEmail: commercialCustomerEmail,
      customerName: existingClaim.customer.name ?? 'Unknown Customer',
      claimantRole: resolvedClaimantRole,
      claimantCustomerId:
        existingClaim.claim.claimantCustomerId ??
        (resolvedClaimantRole === 'channel_partner' ? existingClaim.claim.customerId : undefined),
      claimantName: claimantName ?? undefined,
      claimantEmail,
      channelBypassReason: existingClaim.claim.channelBypassReason ?? undefined,
      resolution: data.resolutionNotes ?? 'Resolved',
      resolutionType: data.resolutionType,
      resolvedAt: now.toISOString(),
      resolutionNotes: data.resolutionNotes,
    };

    let notificationQueued = true;
    try {
      await client.sendEvent({
        name: warrantyEvents.claimResolved,
        payload,
      });
    } catch (error) {
      warrantyLogger.error('Failed to queue warranty claim resolution notification', error, {
        claimId: claim.id,
        claimNumber: claim.claimNumber,
      });
      notificationQueued = false;
    }

    // Log claim resolution
    logger.logAsync({
      entityType: 'warranty_claim',
      entityId: claim.id,
      action: 'updated',
      description: `Resolved warranty claim: ${claim.claimNumber}`,
      changes: {
        before: { status: existingClaim.claim.status },
        after: { status: 'resolved', resolutionType: data.resolutionType },
        fields: ['status', 'resolutionType', 'resolutionNotes', 'resolvedAt'],
      },
      metadata: buildClaimActivityMetadata({
        claim: existingClaim.claim,
        commercialCustomer: existingClaim.customer,
        claimantName,
        extra: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          warrantyId: existingClaim.warranty.id,
          warrantyNumber: existingClaim.warranty.warrantyNumber,
          previousStatus: existingClaim.claim.status,
          newStatus: 'resolved',
          claimStatus: 'resolved',
          resolutionType: data.resolutionType,
          productId: existingClaim.product.id,
          productName: existingClaim.product.name ?? undefined,
        },
        customFields: {
          cost: data.cost ?? null,
          extensionMonths: data.extensionMonths ?? null,
        },
      }),
    });

    return serializedMutationSuccess(
      { ...claim, notificationQueued },
      notificationQueued
        ? `Claim ${claim.claimNumber} resolved.`
        : `Claim ${claim.claimNumber} resolved, but notification failed.`,
      {
        affectedIds: [claim.id],
        partialFailure: notificationQueued
          ? undefined
          : {
              code: 'notification_failed',
              message: 'Claim resolution succeeded, but notification dispatch failed.',
            },
      }
    );
  });

// ============================================================================
// LIST WARRANTY CLAIMS
// ============================================================================

/**
 * List warranty claims with filters and pagination
 */
export const listWarrantyClaims = createServerFn({ method: 'GET' })
  .inputValidator(listWarrantyClaimsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });

    // Build conditions
    const conditions = [eq(warrantyClaims.organizationId, ctx.organizationId)];

    if (data.warrantyId) {
      conditions.push(eq(warrantyClaims.warrantyId, data.warrantyId));
    }

    if (data.customerId) {
      conditions.push(eq(warrantyClaims.customerId, data.customerId));
    }

    if (data.claimantRole) {
      conditions.push(eq(warrantyClaims.claimantRole, data.claimantRole));
    }

    if (data.claimantCustomerId) {
      conditions.push(eq(warrantyClaims.claimantCustomerId, data.claimantCustomerId));
    }

    const claimantModeCondition = buildClaimantModeCondition(data.claimantMode);
    if (claimantModeCondition) {
      conditions.push(claimantModeCondition);
    }

    if (data.status) {
      conditions.push(eq(warrantyClaims.status, data.status));
    }

    if (data.claimType) {
      conditions.push(eq(warrantyClaims.claimType, data.claimType));
    }

    if (data.assignedUserId) {
      conditions.push(eq(warrantyClaims.assignedUserId, data.assignedUserId));
    }

    const quickFilterCondition = buildQuickFilterCondition(data.quickFilter);
    if (quickFilterCondition) {
      conditions.push(quickFilterCondition);
    }

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(warrantyClaims)
      .leftJoin(slaTracking, eq(warrantyClaims.slaTrackingId, slaTracking.id))
      .where(and(...conditions));

    const total = countResult?.total ?? 0;

    // Build order by
    const orderColumn =
      data.sortBy === 'claimNumber'
        ? warrantyClaims.claimNumber
        : data.sortBy === 'status'
          ? warrantyClaims.status
          : data.sortBy === 'claimType'
            ? warrantyClaims.claimType
            : warrantyClaims.submittedAt;

    const orderDirection = data.sortOrder === 'asc' ? asc : desc;

    // Get claims with related data
    const claims = await db
      .select({
        claim: warrantyClaims,
        warranty: {
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
          productSerial: warranties.productSerial,
        },
        customer: {
          id: customers.id,
          name: customers.name,
        },
        product: {
          id: products.id,
          name: products.name,
        },
        assignedUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        sla: slaTracking,
      })
      .from(warrantyClaims)
      .innerJoin(warranties, eq(warrantyClaims.warrantyId, warranties.id))
      .innerJoin(customers, eq(warrantyClaims.customerId, customers.id))
      .innerJoin(products, eq(warranties.productId, products.id))
      .leftJoin(users, eq(warrantyClaims.assignedUserId, users.id))
      .leftJoin(slaTracking, eq(warrantyClaims.slaTrackingId, slaTracking.id))
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn))
      .limit(data.pageSize)
      .offset((data.page - 1) * data.pageSize); // OFFSET pagination; consider cursor-based for >10k rows

    const claimantCustomerMap = await loadCustomerMap(
      ctx.organizationId,
      claims.map((row) => row.claim.claimantCustomerId)
    );

    return {
      items: claims.map((row) => ({
        ...row.claim,
        productId: row.product.id,
        warranty: row.warranty,
        commercialCustomer: row.customer,
        customer: row.customer,
        claimant: buildClaimantView({
          claim: row.claim,
          commercialCustomer: row.customer,
          claimantCustomer: row.claim.claimantCustomerId
            ? claimantCustomerMap.get(row.claim.claimantCustomerId) ?? null
            : null,
        }),
        product: row.product,
        assignedUser: row.assignedUser?.id ? row.assignedUser : null,
        slaTracking: row.sla,
      })),
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        total,
        totalPages: Math.ceil(total / data.pageSize),
      },
    };
  });

export const getWarrantyClaimSummary = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ warrantyId: z.string().uuid() })))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });

    const [summary] = await db
      .select({
        totalClaims: count(),
        pendingClaims: sql<number>`count(
          CASE
            WHEN ${warrantyClaims.status} IN ('submitted', 'under_review') THEN 1
          END
        )::int`,
      })
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.organizationId, ctx.organizationId),
          eq(warrantyClaims.warrantyId, data.warrantyId)
        )
      );

    return {
      totalClaims: summary?.totalClaims ?? 0,
      pendingClaims: summary?.pendingClaims ?? 0,
    };
  });

/**
 * List warranty claims with cursor pagination (recommended for large datasets >10k rows)
 */
const listWarrantyClaimsCursorSchema = normalizeObjectInput(
  cursorPaginationSchema.extend({
    warrantyId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    claimantRole: listWarrantyClaimsBaseSchema.shape.claimantRole.optional(),
    claimantMode: listWarrantyClaimsBaseSchema.shape.claimantMode.optional(),
    claimantCustomerId: z.string().uuid().optional(),
    status: listWarrantyClaimsBaseSchema.shape.status.optional(),
    claimType: listWarrantyClaimsBaseSchema.shape.claimType.optional(),
    quickFilter: listWarrantyClaimsBaseSchema.shape.quickFilter.optional(),
    assignedUserId: z.string().uuid().optional(),
  })
);

export const listWarrantyClaimsCursor = createServerFn({ method: 'GET' })
  .inputValidator(listWarrantyClaimsCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });

    const conditions = [eq(warrantyClaims.organizationId, ctx.organizationId)];
    if (data.warrantyId) conditions.push(eq(warrantyClaims.warrantyId, data.warrantyId));
    if (data.customerId) conditions.push(eq(warrantyClaims.customerId, data.customerId));
    if (data.claimantRole) conditions.push(eq(warrantyClaims.claimantRole, data.claimantRole));
    if (data.claimantCustomerId) {
      conditions.push(eq(warrantyClaims.claimantCustomerId, data.claimantCustomerId));
    }
    if (data.status) conditions.push(eq(warrantyClaims.status, data.status));
    if (data.claimType) conditions.push(eq(warrantyClaims.claimType, data.claimType));
    if (data.assignedUserId) conditions.push(eq(warrantyClaims.assignedUserId, data.assignedUserId));
    const quickFilterCondition = buildQuickFilterCondition(data.quickFilter);
    if (quickFilterCondition) conditions.push(quickFilterCondition);
    const claimantModeCondition = buildClaimantModeCondition(data.claimantMode);
    if (claimantModeCondition) conditions.push(claimantModeCondition);

    if (data.cursor) {
      const cursorPosition = decodeCursor(data.cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(
            warrantyClaims.createdAt,
            warrantyClaims.id,
            cursorPosition,
            data.sortOrder
          )
        );
      }
    }

    const orderDirection = data.sortOrder === 'asc' ? asc : desc;
    const pageSize = data.pageSize;

    const results = await db
      .select({
        claim: warrantyClaims,
        warranty: {
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
          productSerial: warranties.productSerial,
        },
        customer: { id: customers.id, name: customers.name },
        product: { id: products.id, name: products.name },
        assignedUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(warrantyClaims)
      .innerJoin(warranties, eq(warrantyClaims.warrantyId, warranties.id))
      .innerJoin(customers, eq(warrantyClaims.customerId, customers.id))
      .innerJoin(products, eq(warranties.productId, products.id))
      .leftJoin(users, eq(warrantyClaims.assignedUserId, users.id))
      .leftJoin(slaTracking, eq(warrantyClaims.slaTrackingId, slaTracking.id))
      .where(and(...conditions))
      .orderBy(orderDirection(warrantyClaims.createdAt), orderDirection(warrantyClaims.id))
      .limit(pageSize + 1);

    const claimantCustomerMap = await loadCustomerMap(
      ctx.organizationId,
      results.map((row) => row.claim.claimantCustomerId)
    );

    const response = buildStandardCursorResponse(
      results.map((r) => r.claim),
      pageSize
    );
    const items = results.slice(0, pageSize).map((row) => ({
      ...row.claim,
      productId: row.product.id,
      warranty: row.warranty,
      commercialCustomer: row.customer,
      customer: row.customer,
      claimant: buildClaimantView({
        claim: row.claim,
        commercialCustomer: row.customer,
        claimantCustomer: row.claim.claimantCustomerId
          ? claimantCustomerMap.get(row.claim.claimantCustomerId) ?? null
          : null,
      }),
      product: row.product,
      assignedUser: row.assignedUser?.id ? row.assignedUser : null,
    }));
    return {
      items,
      nextCursor: response.nextCursor,
      hasNextPage: response.hasNextPage,
    };
  });

// ============================================================================
// GET WARRANTY CLAIM
// ============================================================================

/**
 * Cached warranty claim fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getWarrantyClaimCached = cache(async (claimId: string, organizationId: string) => {
  const [result] = await db
    .select({
      claim: warrantyClaims,
      warranty: warranties,
      customer: customers,
      product: products,
      policy: warrantyPolicies,
      ownerRecord: {
        id: warrantyOwnerRecords.id,
        fullName: warrantyOwnerRecords.fullName,
        email: warrantyOwnerRecords.email,
        phone: warrantyOwnerRecords.phone,
        address: warrantyOwnerRecords.address,
        notes: warrantyOwnerRecords.notes,
      },
      assignedUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      sla: slaTracking,
    })
    .from(warrantyClaims)
    .innerJoin(warranties, eq(warrantyClaims.warrantyId, warranties.id))
    .innerJoin(customers, eq(warrantyClaims.customerId, customers.id))
    .innerJoin(products, eq(warranties.productId, products.id))
    .innerJoin(warrantyPolicies, eq(warranties.warrantyPolicyId, warrantyPolicies.id))
    .leftJoin(warrantyOwnerRecords, eq(warranties.ownerRecordId, warrantyOwnerRecords.id))
    .leftJoin(users, eq(warrantyClaims.assignedUserId, users.id))
    .leftJoin(slaTracking, eq(warrantyClaims.slaTrackingId, slaTracking.id))
    .where(
      and(
        eq(warrantyClaims.id, claimId),
        eq(warrantyClaims.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!result) return null;

  const claimantCustomerMap = await loadCustomerMap(organizationId, [
    result.claim.claimantCustomerId,
  ]);
  const claimantCustomer = result.claim.claimantCustomerId
    ? claimantCustomerMap.get(result.claim.claimantCustomerId) ?? null
    : null;

  let approvedByUser = null;
  if (result.claim.approvedByUserId) {
    const [approver] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, result.claim.approvedByUserId))
      .limit(1);

    approvedByUser = approver ?? null;
  }

  const serviceContext = await getServiceContextForWarranty(organizationId, result.warranty.id);

  return {
    ...result.claim,
    warranty: result.warranty,
    commercialCustomer: result.customer,
    customer: result.customer,
    claimant: buildClaimantView({
      claim: result.claim,
      commercialCustomer: result.customer,
      claimantCustomer,
    }),
    ownerRecord: result.ownerRecord?.id ? result.ownerRecord : null,
    product: result.product,
    policy: result.policy,
    assignedUser: result.assignedUser?.id ? result.assignedUser : null,
    approvedByUser,
    slaTracking: result.sla,
    serviceSystem: serviceContext.serviceSystem,
    currentOwner: serviceContext.currentOwner,
  };
});

/**
 * Get a single warranty claim with full details
 */
export const getWarrantyClaim = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyClaimSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const result = await _getWarrantyClaimCached(data.claimId, ctx.organizationId);
    if (!result) {
      setResponseStatus(404);
      throw new NotFoundError('Warranty claim not found', 'warrantyClaim');
    }
    return result;
  });

// ============================================================================
// ASSIGN CLAIM
// ============================================================================

/**
 * Assign a warranty claim to a user for processing
 */
export const assignClaim = createServerFn({ method: 'POST' })
  .inputValidator(assignClaimSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.assign });
    const logger = createActivityLoggerWithContext(ctx);

    const [existingClaim] = await db
      .select()
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.id, data.claimId),
          eq(warrantyClaims.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existingClaim) {
      throw new NotFoundError('Warranty claim not found', 'warrantyClaim');
    }

    // Validate assigned user exists in org if not null
    if (data.assignedUserId) {
      const [assignedUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, data.assignedUserId), eq(users.organizationId, ctx.organizationId)))
        .limit(1);

      if (!assignedUser) {
        throw new NotFoundError('Assigned user not found in organization', 'user');
      }
    }

    const [claim] = await db
      .update(warrantyClaims)
      .set({
        assignedUserId: data.assignedUserId,
        updatedBy: ctx.user.id,
      })
      .where(eq(warrantyClaims.id, data.claimId))
      .returning();

    // Log claim assignment
    logger.logAsync({
      entityType: 'warranty_claim',
      entityId: claim.id,
      action: 'assigned',
      description: data.assignedUserId
        ? `Assigned warranty claim: ${claim.claimNumber}`
        : `Unassigned warranty claim: ${claim.claimNumber}`,
      changes: {
        before: { assignedUserId: existingClaim.assignedUserId },
        after: { assignedUserId: data.assignedUserId },
        fields: ['assignedUserId'],
      },
      metadata: buildClaimActivityMetadata({
        claim: existingClaim,
        commercialCustomer: { id: existingClaim.customerId, name: null },
        extra: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          warrantyId: claim.warrantyId,
          assignedTo: data.assignedUserId ?? undefined,
        },
      }),
    });

    return claim;
  });
