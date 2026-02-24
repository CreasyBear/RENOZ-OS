/**
 * System Settings Server Functions
 *
 * Server functions for global system configuration.
 * Manages organization-wide settings like defaults, formatting, etc.
 *
 * @see drizzle/schema/system-settings.ts for database schema
 * @see src/lib/schemas/settings.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemSettings, SETTING_CATEGORIES, SETTING_KEYS } from 'drizzle/schema';
import { setResponseStatus } from '@tanstack/react-start/server';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logAuditEvent } from '../_shared/audit-logs-internal';
import type { AuditEntityType } from '@/lib/schemas/settings';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const getSettingsSchema = z.object({
  category: z.string().min(1).max(50).optional(),
});

const getSettingSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
});

const setSettingSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
  value: z.unknown(),
  type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

const setSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        category: z.string().min(1).max(50),
        key: z.string().min(1).max(100),
        value: z.unknown(),
        type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
      })
    )
    .min(1)
    .max(50),
});

const deleteSettingSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
});

// ============================================================================
// GET ALL SETTINGS
// ============================================================================

/**
 * Get all settings for the organization.
 * Optionally filter by category.
 */
export const getSystemSettings = createServerFn({ method: 'GET' })
  .inputValidator(getSettingsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(systemSettings.organizationId, ctx.organizationId)];
    if (data.category) {
      conditions.push(eq(systemSettings.category, data.category));
    }

    const settings = await db
      .select({
        id: systemSettings.id,
        category: systemSettings.category,
        key: systemSettings.key,
        value: systemSettings.value,
        type: systemSettings.type,
        description: systemSettings.description,
        isPublic: systemSettings.isPublic,
        createdAt: systemSettings.createdAt,
        updatedAt: systemSettings.updatedAt,
      })
      .from(systemSettings)
      .where(and(...conditions))
      .orderBy(systemSettings.category, systemSettings.key);

    // Group by category for easier consumption
    const grouped: Record<string, Record<string, FlexibleJson>> = {};
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {};
      }
      grouped[setting.category][setting.key] = setting.value as FlexibleJson;
    }

    return {
      settings: settings.map((s) => ({ ...s, value: s.value as FlexibleJson })),
      grouped,
    };
  });

// ============================================================================
// GET SINGLE SETTING
// ============================================================================

/**
 * Get a single setting by category and key.
 */
export const getSystemSetting = createServerFn({ method: 'GET' })
  .inputValidator(getSettingSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [setting] = await db
      .select({
        id: systemSettings.id,
        category: systemSettings.category,
        key: systemSettings.key,
        value: systemSettings.value,
        type: systemSettings.type,
        description: systemSettings.description,
        isPublic: systemSettings.isPublic,
        metadata: systemSettings.metadata,
        createdAt: systemSettings.createdAt,
        updatedAt: systemSettings.updatedAt,
      })
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.organizationId, ctx.organizationId),
          eq(systemSettings.category, data.category),
          eq(systemSettings.key, data.key)
        )
      )
      .limit(1);

    if (!setting) {
      setResponseStatus(404);
      throw new NotFoundError('System setting not found', 'systemSetting');
    }

    return {
      ...setting,
      value: setting.value as FlexibleJson,
      metadata: setting.metadata as FlexibleJson,
    };
  });

// ============================================================================
// SET SINGLE SETTING
// ============================================================================

/**
 * Set a single setting (upsert).
 * Requires: settings.update permission
 */
export const setSystemSetting = createServerFn({ method: 'POST' })
  .inputValidator(setSettingSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    // Check if setting exists
    const [existing] = await db
      .select({ id: systemSettings.id, value: systemSettings.value })
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.organizationId, ctx.organizationId),
          eq(systemSettings.category, data.category),
          eq(systemSettings.key, data.key)
        )
      )
      .limit(1);

    const oldValue = existing?.value;

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(systemSettings)
        .set({
          value: data.value,
          type: data.type,
          description: data.description,
          isPublic: data.isPublic,
          updatedBy: ctx.user.id,
          version: sql`${systemSettings.version} + 1`,
        })
        .where(eq(systemSettings.id, existing.id))
        .returning();

      // Log audit
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'setting.update',
        entityType: 'setting',
        entityId: updated.id,
        oldValues: { category: data.category, key: data.key, value: oldValue },
        newValues: { category: data.category, key: data.key, value: data.value },
      });

      return {
        id: updated.id,
        category: updated.category,
        key: updated.key,
        value: updated.value as FlexibleJson,
        type: updated.type,
        description: updated.description,
        isPublic: updated.isPublic,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } else {
      // Create new
      const [created] = await db
        .insert(systemSettings)
        .values({
          organizationId: ctx.organizationId,
          category: data.category,
          key: data.key,
          value: data.value,
          type: data.type || 'string',
          description: data.description,
          isPublic: data.isPublic ?? false,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Log audit
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'setting.create',
        entityType: 'setting' as AuditEntityType,
        entityId: created.id,
        newValues: { category: data.category, key: data.key, value: data.value },
      });

      return {
        id: created.id,
        category: created.category,
        key: created.key,
        value: created.value as FlexibleJson,
        type: created.type,
        description: created.description,
        isPublic: created.isPublic,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    }
  });

// ============================================================================
// SET MULTIPLE SETTINGS
// ============================================================================

/**
 * Set multiple settings at once (batch upsert).
 * Requires: settings.update permission
 */
