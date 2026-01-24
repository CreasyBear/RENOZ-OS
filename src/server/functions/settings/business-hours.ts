/**
 * Business Hours Server Functions
 *
 * Server functions for managing business hours configuration.
 * Used by SLA calculations and scheduling systems.
 *
 * @see drizzle/schema/settings/business-hours-config.ts for database schema
 * @see src/lib/sla for time calculations
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { businessHoursConfig, type WeeklySchedule, type DaySchedule } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ENTITY_TYPES } from 'drizzle/schema';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const dayScheduleSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  })
  .refine((data) => data.start < data.end, {
    message: 'End time must be after start time',
  });

const weeklyScheduleSchema = z.object({
  monday: dayScheduleSchema.nullable().optional(),
  tuesday: dayScheduleSchema.nullable().optional(),
  wednesday: dayScheduleSchema.nullable().optional(),
  thursday: dayScheduleSchema.nullable().optional(),
  friday: dayScheduleSchema.nullable().optional(),
  saturday: dayScheduleSchema.nullable().optional(),
  sunday: dayScheduleSchema.nullable().optional(),
});

const createBusinessHoursSchema = z.object({
  name: z.string().min(1).max(100),
  weeklySchedule: weeklyScheduleSchema,
  timezone: z.string().max(100).default('Australia/Sydney'),
  isDefault: z.boolean().default(false),
});

const updateBusinessHoursSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  weeklySchedule: weeklyScheduleSchema.optional(),
  timezone: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// LIST BUSINESS HOURS CONFIGS
// ============================================================================

/**
 * List all business hours configurations for the organization.
 */
export const listBusinessHours = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();

  const configs = await db
    .select({
      id: businessHoursConfig.id,
      organizationId: businessHoursConfig.organizationId,
      name: businessHoursConfig.name,
      weeklySchedule: businessHoursConfig.weeklySchedule,
      timezone: businessHoursConfig.timezone,
      isDefault: businessHoursConfig.isDefault,
      createdAt: businessHoursConfig.createdAt,
      updatedAt: businessHoursConfig.updatedAt,
    })
    .from(businessHoursConfig)
    .where(eq(businessHoursConfig.organizationId, ctx.organizationId))
    .orderBy(businessHoursConfig.name);

  return { items: configs };
});

// ============================================================================
// GET BUSINESS HOURS CONFIG
// ============================================================================

/**
 * Get a single business hours configuration.
 */
export const getBusinessHours = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [config] = await db
      .select({
        id: businessHoursConfig.id,
        organizationId: businessHoursConfig.organizationId,
        name: businessHoursConfig.name,
        weeklySchedule: businessHoursConfig.weeklySchedule,
        timezone: businessHoursConfig.timezone,
        isDefault: businessHoursConfig.isDefault,
        createdAt: businessHoursConfig.createdAt,
        updatedAt: businessHoursConfig.updatedAt,
      })
      .from(businessHoursConfig)
      .where(
        and(
          eq(businessHoursConfig.id, data.id),
          eq(businessHoursConfig.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!config) {
      throw new Error('Business hours configuration not found');
    }

    return config;
  });

// ============================================================================
// GET DEFAULT BUSINESS HOURS
// ============================================================================

/**
 * Get the default business hours configuration for the organization.
 */
export const getDefaultBusinessHours = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();

  const [config] = await db
    .select({
      id: businessHoursConfig.id,
      organizationId: businessHoursConfig.organizationId,
      name: businessHoursConfig.name,
      weeklySchedule: businessHoursConfig.weeklySchedule,
      timezone: businessHoursConfig.timezone,
      isDefault: businessHoursConfig.isDefault,
      createdAt: businessHoursConfig.createdAt,
      updatedAt: businessHoursConfig.updatedAt,
    })
    .from(businessHoursConfig)
    .where(
      and(
        eq(businessHoursConfig.organizationId, ctx.organizationId),
        eq(businessHoursConfig.isDefault, true)
      )
    )
    .limit(1);

  return config || null;
});

// ============================================================================
// CREATE BUSINESS HOURS CONFIG
// ============================================================================

/**
 * Create a new business hours configuration.
 * Requires: settings.update permission
 */
