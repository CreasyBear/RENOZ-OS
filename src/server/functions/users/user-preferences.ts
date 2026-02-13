/**
 * User Preferences Server Functions
 *
 * Server functions for user preference management.
 * Supports category/key/value pattern for flexible preferences.
 *
 * @see drizzle/schema/user-preferences.ts for database schema
 * @see src/lib/schemas/users.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userPreferences } from 'drizzle/schema';
import { setResponseStatus } from '@tanstack/react-start/server';
import { withAuth, withInternalAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import {
  setPreferenceSchema,
  setPreferencesSchema,
  getPreferencesSchema,
  resetPreferencesSchema,
  type Preference,
} from '@/lib/schemas/users';
import type { JsonValue } from '@/lib/schemas/_shared/patterns';
import { PREFERENCE_CATEGORIES } from 'drizzle/schema';

// ============================================================================
// GET ALL PREFERENCES
// ============================================================================

/**
 * Get all preferences for the current user.
 * Optionally filter by category.
 */
export const getPreferences = createServerFn({ method: 'GET' })
  .inputValidator(getPreferencesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(userPreferences.userId, ctx.user.id),
      eq(userPreferences.organizationId, ctx.organizationId),
    ];
    if (data.category) {
      conditions.push(eq(userPreferences.category, data.category));
    }

    const preferences = await db
      .select({
        id: userPreferences.id,
        userId: userPreferences.userId,
        category: userPreferences.category,
        key: userPreferences.key,
        value: userPreferences.value,
        createdAt: userPreferences.createdAt,
        updatedAt: userPreferences.updatedAt,
      })
      .from(userPreferences)
      .where(and(...conditions))
      .orderBy(userPreferences.category, userPreferences.key);

    // Group by category for easier consumption
    const grouped: Record<string, Record<string, JsonValue>> = {};
    for (const pref of preferences) {
      if (!grouped[pref.category]) {
        grouped[pref.category] = {};
      }
      grouped[pref.category][pref.key] = pref.value as JsonValue;
    }

    return {
      preferences: preferences as Preference[],
      grouped,
    };
  });

// ============================================================================
// GET SINGLE PREFERENCE
// ============================================================================

const getSinglePreferenceSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
});

/**
 * Get a single preference by category and key.
 */
export const getPreference = createServerFn({ method: 'GET' })
  .inputValidator(getSinglePreferenceSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [preference] = await db
      .select({
        id: userPreferences.id,
        userId: userPreferences.userId,
        category: userPreferences.category,
        key: userPreferences.key,
        value: userPreferences.value,
        createdAt: userPreferences.createdAt,
        updatedAt: userPreferences.updatedAt,
      })
      .from(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, ctx.user.id),
          eq(userPreferences.organizationId, ctx.organizationId),
          eq(userPreferences.category, data.category),
          eq(userPreferences.key, data.key)
        )
      )
      .limit(1);

    if (!preference) {
      setResponseStatus(404);
      throw new NotFoundError('User preference not found', 'userPreference');
    }

    return preference as Preference;
  });

// ============================================================================
// SET SINGLE PREFERENCE
// ============================================================================

/**
 * Set a single preference (upsert).
 */
export const setPreference = createServerFn({ method: 'POST' })
  .inputValidator(setPreferenceSchema)
  .handler(async ({ data }): Promise<Preference> => {
    const ctx = await withAuth();

    // Check if preference exists
    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, ctx.user.id),
          eq(userPreferences.organizationId, ctx.organizationId),
          eq(userPreferences.category, data.category),
          eq(userPreferences.key, data.key)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(userPreferences)
        .set({
          value: data.value,
          updatedBy: ctx.user.id,
          version: sql<number>`${userPreferences.version} + 1`,
        })
        .where(eq(userPreferences.id, existing.id))
        .returning();

      return {
        id: updated.id,
        userId: updated.userId,
        category: updated.category,
        key: updated.key,
        value: updated.value as Preference["value"],
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } else {
      // Create new
      const [created] = await db
        .insert(userPreferences)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          category: data.category,
          key: data.key,
          value: data.value,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      return {
        id: created.id,
        userId: created.userId,
        category: created.category,
        key: created.key,
        value: created.value as Preference["value"],
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    }
  });

// ============================================================================
// SET MULTIPLE PREFERENCES
// ============================================================================

/**
 * Set multiple preferences at once (batch upsert).
 */
export const setPreferences = createServerFn({ method: 'POST' })
  .inputValidator(setPreferencesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const results: Preference[] = [];

    // Process each preference
    for (const pref of data.preferences) {
      const [existing] = await db
        .select({ id: userPreferences.id })
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, ctx.user.id),
            eq(userPreferences.organizationId, ctx.organizationId),
            eq(userPreferences.category, pref.category),
            eq(userPreferences.key, pref.key)
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(userPreferences)
          .set({
            value: pref.value,
            updatedBy: ctx.user.id,
            version: sql<number>`${userPreferences.version} + 1`,
          })
          .where(eq(userPreferences.id, existing.id))
          .returning();

        results.push({
          id: updated.id,
          userId: updated.userId,
          category: updated.category,
          key: updated.key,
          value: updated.value as Preference["value"],
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        });
      } else {
        const [created] = await db
          .insert(userPreferences)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.user.id,
            category: pref.category,
            key: pref.key,
            value: pref.value,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();

        results.push({
          id: created.id,
          userId: created.userId,
          category: created.category,
          key: created.key,
          value: created.value as Preference["value"],
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        });
      }
    }

    return { preferences: results };
  });