export const setSystemSettings = createServerFn({ method: 'POST' })
  .inputValidator(setSettingsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const results: Array<{
      id: string;
      category: string;
      key: string;
      value: FlexibleJson;
    }> = [];

    for (const setting of data.settings) {
      const [existing] = await db
        .select({ id: systemSettings.id })
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.organizationId, ctx.organizationId),
            eq(systemSettings.category, setting.category),
            eq(systemSettings.key, setting.key)
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(systemSettings)
          .set({
            value: setting.value,
            type: setting.type,
            updatedBy: ctx.user.id,
            version: sql`${systemSettings.version} + 1`,
          })
          .where(eq(systemSettings.id, existing.id))
          .returning({
            id: systemSettings.id,
            category: systemSettings.category,
            key: systemSettings.key,
            value: systemSettings.value,
          });

        results.push({ ...updated, value: updated.value as FlexibleJson });
      } else {
        const [created] = await db
          .insert(systemSettings)
          .values({
            organizationId: ctx.organizationId,
            category: setting.category,
            key: setting.key,
            value: setting.value,
            type: setting.type || 'string',
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning({
            id: systemSettings.id,
            category: systemSettings.category,
            key: systemSettings.key,
            value: systemSettings.value,
          });

        results.push({ ...created, value: created.value as FlexibleJson });
      }
    }

    // Log batch audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'setting.batch_update',
      entityType: 'setting' as AuditEntityType,
      newValues: {
        count: results.length,
        categories: [...new Set(data.settings.map((s) => s.category))],
      },
    });

    return { settings: results };
  });

// ============================================================================
// DELETE SETTING
// ============================================================================

/**
 * Delete a single setting.
 * Requires: settings.update permission
 */
export const deleteSystemSetting = createServerFn({ method: 'POST' })
  .inputValidator(deleteSettingSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const deleted = await db
      .delete(systemSettings)
      .where(
        and(
          eq(systemSettings.organizationId, ctx.organizationId),
          eq(systemSettings.category, data.category),
          eq(systemSettings.key, data.key)
        )
      )
      .returning({ id: systemSettings.id });

    if (deleted.length > 0) {
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'setting.delete',
        entityType: 'setting' as AuditEntityType,
        entityId: deleted[0].id,
        oldValues: { category: data.category, key: data.key },
      });
    }

    return { success: deleted.length > 0 };
  });

// ============================================================================
// GET SETTING CATEGORIES
// ============================================================================

/**
 * Get list of valid setting categories.
 */
export const getSettingCategories = createServerFn({ method: 'GET' }).handler(async () => {
  return Object.values(SETTING_CATEGORIES);
});

// ============================================================================
// GET SETTING KEYS
// ============================================================================

/**
 * Get list of predefined setting keys.
 */
export const getSettingKeys = createServerFn({ method: 'GET' }).handler(async () => {
  return SETTING_KEYS;
});

// ============================================================================
// INITIALIZE DEFAULT SETTINGS
// ============================================================================

/**
 * Initialize default settings for a new organization.
 * Called during organization setup.
 */
export async function initializeDefaultSettings(
  organizationId: string,
  userId: string
): Promise<void> {
  const defaults = [
    // Financial
    {
      category: SETTING_CATEGORIES.FINANCIAL,
      key: 'currency',
      value: 'AUD',
      type: 'string' as const,
    },
    { category: SETTING_CATEGORIES.FINANCIAL, key: 'taxRate', value: 10, type: 'number' as const },
    {
      category: SETTING_CATEGORIES.FINANCIAL,
      key: 'paymentTerms',
      value: 30,
      type: 'number' as const,
    },

    // Formatting
    {
      category: SETTING_CATEGORIES.FORMATTING,
      key: 'dateFormat',
      value: 'DD/MM/YYYY',
      type: 'string' as const,
    },
    {
      category: SETTING_CATEGORIES.FORMATTING,
      key: 'timeFormat',
      value: 'HH:mm',
      type: 'string' as const,
    },
    {
      category: SETTING_CATEGORIES.FORMATTING,
      key: 'numberFormat',
      value: 'en-AU',
      type: 'string' as const,
    },

    // Orders
    {
      category: SETTING_CATEGORIES.ORDERS,
      key: 'defaultStatus',
      value: 'draft',
      type: 'string' as const,
    },
    {
      category: SETTING_CATEGORIES.ORDERS,
      key: 'requireApproval',
      value: false,
      type: 'boolean' as const,
    },

    // Quotes
    {
      category: SETTING_CATEGORIES.QUOTES,
      key: 'validityDays',
      value: 30,
      type: 'number' as const,
    },
    {
      category: SETTING_CATEGORIES.QUOTES,
      key: 'requireApproval',
      value: false,
      type: 'boolean' as const,
    },

    // Notifications
    {
      category: SETTING_CATEGORIES.NOTIFICATIONS,
      key: 'emailEnabled',
      value: true,
      type: 'boolean' as const,
    },
    {
      category: SETTING_CATEGORIES.NOTIFICATIONS,
      key: 'smsEnabled',
      value: false,
      type: 'boolean' as const,
    },
  ];

  for (const setting of defaults) {
    await db
      .insert(systemSettings)
      .values({
        organizationId,
        category: setting.category,
        key: setting.key,
        value: setting.value,
        type: setting.type,
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoNothing();
  }
}
