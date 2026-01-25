/**
 * Organization Holidays Server Functions
 *
 * Server functions for managing holiday calendar.
 * Used by SLA calculations to exclude non-working days.
 *
 * @see drizzle/schema/support/organization-holidays.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { organizationHolidays } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import { paginationSchema } from '@/lib/schemas';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createHolidaySchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  isRecurring: z.boolean().default(false),
  description: z.string().max(500).optional(),
});

const updateHolidaySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  isRecurring: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

const listHolidaysSchema = paginationSchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  includeRecurring: z.boolean().optional().default(true),
});

const bulkCreateHolidaysSchema = z.object({
  holidays: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
        isRecurring: z.boolean().default(false),
        description: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(50),
});

// ============================================================================
// LIST HOLIDAYS
// ============================================================================

/**
 * List holidays for the organization.
 * Optionally filter by year.
 */
export const listHolidays = createServerFn({ method: 'GET' })
  .inputValidator(listHolidaysSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const { page, pageSize, year, includeRecurring } = data;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(organizationHolidays.organizationId, ctx.organizationId)];

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      conditions.push(gte(organizationHolidays.date, startDate.toISOString().split('T')[0]));
      conditions.push(lte(organizationHolidays.date, endDate.toISOString().split('T')[0]));
    }

    if (!includeRecurring) {
      conditions.push(eq(organizationHolidays.isRecurring, false));
    }

    const holidays = await db
      .select({
        id: organizationHolidays.id,
        organizationId: organizationHolidays.organizationId,
        name: organizationHolidays.name,
        date: organizationHolidays.date,
        isRecurring: organizationHolidays.isRecurring,
        description: organizationHolidays.description,
        createdAt: organizationHolidays.createdAt,
        updatedAt: organizationHolidays.updatedAt,
      })
      .from(organizationHolidays)
      .where(and(...conditions))
      .orderBy(organizationHolidays.date)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationHolidays)
      .where(and(...conditions));

    return {
      items: holidays,
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// GET HOLIDAY
// ============================================================================

/**
 * Get a single holiday by ID.
 */
export const getHoliday = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [holiday] = await db
      .select({
        id: organizationHolidays.id,
        organizationId: organizationHolidays.organizationId,
        name: organizationHolidays.name,
        date: organizationHolidays.date,
        isRecurring: organizationHolidays.isRecurring,
        description: organizationHolidays.description,
        createdAt: organizationHolidays.createdAt,
        updatedAt: organizationHolidays.updatedAt,
      })
      .from(organizationHolidays)
      .where(
        and(
          eq(organizationHolidays.id, data.id),
          eq(organizationHolidays.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!holiday) {
      throw new Error('Holiday not found');
    }

    return holiday;
  });

// ============================================================================
// CREATE HOLIDAY
// ============================================================================

/**
 * Create a new holiday.
 * Requires: settings.update permission
 */
export const createHoliday = createServerFn({ method: 'POST' })
  .inputValidator(createHolidaySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    // Check for duplicate date (data.date is already YYYY-MM-DD string)
    const [existing] = await db
      .select({ id: organizationHolidays.id })
      .from(organizationHolidays)
      .where(
        and(
          eq(organizationHolidays.organizationId, ctx.organizationId),
          eq(organizationHolidays.date, data.date)
        )
      )
      .limit(1);

    if (existing) {
      throw new Error('A holiday already exists for this date');
    }

    const [created] = await db
      .insert(organizationHolidays)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        date: data.date,
        isRecurring: data.isRecurring,
        description: data.description ?? null,
      })
      .returning();

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'holiday.create',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: created.id,
      newValues: {
        name: data.name,
        date: data.date,
        isRecurring: data.isRecurring,
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      date: created.date,
      isRecurring: created.isRecurring,
      description: created.description,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  });

// ============================================================================
// UPDATE HOLIDAY
// ============================================================================

/**
 * Update an existing holiday.
 * Requires: settings.update permission
 */
