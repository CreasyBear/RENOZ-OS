/**
 * Warranty Claims Server Functions
 *
 * Handles warranty claim lifecycle: submission, status updates, approval,
 * denial, and resolution. Integrates with unified SLA engine.
 *
 * @see drizzle/schema/warranty-claims.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-006b
 */

import { eq, and, desc, asc, sql, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  warrantyClaims,
  warranties,
  warrantyPolicies,
  customers,
  products,
  users,
  slaTracking,
  slaConfigurations,
  slaEvents,
  businessHoursConfig,
  organizationHolidays,
} from 'drizzle/schema';
import {
  calculateInitialTracking,
  calculateResolutionUpdate,
  buildStartedEventData,
  buildResolvedEventData,
} from '@/lib/sla';
import type {
  SlaConfiguration,
  BusinessHoursConfig as BusinessHoursConfigType,
} from '@/lib/sla/types';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { typedGetFn, typedPostFn } from '@/lib/server/typed-server-fn';
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
  listWarrantyClaimsSchema,
  getWarrantyClaimSchema,
  assignClaimSchema,
} from '@/lib/schemas/warranty/claims';

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
        sql`${warrantyClaims.claimNumber} LIKE ${prefix + '%'}`
      )
    );

  let nextSequence = 1;
  if (result[0]?.maxNumber) {
    const currentSequence = parseInt(result[0].maxNumber.split('-')[2], 10);
    nextSequence = currentSequence + 1;
  }

  return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
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
  configId: string
) {
  // Get the SLA configuration
  const [config] = await db
    .select()
    .from(slaConfigurations)
    .where(eq(slaConfigurations.id, configId))
    .limit(1);

  if (!config) {
    throw new Error('SLA configuration not found');
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
        weeklySchedule: bh.weeklySchedule as BusinessHoursConfigType['weeklySchedule'],
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

  // Create tracking record
  const [tracking] = await db.insert(slaTracking).values(initialValues).returning();

  // Create SLA started event for audit trail
  await db.insert(slaEvents).values({
    organizationId,
    slaTrackingId: tracking.id,
    eventType: 'started',
    eventData: buildStartedEventData(tracking as any),
    triggeredByUserId: userId,
  });

  return tracking;
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
export const createWarrantyClaim = typedPostFn(
  createWarrantyClaimSchema,
  async ({ data }) => {
    const ctx = await withAuth();

    // Get warranty with related data
    const [warranty] = await db
      .select({
        warranty: warranties,
        customer: customers,
        product: products,
        policy: warrantyPolicies,
      })
      .from(warranties)
      .innerJoin(customers, eq(warranties.customerId, customers.id))
      .innerJoin(products, eq(warranties.productId, products.id))
      .innerJoin(warrantyPolicies, eq(warranties.warrantyPolicyId, warrantyPolicies.id))
      .where(
        and(eq(warranties.id, data.warrantyId), eq(warranties.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!warranty) {
      throw new Error('Warranty not found');
    }

    // Check warranty is active
    if (warranty.warranty.status !== 'active' && warranty.warranty.status !== 'expiring_soon') {
      throw new Error(`Cannot submit claim for warranty with status: ${warranty.warranty.status}`);
    }

    // Generate claim number
    const claimNumber = await generateClaimNumber(ctx.organizationId);
    const now = new Date();

    // Get SLA configuration for warranty claims
    const slaConfig = await getWarrantySlaConfig(ctx.organizationId);

    // Create the claim first (need ID for SLA tracking)
    let slaTrackingId: string | null = null;
    let responseDueAt: Date | null = null;
    let resolutionDueAt: Date | null = null;

    // Create the claim first
    const [claim] = await db
      .insert(warrantyClaims)
      .values({
        organizationId: ctx.organizationId,
        claimNumber,
        warrantyId: data.warrantyId,
        customerId: warranty.warranty.customerId,
        claimType: data.claimType,
        description: data.description,
        status: 'submitted',
        cycleCountAtClaim: data.cycleCountAtClaim ?? warranty.warranty.currentCycleCount,
        notes: data.notes,
        submittedAt: now,
        slaTrackingId: null, // Will be set after SLA tracking is created
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Create SLA tracking using unified engine (with proper business hours/holidays)
    if (slaConfig) {
      const slaEntry = await startSlaTrackingForClaim(
        ctx.organizationId,
        ctx.user.id,
        claim.id,
        slaConfig.id
      );
      slaTrackingId = slaEntry.id;
      responseDueAt = slaEntry.responseDueAt;
      resolutionDueAt = slaEntry.resolutionDueAt;

      // Update claim with SLA tracking ID
      await db.update(warrantyClaims).set({ slaTrackingId }).where(eq(warrantyClaims.id, claim.id));
    }

    // Get customer email for notification
    const customerEmail = warranty.customer.email ?? undefined;

    // Trigger notification event
    const payload: WarrantyClaimSubmittedPayload = {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      warrantyId: warranty.warranty.id,
      warrantyNumber: warranty.warranty.warrantyNumber,
      organizationId: ctx.organizationId,
      customerId: warranty.warranty.customerId,
      customerEmail,
      customerName: warranty.customer.name,
      productName: warranty.product.name,
      productSerial: warranty.warranty.productSerial ?? undefined,
      claimType: data.claimType,
      description: data.description,
      cycleCountAtClaim: claim.cycleCountAtClaim ?? undefined,
      submittedAt: now.toISOString(),
      slaResponseDueAt: responseDueAt?.toISOString(),
      slaResolutionDueAt: resolutionDueAt?.toISOString(),
    };

    await client.sendEvent({
      name: warrantyEvents.claimSubmitted,
      payload,
    });

    return claim;
  }
);

// ============================================================================
// UPDATE CLAIM STATUS
// ============================================================================

/**
 * Update claim status with optional notes
 */
export const updateClaimStatus = typedPostFn(
  updateClaimStatusSchema,
  async ({ data }) => {
    const ctx = await withAuth();

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
      throw new Error('Warranty claim not found');
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      submitted: ['under_review', 'approved', 'denied'],
      under_review: ['approved', 'denied', 'submitted'],
      approved: ['resolved', 'under_review'],
      denied: ['under_review'], // Can be reopened for review
      resolved: [], // Final state
    };

    const currentStatus = existingClaim.status;
    if (!validTransitions[currentStatus]?.includes(data.status)) {
      throw new Error(`Invalid status transition from '${currentStatus}' to '${data.status}'`);
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

    return claim;
  }
);

// ============================================================================
// APPROVE CLAIM
// ============================================================================

/**
 * Approve a warranty claim
 * Sets status to 'approved' and records approver
 */
export const approveClaim = typedPostFn(
  approveClaimSchema,
  async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.approve });

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
      throw new Error('Warranty claim not found');
    }

    if (existingClaim.status !== 'submitted' && existingClaim.status !== 'under_review') {
      throw new Error(`Cannot approve claim with status: ${existingClaim.status}`);
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

    return claim;
  }
);

// ============================================================================
// DENY CLAIM
// ============================================================================

/**
 * Deny a warranty claim
 * Sets status to 'denied' and records reason
 */
export const denyClaim = typedPostFn(
  denyClaimSchema,
  async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.approve });

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
      throw new Error('Warranty claim not found');
    }

    if (existingClaim.status !== 'submitted' && existingClaim.status !== 'under_review') {
      throw new Error(`Cannot deny claim with status: ${existingClaim.status}`);
    }

    // Update SLA tracking to resolved (even though denied) using unified engine
    const now = new Date();
    if (existingClaim.slaTrackingId) {
      // Get current tracking state
      const [currentTracking] = await db
        .select()
        .from(slaTracking)
        .where(eq(slaTracking.id, existingClaim.slaTrackingId))
        .limit(1);

      if (currentTracking) {
        // Calculate resolution update
        const resolutionUpdate = calculateResolutionUpdate(currentTracking as any, now);

        // Update tracking record
        await db
          .update(slaTracking)
          .set(resolutionUpdate)
          .where(eq(slaTracking.id, existingClaim.slaTrackingId));

        // Create resolved event for audit trail
        const updatedTracking = { ...currentTracking, ...resolutionUpdate };
        await db.insert(slaEvents).values({
          organizationId: ctx.organizationId,
          slaTrackingId: existingClaim.slaTrackingId,
          eventType: 'resolved',
          eventData: buildResolvedEventData(updatedTracking as any, now),
          triggeredByUserId: ctx.user.id,
        });
      }
    }

    const updatedNotes = data.notes
      ? existingClaim.notes
        ? `${existingClaim.notes}\n\n[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}\nNotes: ${data.notes}`
        : `[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}\nNotes: ${data.notes}`
      : existingClaim.notes
        ? `${existingClaim.notes}\n\n[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}`
        : `[${new Date().toISOString()}] Denied by ${ctx.user.name || ctx.user.email}: ${data.denialReason}`;

    const [claim] = await db
      .update(warrantyClaims)
      .set({
        status: 'denied',
        denialReason: data.denialReason,
        notes: updatedNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(warrantyClaims.id, data.claimId))
      .returning();

    return claim;
  }
);

