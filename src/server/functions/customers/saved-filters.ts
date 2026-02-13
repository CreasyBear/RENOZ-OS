/**
 * Saved Customer Filters Server Functions
 *
 * Server functions for managing user-saved customer filter presets.
 * Uses user preferences system with category "customer_filters".
 * Schemas from lib/schemas per SCHEMA-TRACE.md.
 *
 * @see drizzle/schema/users/user-preferences.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userPreferences } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ConflictError, NotFoundError } from '@/lib/server/errors';
import type {
  SavedCustomerFilter,
  SavedCustomerFilterWire,
} from '@/lib/schemas/customers/saved-filters';
import type { JsonValue } from '@/lib/schemas/_shared/patterns';
import {
  saveFilterSchema,
  updateFilterSchema,
  deleteFilterSchema,
} from '@/lib/schemas/customers/saved-filters';

// Re-export for hook consumers
export type { SavedCustomerFilter };

// ============================================================================
// CONSTANTS
// ============================================================================

const CUSTOMER_FILTERS_CATEGORY = 'customer_filters';

// ============================================================================
// GET SAVED FILTERS
// ============================================================================

/**
 * Get all saved customer filters for the current user.
 * Returns wire type (SavedCustomerFilterWire) per SCHEMA-TRACE ServerFn boundary.
 */
export const getSavedCustomerFilters = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SavedCustomerFilterWire[]> => {
    const ctx = await withAuth();

    const preferences = await db
      .select({
        id: userPreferences.id,
        key: userPreferences.key,
        value: userPreferences.value,
        createdAt: userPreferences.createdAt,
        updatedAt: userPreferences.updatedAt,
      })
      .from(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, ctx.user.id),
          eq(userPreferences.category, CUSTOMER_FILTERS_CATEGORY)
        )
      )
      .orderBy(userPreferences.createdAt);

    return preferences.map((pref) => ({
      id: pref.id,
      name: pref.key,
      filters: (pref.value ?? {}) as Record<string, JsonValue>,
      createdAt: pref.createdAt,
      updatedAt: pref.updatedAt,
    }));
  }
);

// ============================================================================
// SAVE FILTER
// ============================================================================

/**
 * Save a new customer filter preset.
 */
export const saveCustomerFilter = createServerFn({ method: 'POST' })
  .inputValidator(saveFilterSchema)
  .handler(async ({ data }): Promise<SavedCustomerFilterWire> => {
    const ctx = await withAuth();

    // M08: Wrap check-then-insert in transaction to avoid race condition
    // L02: Use ConflictError instead of generic Error
    const created = await db.transaction(async (tx) => {
      // Check if filter with same name already exists
      const [existing] = await tx
        .select({ id: userPreferences.id })
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, ctx.user.id),
            eq(userPreferences.category, CUSTOMER_FILTERS_CATEGORY),
            eq(userPreferences.key, data.name)
          )
        )
        .limit(1);

      if (existing) {
        throw new ConflictError(`A saved filter named "${data.name}" already exists`);
      }

      const [result] = await tx
        .insert(userPreferences)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          category: CUSTOMER_FILTERS_CATEGORY,
          key: data.name,
          value: (data.filters ?? {}) as Record<string, JsonValue>,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      return result;
    });

    return {
      id: created.id,
      name: created.key,
      filters: (created.value ?? {}) as Record<string, JsonValue>,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  });

// ============================================================================
// UPDATE FILTER
// ============================================================================

/**
 * Update an existing saved filter.
 */
export const updateSavedCustomerFilter = createServerFn({ method: 'POST' })
  .inputValidator(updateFilterSchema)
  .handler(async ({ data }): Promise<SavedCustomerFilterWire> => {
    const ctx = await withAuth();

    const [existing] = await db
      .select({ id: userPreferences.id, key: userPreferences.key })
      .from(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, ctx.user.id),
          eq(userPreferences.category, CUSTOMER_FILTERS_CATEGORY),
          eq(userPreferences.id, data.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Saved filter not found', 'saved_filter');
    }

    // If name is being changed, check for conflicts
    if (data.name && data.name !== existing.key) {
      const [conflict] = await db
        .select({ id: userPreferences.id })
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, ctx.user.id),
            eq(userPreferences.category, CUSTOMER_FILTERS_CATEGORY),
            eq(userPreferences.key, data.name)
          )
        )
        .limit(1);

      if (conflict) {
        throw new ConflictError(`A saved filter named "${data.name}" already exists`);
      }
    }

    const updateData: Partial<typeof userPreferences.$inferInsert> = {
      updatedBy: ctx.user.id,
    };

    if (data.name) {
      updateData.key = data.name;
    }
    if (data.filters) {
      updateData.value = data.filters;
    }

    const [updated] = await db
      .update(userPreferences)
      .set(updateData)
      .where(eq(userPreferences.id, data.id))
      .returning();

    return {
      id: updated.id,
      name: updated.key,
      filters: (updated.value ?? {}) as Record<string, JsonValue>,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });

// ============================================================================
// DELETE FILTER
// ============================================================================

/**
 * Delete a saved filter.
 */
export const deleteSavedCustomerFilter = createServerFn({ method: 'POST' })
  .inputValidator(deleteFilterSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    const deleted = await db
      .delete(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, ctx.user.id),
          eq(userPreferences.category, CUSTOMER_FILTERS_CATEGORY),
          eq(userPreferences.id, data.id)
        )
      )
      .returning({ id: userPreferences.id });

    return {
      success: deleted.length > 0,
    };
  });