// ============================================================================
// RESET PREFERENCES
// ============================================================================

/**
 * Reset/delete preferences.
 * Optionally reset only a specific category.
 */
export const resetPreferences = createServerFn({ method: 'POST' })
  .inputValidator(resetPreferencesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(userPreferences.userId, ctx.user.id),
      eq(userPreferences.organizationId, ctx.organizationId),
    ];
    if (data.category) {
      conditions.push(eq(userPreferences.category, data.category));
    }

    const deleted = await db
      .delete(userPreferences)
      .where(and(...conditions))
      .returning({ id: userPreferences.id });

    return {
      deletedCount: deleted.length,
      category: data.category || 'all',
    };
  });

// ============================================================================
// DELETE SINGLE PREFERENCE
// ============================================================================

const deletePreferenceSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
});

/**
 * Delete a single preference.
 */
export const deletePreference = createServerFn({ method: 'POST' })
  .inputValidator(deletePreferenceSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const deleted = await db
      .delete(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, ctx.user.id),
          eq(userPreferences.organizationId, ctx.organizationId),
          eq(userPreferences.category, data.category),
          eq(userPreferences.key, data.key)
        )
      )
      .returning({ id: userPreferences.id });

    return {
      success: deleted.length > 0,
    };
  });

// ============================================================================
// GET PREFERENCE CATEGORIES
// ============================================================================

/**
 * Get list of valid preference categories.
 * Useful for UI dropdowns and validation.
 */
export const getPreferenceCategories = createServerFn({ method: 'GET' }).handler(async () => {
  await withAuth();
  return Object.values(PREFERENCE_CATEGORIES);
});

// ============================================================================
// HELPER: GET DEFAULT PREFERENCES
// ============================================================================

/**
 * Get default preferences for a new user based on role.
 * Called internally when creating users.
 */
export function getDefaultPreferences(role: string): Array<{
  category: string;
  key: string;
  value: unknown;
}> {
  const defaults = [
    // Appearance
    { category: PREFERENCE_CATEGORIES.APPEARANCE, key: 'theme', value: 'system' },
    { category: PREFERENCE_CATEGORIES.APPEARANCE, key: 'density', value: 'comfortable' },

    // Notifications
    { category: PREFERENCE_CATEGORIES.NOTIFICATIONS, key: 'email', value: true },
    { category: PREFERENCE_CATEGORIES.NOTIFICATIONS, key: 'push', value: true },
    { category: PREFERENCE_CATEGORIES.NOTIFICATIONS, key: 'digest_frequency', value: 'daily' },

    // Dashboard
    { category: PREFERENCE_CATEGORIES.DASHBOARD, key: 'default_view', value: 'overview' },
    {
      category: PREFERENCE_CATEGORIES.DASHBOARD,
      key: 'widgets',
      value: ['tasks', 'notifications', 'recent_activity'],
    },

    // Data Display
    { category: PREFERENCE_CATEGORIES.DATA_DISPLAY, key: 'date_format', value: 'DD/MM/YYYY' },
    { category: PREFERENCE_CATEGORIES.DATA_DISPLAY, key: 'time_format', value: '24h' },
    { category: PREFERENCE_CATEGORIES.DATA_DISPLAY, key: 'page_size', value: 20 },

    // Localization
    { category: PREFERENCE_CATEGORIES.LOCALIZATION, key: 'timezone', value: 'Australia/Sydney' },
    { category: PREFERENCE_CATEGORIES.LOCALIZATION, key: 'locale', value: 'en-AU' },
    { category: PREFERENCE_CATEGORIES.LOCALIZATION, key: 'currency', value: 'AUD' },
  ];

  // Role-specific defaults
  if (role === 'sales') {
    defaults.push({
      category: PREFERENCE_CATEGORIES.DASHBOARD,
      key: 'default_view',
      value: 'pipeline',
    });
  } else if (role === 'operations') {
    defaults.push({
      category: PREFERENCE_CATEGORIES.DASHBOARD,
      key: 'default_view',
      value: 'orders',
    });
  }

  return defaults;
}

// ============================================================================
// INITIALIZE USER PREFERENCES
// ============================================================================

/**
 * Initialize preferences for a new user.
 * Called when user accepts invitation or is created.
 */
export const initializeUserPreferences = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      organizationId: z.string().uuid(),
      role: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await withInternalAuth();

    const defaults = getDefaultPreferences(data.role);

    const created = await db
      .insert(userPreferences)
      .values(
        defaults.map((pref) => ({
          organizationId: data.organizationId,
          userId: data.userId,
          category: pref.category,
          key: pref.key,
          value: pref.value,
        }))
      )
      .returning({ id: userPreferences.id });

    return {
      count: created.length,
    };
  });