// ============================================================================
// RESOLVE CLAIM
// ============================================================================

/**
 * Resolve a warranty claim
 * Sets status to 'resolved' with resolution type and details
 * Can extend warranty if resolution type is 'warranty_extension'
 */
export const resolveClaim = typedPostFn(
  resolveClaimSchema,
  async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.resolve });

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
      throw new Error('Warranty claim not found');
    }

    if (existingClaim.claim.status !== 'approved') {
      throw new Error(
        `Cannot resolve claim with status: ${existingClaim.claim.status}. Must be approved first.`
      );
    }

    const now = new Date();

    // Update SLA tracking with unified engine
    if (existingClaim.claim.slaTrackingId) {
      // Get current tracking state
      const [currentTracking] = await db
        .select()
        .from(slaTracking)
        .where(eq(slaTracking.id, existingClaim.claim.slaTrackingId))
        .limit(1);

      if (currentTracking) {
        // Calculate resolution update
        const resolutionUpdate = calculateResolutionUpdate(currentTracking as any, now);

        // Update tracking record
        await db
          .update(slaTracking)
          .set(resolutionUpdate)
          .where(eq(slaTracking.id, existingClaim.claim.slaTrackingId));

        // Create resolved event for audit trail
        const updatedTracking = { ...currentTracking, ...resolutionUpdate };
        await db.insert(slaEvents).values({
          organizationId: ctx.organizationId,
          slaTrackingId: existingClaim.claim.slaTrackingId,
          eventType: 'resolved',
          eventData: buildResolvedEventData(updatedTracking as any, now),
          triggeredByUserId: ctx.user.id,
        });
      }
    }

    // If resolution type is warranty_extension, extend the warranty
    if (data.resolutionType === 'warranty_extension') {
      if (data.extensionMonths && data.extensionMonths > 0) {
        const currentExpiry = new Date(existingClaim.warranty.expiryDate);
        currentExpiry.setMonth(currentExpiry.getMonth() + data.extensionMonths);

        await db
          .update(warranties)
          .set({
            expiryDate: currentExpiry,
            // Reset status if was expiring_soon
            status:
              existingClaim.warranty.status === 'expiring_soon'
                ? 'active'
                : existingClaim.warranty.status,
          })
          .where(eq(warranties.id, existingClaim.warranty.id));
      }
    }

    const updatedNotes = data.resolutionNotes
      ? existingClaim.claim.notes
        ? `${existingClaim.claim.notes}\n\n[${now.toISOString()}] Resolved by ${ctx.user.name || ctx.user.email} - ${data.resolutionType}: ${data.resolutionNotes}`
        : `[${now.toISOString()}] Resolved by ${ctx.user.name || ctx.user.email} - ${data.resolutionType}: ${data.resolutionNotes}`
      : existingClaim.claim.notes;

    const [claim] = await db
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

    // Get customer email for notification
    const customerEmail = existingClaim.customer.email ?? undefined;

    // Trigger notification event
    const payload: WarrantyClaimResolvedPayload = {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      warrantyId: existingClaim.warranty.id,
      warrantyNumber: existingClaim.warranty.warrantyNumber,
      organizationId: ctx.organizationId,
      customerId: existingClaim.warranty.customerId,
      customerEmail,
      customerName: existingClaim.customer.name,
      productName: existingClaim.product.name,
      claimType: claim.claimType,
      resolutionType: data.resolutionType,
      resolutionNotes: data.resolutionNotes,
      cost: data.cost,
      resolvedAt: now.toISOString(),
      resolvedByUserName: ctx.user.name ?? ctx.user.email,
    };

    await client.sendEvent({
      name: warrantyEvents.claimResolved,
      payload,
    });

    return claim;
  }
);

