/**
 * SLA Server Functions
 *
 * Server functions for SLA configuration management and tracking operations.
 * Implements the unified SLA engine for Support, Warranty, and Jobs domains.
 *
 * @see drizzle/schema/support/sla-configurations.ts
 * @see src/lib/sla for calculation and state management logic
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc, asc, count, avg, sql, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  slaConfigurations,
  slaTracking,
  slaEvents,
  businessHoursConfig,
  organizationHolidays,
  issues,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  createSlaConfigurationSchema,
  updateSlaConfigurationSchema,
  getSlaConfigurationsSchema,
  startSlaTrackingSchema,
  pauseSlaSchema,
  resumeSlaSchema,
  recordResponseSchema,
  recordResolutionSchema,
  getSlaTrackingByIdSchema,
} from '@/lib/schemas/support/sla';
import {
  calculateInitialTracking,
  calculatePauseUpdate,
  calculateResumeUpdate,
  calculateResponseUpdate,
  calculateResolutionUpdate,
  computeStateSnapshot,
  buildStartedEventData,
  buildPausedEventData,
  buildResumedEventData,
  buildRespondedEventData,
  buildResolvedEventData,
  type SlaConfiguration,
  type BusinessHoursConfig as BusinessHoursConfigType,
  toSlaTracking,
  toSlaConfiguration,
  toBusinessHoursConfig,
} from '@/lib/sla';
import { NotFoundError, ValidationError } from '@/lib/server/errors';

// ============================================================================
// SLA CONFIGURATION CRUD
// ============================================================================

/**
 * Create a new SLA configuration
 */
export const createSlaConfiguration = createServerFn({ method: 'POST' })
  .inputValidator(createSlaConfigurationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [config] = await db
      .insert(slaConfigurations)
      .values({
        organizationId: ctx.organizationId,
        domain: data.domain,
        name: data.name,
        description: data.description ?? null,
        responseTargetValue: data.responseTargetValue ?? null,
        responseTargetUnit: data.responseTargetUnit ?? null,
        resolutionTargetValue: data.resolutionTargetValue ?? null,
        resolutionTargetUnit: data.resolutionTargetUnit ?? null,
        atRiskThresholdPercent: data.atRiskThresholdPercent,
        escalateOnBreach: data.escalateOnBreach,
        escalateToUserId: data.escalateToUserId ?? null,
        businessHoursConfigId: data.businessHoursConfigId ?? null,
        isDefault: data.isDefault,
        priorityOrder: data.priorityOrder,
        isActive: data.isActive,
      })
      .returning();

    return config;
  });

/**
 * Get SLA configurations for the organization
 */
export const getSlaConfigurations = createServerFn({ method: 'GET' })
  .inputValidator(getSlaConfigurationsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(slaConfigurations.organizationId, ctx.organizationId)];

    if (data.domain) {
      conditions.push(eq(slaConfigurations.domain, data.domain));
    }

    if (typeof data.isActive === 'boolean') {
      conditions.push(eq(slaConfigurations.isActive, data.isActive));
    }

    const configs = await db
      .select()
      .from(slaConfigurations)
      .where(and(...conditions))
      .orderBy(asc(slaConfigurations.priorityOrder), asc(slaConfigurations.name));

    return configs;
  });

/**
 * Get a single SLA configuration by ID
 */