export const updateHoliday = createServerFn({ method: 'POST' })
  .inputValidator(updateHolidaySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    // Get current holiday
    const [current] = await db
      .select()
      .from(organizationHolidays)
      .where(
        and(
          eq(organizationHolidays.id, data.id),
          eq(organizationHolidays.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!current) {
      throw new Error('Holiday not found');
    }

    // Check for duplicate date if changing (data.date is already YYYY-MM-DD string)
    if (data.date) {
      const [existing] = await db
        .select({ id: organizationHolidays.id })
        .from(organizationHolidays)
        .where(
          and(
            eq(organizationHolidays.organizationId, ctx.organizationId),
            eq(organizationHolidays.date, data.date),
            sql`${organizationHolidays.id} != ${data.id}`
          )
        )
        .limit(1);

      if (existing) {
        throw new Error('A holiday already exists for this date');
      }
    }

    const updateData: Partial<typeof current> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.date !== undefined) updateData.date = data.date; // Already YYYY-MM-DD string
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.description !== undefined) updateData.description = data.description || null;

    const [updated] = await db
      .update(organizationHolidays)
      .set(updateData)
      .where(eq(organizationHolidays.id, data.id))
      .returning();

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'holiday.update',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: updated.id,
      oldValues: {
        name: current.name,
        date: current.date,
        isRecurring: current.isRecurring,
      },
      newValues: {
        name: updated.name,
        date: updated.date,
        isRecurring: updated.isRecurring,
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      date: updated.date,
      isRecurring: updated.isRecurring,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });

// ============================================================================
// DELETE HOLIDAY
// ============================================================================

/**
 * Delete a holiday.
 * Requires: settings.update permission
 */
export const deleteHoliday = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const [deleted] = await db
      .delete(organizationHolidays)
      .where(
        and(
          eq(organizationHolidays.id, data.id),
          eq(organizationHolidays.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: organizationHolidays.id, name: organizationHolidays.name });

    if (!deleted) {
      throw new Error('Holiday not found');
    }

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'holiday.delete',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: data.id,
      oldValues: { name: deleted.name },
    });

    return { success: true };
  });

// ============================================================================
// BULK CREATE HOLIDAYS
// ============================================================================

/**
 * Create multiple holidays at once.
 * Useful for importing standard holiday calendars.
 * Requires: settings.update permission
 */
export const bulkCreateHolidays = createServerFn({ method: 'POST' })
  .inputValidator(bulkCreateHolidaysSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const results: Array<{ id: string; name: string; date: string }> = [];
    const errors: Array<{ name: string; date: string; error: string }> = [];

    for (const holiday of data.holidays) {
      // holiday.date is already YYYY-MM-DD string

      // Check for duplicate
      const [existing] = await db
        .select({ id: organizationHolidays.id })
        .from(organizationHolidays)
        .where(
          and(
            eq(organizationHolidays.organizationId, ctx.organizationId),
            eq(organizationHolidays.date, holiday.date)
          )
        )
        .limit(1);

      if (existing) {
        errors.push({
          name: holiday.name,
          date: holiday.date,
          error: 'Holiday already exists for this date',
        });
        continue;
      }

      const [created] = await db
        .insert(organizationHolidays)
        .values({
          organizationId: ctx.organizationId,
          name: holiday.name,
          date: holiday.date,
          isRecurring: holiday.isRecurring,
          description: holiday.description ?? null,
        })
        .returning({
          id: organizationHolidays.id,
          name: organizationHolidays.name,
          date: organizationHolidays.date,
        });

      results.push(created);
    }

    // Log bulk audit
    if (results.length > 0) {
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'holiday.bulk_create',
        entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
        newValues: {
          count: results.length,
          holidays: results.map((h) => h.name),
        },
      });
    }

    return {
      created: results,
      errors,
      summary: {
        total: data.holidays.length,
        created: results.length,
        failed: errors.length,
      },
    };
  });

// ============================================================================
// GET AUSTRALIAN PUBLIC HOLIDAYS
// ============================================================================

/**
 * Returns a list of standard Australian public holidays.
 * Useful for initializing holiday calendar.
 */
export function getAustralianPublicHolidays(
  year: number
): Array<{ name: string; date: Date; isRecurring: boolean }> {
  return [
    { name: "New Year's Day", date: new Date(`${year}-01-01`), isRecurring: true },
    { name: 'Australia Day', date: new Date(`${year}-01-26`), isRecurring: true },
    // Easter dates vary - would need calculation
    { name: 'Anzac Day', date: new Date(`${year}-04-25`), isRecurring: true },
    { name: "Queen's Birthday", date: new Date(`${year}-06-10`), isRecurring: false }, // Varies by state
    { name: 'Christmas Day', date: new Date(`${year}-12-25`), isRecurring: true },
    { name: 'Boxing Day', date: new Date(`${year}-12-26`), isRecurring: true },
  ];
}