// ============================================================================
// LIST WARRANTY CLAIMS
// ============================================================================

/**
 * List warranty claims with filters and pagination
 */
export const listWarrantyClaims = typedGetFn(
  listWarrantyClaimsSchema,
  async ({ data }) => {
    const ctx = await withAuth();

    // Build conditions
    const conditions = [eq(warrantyClaims.organizationId, ctx.organizationId)];

    if (data.warrantyId) {
      conditions.push(eq(warrantyClaims.warrantyId, data.warrantyId));
    }

    if (data.customerId) {
      conditions.push(eq(warrantyClaims.customerId, data.customerId));
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

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(warrantyClaims)
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
      })
      .from(warrantyClaims)
      .innerJoin(warranties, eq(warrantyClaims.warrantyId, warranties.id))
      .innerJoin(customers, eq(warrantyClaims.customerId, customers.id))
      .innerJoin(products, eq(warranties.productId, products.id))
      .leftJoin(users, eq(warrantyClaims.assignedUserId, users.id))
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn))
      .limit(data.pageSize)
      .offset((data.page - 1) * data.pageSize);

    return {
      items: claims.map((row) => ({
        ...row.claim,
        warranty: row.warranty,
        customer: row.customer,
        product: row.product,
        assignedUser: row.assignedUser?.id ? row.assignedUser : null,
      })),
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        total,
        totalPages: Math.ceil(total / data.pageSize),
      },
    };
  }
);