export const createBusinessHours = createServerFn({ method: 'POST' })
  .inputValidator(createBusinessHoursSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings?.update });

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(businessHoursConfig)
        .set({ isDefault: false })
        .where(eq(businessHoursConfig.organizationId, ctx.organizationId));
    }

    const [created] = await db
      .insert(businessHoursConfig)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        weeklySchedule: data.weeklySchedule as WeeklySchedule,
        timezone: data.timezone,
        isDefault: data.isDefault,
      })
      .returning();

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'business_hours.create',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: created.id,
      newValues: {
        name: data.name,
        timezone: data.timezone,
        isDefault: data.isDefault,
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      weeklySchedule: created.weeklySchedule,
      timezone: created.timezone,
      isDefault: created.isDefault,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  });

// ============================================================================
// UPDATE BUSINESS HOURS CONFIG
// ============================================================================

/**
 * Update an existing business hours configuration.
 * Requires: settings.update permission
 */
export const updateBusinessHours = createServerFn({ method: 'POST' })
  .inputValidator(updateBusinessHoursSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings?.update });

    // Get current config
    const [current] = await db
      .select()
      .from(businessHoursConfig)
      .where(
        and(
          eq(businessHoursConfig.id, data.id),
          eq(businessHoursConfig.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!current) {
      throw new Error('Business hours configuration not found');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(businessHoursConfig)
        .set({ isDefault: false })
        .where(
          and(
            eq(businessHoursConfig.organizationId, ctx.organizationId),
            sql`${businessHoursConfig.id} != ${data.id}`
          )
        );
    }

    const updateData: Partial<typeof current> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.weeklySchedule !== undefined)
      updateData.weeklySchedule = data.weeklySchedule as WeeklySchedule;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const [updated] = await db
      .update(businessHoursConfig)
      .set(updateData)
      .where(eq(businessHoursConfig.id, data.id))
      .returning();

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'business_hours.update',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: updated.id,
      oldValues: {
        name: current.name,
        timezone: current.timezone,
        isDefault: current.isDefault,
      },
      newValues: {
        name: updated.name,
        timezone: updated.timezone,
        isDefault: updated.isDefault,
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      weeklySchedule: updated.weeklySchedule,
      timezone: updated.timezone,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });

// ============================================================================
// DELETE BUSINESS HOURS CONFIG
// ============================================================================

/**
 * Delete a business hours configuration.
 * Requires: settings.update permission
 * Note: Cannot delete the default config unless it's the only one.
 */
export const deleteBusinessHours = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings?.update });

    // Get the config to delete
    const [config] = await db
      .select()
      .from(businessHoursConfig)
      .where(
        and(
          eq(businessHoursConfig.id, data.id),
          eq(businessHoursConfig.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!config) {
      throw new Error('Business hours configuration not found');
    }

    // Check if it's the default and there are others
    if (config.isDefault) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(businessHoursConfig)
        .where(eq(businessHoursConfig.organizationId, ctx.organizationId));

      if (countResult.count > 1) {
        throw new Error('Cannot delete the default business hours. Set another as default first.');
      }
    }

    await db.delete(businessHoursConfig).where(eq(businessHoursConfig.id, data.id));

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'business_hours.delete',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: data.id,
      oldValues: {
        name: config.name,
        timezone: config.timezone,
      },
    });

    return { success: true };
  });

// ============================================================================
// HELPER: STANDARD WORK WEEK
// ============================================================================

/**
 * Returns a standard 9-5 Monday-Friday schedule.
 */
export function getStandardWorkWeek(): WeeklySchedule {
  const workDay: DaySchedule = { start: '09:00', end: '17:00' };
  return {
    monday: workDay,
    tuesday: workDay,
    wednesday: workDay,
    thursday: workDay,
    friday: workDay,
    saturday: null,
    sunday: null,
  };
}

// ============================================================================
// INITIALIZE DEFAULT BUSINESS HOURS
// ============================================================================

/**
 * Initialize default business hours for a new organization.
 */
export async function initializeDefaultBusinessHours(organizationId: string): Promise<string> {
  const [created] = await db
    .insert(businessHoursConfig)
    .values({
      organizationId,
      name: 'Standard Hours',
      weeklySchedule: getStandardWorkWeek(),
      timezone: 'Australia/Sydney',
      isDefault: true,
    })
    .returning({ id: businessHoursConfig.id });

  return created.id;
}