export const getSlaConfiguration = createServerFn({ method: 'GET' })
  .inputValidator(
    getSlaTrackingByIdSchema
      .extend({ configurationId: getSlaTrackingByIdSchema.shape.trackingId })
      .omit({ trackingId: true })
      .extend({
        configurationId: getSlaTrackingByIdSchema.shape.trackingId.describe('SLA configuration ID'),
      })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [config] = await db
      .select()
      .from(slaConfigurations)
      .where(
        and(
          eq(slaConfigurations.id, data.configurationId),
          eq(slaConfigurations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!config) {
      throw new NotFoundError('SLA configuration not found', 'slaConfiguration');
    }

    return config;
  });

/**
 * Update an SLA configuration
 */
export const updateSlaConfiguration = createServerFn({ method: 'POST' })
  .inputValidator(
    updateSlaConfigurationSchema.extend({
      configurationId: getSlaTrackingByIdSchema.shape.trackingId,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { configurationId, ...updates } = data;

    const [config] = await db
      .update(slaConfigurations)
      .set(updates)
      .where(
        and(
          eq(slaConfigurations.id, configurationId),
          eq(slaConfigurations.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!config) {
      throw new NotFoundError('SLA configuration not found', 'slaConfiguration');
    }

    return config;
  });

/**
 * Get default SLA configuration for a domain
 */
export const getDefaultSlaConfiguration = createServerFn({ method: 'GET' })
  .inputValidator(getSlaConfigurationsSchema.pick({ domain: true }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    if (!data.domain) {
      throw new ValidationError('Domain is required');
    }

    // First try to find the org's default
    const [config] = await db
      .select()
      .from(slaConfigurations)
      .where(
        and(
          eq(slaConfigurations.organizationId, ctx.organizationId),
          eq(slaConfigurations.domain, data.domain),
          eq(slaConfigurations.isDefault, true),
          eq(slaConfigurations.isActive, true)
        )
      )
      .limit(1);

    if (config) {
      return config;
    }

    // Fall back to highest priority active config
    const [fallback] = await db
      .select()
      .from(slaConfigurations)
      .where(
        and(
          eq(slaConfigurations.organizationId, ctx.organizationId),
          eq(slaConfigurations.domain, data.domain),
          eq(slaConfigurations.isActive, true)
        )
      )
      .orderBy(asc(slaConfigurations.priorityOrder))
      .limit(1);

    return fallback ?? null;
  });

// ============================================================================
// SLA TRACKING OPERATIONS
// ============================================================================

/**
 * Start SLA tracking for an entity
 */
export const startSlaTracking = createServerFn({ method: 'POST' })
  .inputValidator(startSlaTrackingSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get the SLA configuration
    const [config] = await db
      .select()
      .from(slaConfigurations)
      .where(
        and(
          eq(slaConfigurations.id, data.configurationId),
          eq(slaConfigurations.organizationId, ctx.organizationId)
        )
      )
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
        businessHours = toBusinessHoursConfig(bh);
      }
    }

    // Get holidays
    const holidays = await db
      .select()
      .from(organizationHolidays)
      .where(eq(organizationHolidays.organizationId, ctx.organizationId));

    const holidayDates = holidays.map((h) => new Date(h.date));

    // Calculate initial tracking values
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

    const initialValues = calculateInitialTracking(
      {
        organizationId: ctx.organizationId,
        domain: data.domain,
        entityType: data.entityType,
        entityId: data.entityId,
        configurationId: data.configurationId,
        startedAt: data.startedAt,
        userId: ctx.user.id,
      },
      configForCalc,
      businessHours,
      holidayDates
    );

    const tracking = await db.transaction(async (tx) => {
      const [t] = await tx.insert(slaTracking).values(initialValues).returning();
      await tx.insert(slaEvents).values({
        organizationId: ctx.organizationId,
        slaTrackingId: t.id,
        eventType: 'started',
        eventData: buildStartedEventData(toSlaTracking(t)),
        triggeredByUserId: ctx.user.id,
      });
      return t;
    });

    return tracking;
  });

/**
 * Pause SLA tracking
 */
export const pauseSla = createServerFn({ method: 'POST' })
  .inputValidator(pauseSlaSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get existing tracking
    const [existing] = await db
      .select()
      .from(slaTracking)
      .where(
        and(eq(slaTracking.id, data.trackingId), eq(slaTracking.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('SLA tracking not found', 'slaTracking');
    }

    // Calculate pause update
    const updates = calculatePauseUpdate(toSlaTracking(existing), data.reason);

    const [tracking] = await db.transaction(async (tx) => {
      const [t] = await tx
        .update(slaTracking)
        .set(updates)
        .where(eq(slaTracking.id, data.trackingId))
        .returning();
      await tx.insert(slaEvents).values({
        organizationId: ctx.organizationId,
        slaTrackingId: t.id,
        eventType: 'paused',
        eventData: buildPausedEventData(data.reason),
        triggeredByUserId: ctx.user.id,
      });
      return [t];
    });

    return tracking;
  });

/**
 * Resume SLA tracking
 */
export const resumeSla = createServerFn({ method: 'POST' })
  .inputValidator(resumeSlaSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get existing tracking
    const [existing] = await db
      .select()
      .from(slaTracking)
      .where(
        and(eq(slaTracking.id, data.trackingId), eq(slaTracking.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('SLA tracking not found', 'slaTracking');
    }

    // Calculate resume update
    const updates = calculateResumeUpdate(toSlaTracking(existing));
    const pauseDuration = updates.totalPausedDurationSeconds! - existing.totalPausedDurationSeconds;

    const [tracking] = await db.transaction(async (tx) => {
      const [t] = await tx
        .update(slaTracking)
        .set(updates)
        .where(eq(slaTracking.id, data.trackingId))
        .returning();
      await tx.insert(slaEvents).values({
        organizationId: ctx.organizationId,
        slaTrackingId: t.id,
        eventType: 'resumed',
        eventData: buildResumedEventData(pauseDuration, updates.totalPausedDurationSeconds!),
        triggeredByUserId: ctx.user.id,
      });
      return [t];
    });

    return tracking;
  });

/**
 * Record response on SLA tracking
 */
export const recordSlaResponse = createServerFn({ method: 'POST' })
  .inputValidator(recordResponseSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get existing tracking
    const [existing] = await db
      .select()
      .from(slaTracking)
      .where(
        and(eq(slaTracking.id, data.trackingId), eq(slaTracking.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('SLA tracking not found', 'slaTracking');
    }

    const respondedAt = data.respondedAt ?? new Date();

    // Calculate response update
    const updates = calculateResponseUpdate(toSlaTracking(existing), respondedAt);

    const [tracking] = await db.transaction(async (tx) => {
      const [t] = await tx
        .update(slaTracking)
        .set(updates)
        .where(eq(slaTracking.id, data.trackingId))
        .returning();
      await tx.insert(slaEvents).values({
        organizationId: ctx.organizationId,
        slaTrackingId: t.id,
        eventType: 'responded',
        eventData: buildRespondedEventData(toSlaTracking(existing), respondedAt),
        triggeredByUserId: ctx.user.id,
      });
      return [t];
    });

    return tracking;
  });

/**
 * Record resolution on SLA tracking
 */
export const recordSlaResolution = createServerFn({ method: 'POST' })
  .inputValidator(recordResolutionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get existing tracking
    const [existing] = await db
      .select()
      .from(slaTracking)
      .where(
        and(eq(slaTracking.id, data.trackingId), eq(slaTracking.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('SLA tracking not found', 'slaTracking');
    }

    const resolvedAt = data.resolvedAt ?? new Date();

    // Calculate resolution update
    const updates = calculateResolutionUpdate(toSlaTracking(existing), resolvedAt);

    const [tracking] = await db.transaction(async (tx) => {
      const [t] = await tx
        .update(slaTracking)
        .set(updates)
        .where(eq(slaTracking.id, data.trackingId))
        .returning();
      await tx.insert(slaEvents).values({
        organizationId: ctx.organizationId,
        slaTrackingId: t.id,
        eventType: 'resolved',
        eventData: buildResolvedEventData(toSlaTracking(existing), resolvedAt),
        triggeredByUserId: ctx.user.id,
      });
      return [t];
    });

    return tracking;
  });

/**
 * Get SLA tracking state snapshot
 */
export const getSlaState = createServerFn({ method: 'GET' })
  .inputValidator(getSlaTrackingByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get tracking with configuration
    const [tracking] = await db
      .select()
      .from(slaTracking)
      .where(
        and(eq(slaTracking.id, data.trackingId), eq(slaTracking.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!tracking) {
      throw new NotFoundError('SLA tracking not found', 'slaTracking');
    }

    // Get configuration
    const [config] = await db
      .select()
      .from(slaConfigurations)
      .where(eq(slaConfigurations.id, tracking.slaConfigurationId))
      .limit(1);

    if (!config) {
      throw new NotFoundError('SLA configuration not found', 'slaConfiguration');
    }

    // Compute state snapshot
    const snapshot = computeStateSnapshot(
      toSlaTracking(tracking),
      toSlaConfiguration(config)
    );

    return snapshot;
  });

/**
 * Get SLA events for a tracking record
 */
export const getSlaEvents = createServerFn({ method: 'GET' })
  .inputValidator(getSlaTrackingByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const events = await db
      .select()
      .from(slaEvents)
      .where(
        and(
          eq(slaEvents.slaTrackingId, data.trackingId),
          eq(slaEvents.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(slaEvents.triggeredAt));

    return events;
  });

// ============================================================================
// SLA DASHBOARD METRICS
// ============================================================================

/**
 * Dashboard metrics schema
 */
const getSlaMetricsSchema = z.object({
  domain: z.enum(['support', 'warranty', 'jobs']).optional(),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(), // ISO date
});

/**
 * Get SLA dashboard metrics for the organization
 * Includes breach counts, breach rate, average times
 */
export const getSlaMetrics = createServerFn({ method: 'GET' })
  .inputValidator(getSlaMetricsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(slaTracking.organizationId, ctx.organizationId)];

    if (data.domain) {
      conditions.push(eq(slaTracking.domain, data.domain));
    }

    if (data.startDate) {
      conditions.push(gte(slaTracking.startedAt, new Date(data.startDate)));
    }

    if (data.endDate) {
      conditions.push(lte(slaTracking.startedAt, new Date(data.endDate)));
    }

    // RAW SQL (Phase 11 Keep): count(CASE WHEN) for conditional counts. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    const [metrics] = await db
      .select({
        total: count(),
        responseBreached: count(sql`CASE WHEN ${slaTracking.responseBreached} = true THEN 1 END`),
        resolutionBreached: count(
          sql`CASE WHEN ${slaTracking.resolutionBreached} = true THEN 1 END`
        ),
        currentlyPaused: count(sql`CASE WHEN ${slaTracking.isPaused} = true THEN 1 END`),
        resolved: count(sql`CASE WHEN ${slaTracking.status} = 'resolved' THEN 1 END`),
        avgResponseTimeSeconds: avg(slaTracking.responseTimeSeconds),
        avgResolutionTimeSeconds: avg(slaTracking.resolutionTimeSeconds),
      })
      .from(slaTracking)
      .where(and(...conditions));

    // Calculate breach rate
    const total = Number(metrics.total) || 0;
    const responseBreachRate = total > 0 ? (Number(metrics.responseBreached) / total) * 100 : 0;
    const resolutionBreachRate = total > 0 ? (Number(metrics.resolutionBreached) / total) * 100 : 0;

    return {
      total,
      responseBreached: Number(metrics.responseBreached) || 0,
      resolutionBreached: Number(metrics.resolutionBreached) || 0,
      currentlyPaused: Number(metrics.currentlyPaused) || 0,
      resolved: Number(metrics.resolved) || 0,
      responseBreachRate: Math.round(responseBreachRate * 10) / 10,
      resolutionBreachRate: Math.round(resolutionBreachRate * 10) / 10,
      avgResponseTimeSeconds: metrics.avgResponseTimeSeconds
        ? Math.round(Number(metrics.avgResponseTimeSeconds))
        : null,
      avgResolutionTimeSeconds: metrics.avgResolutionTimeSeconds
        ? Math.round(Number(metrics.avgResolutionTimeSeconds))
        : null,
    };
  });

// ============================================================================
// SLA REPORT BY ISSUE TYPE
// ============================================================================

/**
 * Schema for SLA report by issue type
 */
const getSlaReportByIssueTypeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * Get SLA metrics broken down by issue type
 */
export const getSlaReportByIssueType = createServerFn({ method: 'GET' })
  .inputValidator(getSlaReportByIssueTypeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(slaTracking.organizationId, ctx.organizationId),
      eq(slaTracking.domain, 'support'),
      eq(slaTracking.entityType, 'issue'),
    ];

    if (data.startDate) {
      conditions.push(gte(slaTracking.startedAt, new Date(data.startDate)));
    }

    if (data.endDate) {
      conditions.push(lte(slaTracking.startedAt, new Date(data.endDate)));
    }

    // Join with issues to get issue type
    const results = await db
      .select({
        issueType: issues.type,
        total: count(),
        responseBreached: count(sql`CASE WHEN ${slaTracking.responseBreached} = true THEN 1 END`),
        resolutionBreached: count(
          sql`CASE WHEN ${slaTracking.resolutionBreached} = true THEN 1 END`
        ),
        resolved: count(sql`CASE WHEN ${slaTracking.status} = 'resolved' THEN 1 END`),
        avgResponseTimeSeconds: avg(slaTracking.responseTimeSeconds),
        avgResolutionTimeSeconds: avg(slaTracking.resolutionTimeSeconds),
      })
      .from(slaTracking)
      .innerJoin(issues, eq(slaTracking.entityId, issues.id))
      .where(and(...conditions))
      .groupBy(issues.type);

    return results.map((row) => ({
      issueType: row.issueType,
      total: Number(row.total) || 0,
      responseBreached: Number(row.responseBreached) || 0,
      resolutionBreached: Number(row.resolutionBreached) || 0,
      resolved: Number(row.resolved) || 0,
      responseBreachRate:
        Number(row.total) > 0
          ? Math.round((Number(row.responseBreached) / Number(row.total)) * 1000) / 10
          : 0,
      resolutionBreachRate:
        Number(row.total) > 0
          ? Math.round((Number(row.resolutionBreached) / Number(row.total)) * 1000) / 10
          : 0,
      avgResponseTimeSeconds: row.avgResponseTimeSeconds
        ? Math.round(Number(row.avgResponseTimeSeconds))
        : null,
      avgResolutionTimeSeconds: row.avgResolutionTimeSeconds
        ? Math.round(Number(row.avgResolutionTimeSeconds))
        : null,
    }));
  });

// ============================================================================
// SLA SEED DATA
// ============================================================================

/**
 * Default SLA configurations for each domain.
 * These configurations are created when seeding a new organization.
 */
const DEFAULT_SLA_CONFIGS = {
  support: [
    {
      name: 'Critical Support',
      description: 'SLA for critical priority support issues. Requires immediate response and fast resolution.',
      responseTargetValue: 1,
      responseTargetUnit: 'hours' as const,
      resolutionTargetValue: 4,
      resolutionTargetUnit: 'business_hours' as const,
      atRiskThresholdPercent: 25,
      escalateOnBreach: true,
      priorityOrder: 10,
      isDefault: false,
    },
    {
      name: 'High Priority Support',
      description: 'SLA for high priority support issues. Fast response with same-day resolution target.',
      responseTargetValue: 4,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 8,
      resolutionTargetUnit: 'business_hours' as const,
      atRiskThresholdPercent: 25,
      escalateOnBreach: true,
      priorityOrder: 20,
      isDefault: false,
    },
    {
      name: 'Standard Support',
      description: 'Default SLA for standard support issues. Balanced response and resolution times.',
      responseTargetValue: 8,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 3,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 25,
      escalateOnBreach: false,
      priorityOrder: 50,
      isDefault: true,
    },
    {
      name: 'Low Priority Support',
      description: 'SLA for low priority support issues. Extended timeframes for non-urgent matters.',
      responseTargetValue: 24,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 5,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 20,
      escalateOnBreach: false,
      priorityOrder: 80,
      isDefault: false,
    },
  ],
  warranty: [
    {
      name: 'Manufacturer Warranty Claim',
      description: 'SLA for processing manufacturer warranty claims. Standard processing times.',
      responseTargetValue: 24,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 10,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 25,
      escalateOnBreach: false,
      priorityOrder: 50,
      isDefault: true,
    },
    {
      name: 'Extended Warranty Claim',
      description: 'SLA for extended warranty claims. Faster processing for premium customers.',
      responseTargetValue: 8,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 5,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 25,
      escalateOnBreach: true,
      priorityOrder: 30,
      isDefault: false,
    },
    {
      name: 'VIP Warranty Service',
      description: 'Priority SLA for VIP customers with active warranty. Expedited handling.',
      responseTargetValue: 4,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 3,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 30,
      escalateOnBreach: true,
      priorityOrder: 10,
      isDefault: false,
    },
  ],
  jobs: [
    {
      name: 'Emergency Job',
      description: 'SLA for emergency service jobs. Immediate response required.',
      responseTargetValue: 30,
      responseTargetUnit: 'minutes' as const,
      resolutionTargetValue: 4,
      resolutionTargetUnit: 'hours' as const,
      atRiskThresholdPercent: 30,
      escalateOnBreach: true,
      priorityOrder: 5,
      isDefault: false,
    },
    {
      name: 'Priority Installation',
      description: 'SLA for priority installation jobs. Fast scheduling and completion.',
      responseTargetValue: 4,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 2,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 25,
      escalateOnBreach: true,
      priorityOrder: 20,
      isDefault: false,
    },
    {
      name: 'Standard Installation',
      description: 'Default SLA for standard installation and service jobs.',
      responseTargetValue: 24,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 5,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 25,
      escalateOnBreach: false,
      priorityOrder: 50,
      isDefault: true,
    },
    {
      name: 'Scheduled Maintenance',
      description: 'SLA for pre-scheduled maintenance jobs. Flexible timeframes.',
      responseTargetValue: 48,
      responseTargetUnit: 'business_hours' as const,
      resolutionTargetValue: 10,
      resolutionTargetUnit: 'business_days' as const,
      atRiskThresholdPercent: 20,
      escalateOnBreach: false,
      priorityOrder: 80,
      isDefault: false,
    },
  ],
} as const;

/**
 * Seed default SLA configurations for an organization.
 *
 * This function creates default SLA configurations for Support, Warranty, and Jobs
 * domains if they don't already exist for the organization.
 *
 * Should be called when:
 * - A new organization is created
 * - An admin wants to reset to default SLA configurations
 *
 * @returns Summary of created configurations
 */
export const seedDefaultSlaConfigurations = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      /** If true, skip domains that already have configurations */
      skipExisting: z.boolean().default(true),
      /** Specific domains to seed (defaults to all) */
      domains: z.array(z.enum(['support', 'warranty', 'jobs'])).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const domainsToSeed = data.domains ?? (['support', 'warranty', 'jobs'] as const);
    const results: { domain: string; created: number; skipped: boolean }[] = [];

    for (const domain of domainsToSeed) {
      // Check if configs already exist for this domain
      if (data.skipExisting) {
        const existing = await db
          .select({ id: slaConfigurations.id })
          .from(slaConfigurations)
          .where(
            and(
              eq(slaConfigurations.organizationId, ctx.organizationId),
              eq(slaConfigurations.domain, domain)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          results.push({ domain, created: 0, skipped: true });
          continue;
        }
      }

      // Get default configs for this domain
      const configs = DEFAULT_SLA_CONFIGS[domain];

      // Insert all configs for this domain
      const inserted = await db
        .insert(slaConfigurations)
        .values(
          configs.map((config) => ({
            organizationId: ctx.organizationId,
            domain,
            name: config.name,
            description: config.description,
            responseTargetValue: config.responseTargetValue,
            responseTargetUnit: config.responseTargetUnit,
            resolutionTargetValue: config.resolutionTargetValue,
            resolutionTargetUnit: config.resolutionTargetUnit,
            atRiskThresholdPercent: config.atRiskThresholdPercent,
            escalateOnBreach: config.escalateOnBreach,
            priorityOrder: config.priorityOrder,
            isDefault: config.isDefault,
            isActive: true,
          }))
        )
        .returning({ id: slaConfigurations.id });

      results.push({ domain, created: inserted.length, skipped: false });
    }

    return {
      success: true,
      organizationId: ctx.organizationId,
      results,
      totalCreated: results.reduce((sum, r) => sum + r.created, 0),
    };
  });

/**
 * Check if an organization has SLA configurations
 */
export const hasSlsConfigurations = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      domain: z.enum(['support', 'warranty', 'jobs']).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(slaConfigurations.organizationId, ctx.organizationId)];

    if (data.domain) {
      conditions.push(eq(slaConfigurations.domain, data.domain));
    }

    const [result] = await db
      .select({ count: count() })
      .from(slaConfigurations)
      .where(and(...conditions));

    return {
      hasConfigurations: Number(result.count) > 0,
      count: Number(result.count),
    };
  });