// ============================================================================
// GET WARRANTY CLAIM
// ============================================================================

/**
 * Get a single warranty claim with full details
 */
export const getWarrantyClaim = typedGetFn(
  getWarrantyClaimSchema,
  async ({ data }) => {
    const ctx = await withAuth();

    const [result] = await db
      .select({
        claim: warrantyClaims,
        warranty: warranties,
        customer: customers,
        product: products,
        policy: warrantyPolicies,
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
      .leftJoin(users, eq(warrantyClaims.assignedUserId, users.id))
      .leftJoin(slaTracking, eq(warrantyClaims.slaTrackingId, slaTracking.id))
      .where(
        and(
          eq(warrantyClaims.id, data.claimId),
          eq(warrantyClaims.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!result) {
      throw new Error('Warranty claim not found');
    }

    // Get approver info if approved
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

    return {
      ...result.claim,
      warranty: result.warranty,
      customer: result.customer,
      product: result.product,
      policy: result.policy,
      assignedUser: result.assignedUser?.id ? result.assignedUser : null,
      approvedByUser,
      slaTracking: result.sla,
    };
  }
);

// ============================================================================
// ASSIGN CLAIM
// ============================================================================

/**
 * Assign a warranty claim to a user for processing
 */
export const assignClaim = typedPostFn(
  assignClaimSchema,
  async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.assign });

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
      throw new Error('Warranty claim not found');
    }

    // Validate assigned user exists in org if not null
    if (data.assignedUserId) {
      const [assignedUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, data.assignedUserId), eq(users.organizationId, ctx.organizationId)))
        .limit(1);

      if (!assignedUser) {
        throw new Error('Assigned user not found in organization');
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

    return claim;
  }
);
