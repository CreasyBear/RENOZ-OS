/**
 * Dashboard Layouts Server Functions
 *
 * Server functions for user dashboard configurations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId + userId for multi-tenant and user isolation.
 *
 * @see src/lib/schemas/dashboard/layouts.ts for validation schemas
 * @see drizzle/schema/dashboard/dashboard-layouts.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, ilike, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { dashboardLayouts } from 'drizzle/schema/dashboard';
import {
  createDashboardLayoutSchema,
  updateDashboardLayoutSchema,
  saveDashboardLayoutSchema,
  listDashboardLayoutsSchema,
  getDashboardLayoutSchema,
  deleteDashboardLayoutSchema,
  setDefaultDashboardLayoutSchema,
  cloneDashboardLayoutSchema,
  type WidgetDefinition,
} from '@/lib/schemas/dashboard/layouts';

// ============================================================================
// DEFAULT WIDGET DEFINITIONS
// ============================================================================

const DEFAULT_WIDGETS: WidgetDefinition[] = [
  {
    type: 'kpi_cards',
    name: 'KPI Cards',
    description: 'Display key performance indicators',
    defaultSettings: {},
    minWidth: 4,
    minHeight: 1,
    maxWidth: 12,
    maxHeight: 2,
  },
  {
    type: 'revenue_chart',
    name: 'Revenue Chart',
    description: 'Revenue trend over time',
    defaultSettings: { chartType: 'line', dateRange: '30d' },
    minWidth: 4,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 4,
  },
  {
    type: 'orders_chart',
    name: 'Orders Chart',
    description: 'Order volume over time',
    defaultSettings: { chartType: 'bar', dateRange: '30d' },
    minWidth: 4,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 4,
  },
  {
    type: 'customers_chart',
    name: 'Customer Growth',
    description: 'New customer acquisition trend',
    defaultSettings: { chartType: 'area', dateRange: '90d' },
    minWidth: 4,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 4,
  },
  {
    type: 'pipeline_chart',
    name: 'Pipeline',
    description: 'Sales pipeline by stage',
    defaultSettings: { chartType: 'bar' },
    minWidth: 4,
    minHeight: 2,
    maxWidth: 8,
    maxHeight: 4,
  },
  {
    type: 'recent_activities',
    name: 'Recent Activity',
    description: 'Latest actions and updates',
    defaultSettings: {},
    minWidth: 3,
    minHeight: 2,
    maxWidth: 6,
    maxHeight: 4,
  },
  {
    type: 'upcoming_tasks',
    name: 'Upcoming Tasks',
    description: 'Scheduled tasks and deadlines',
    defaultSettings: {},
    minWidth: 3,
    minHeight: 2,
    maxWidth: 6,
    maxHeight: 4,
  },
  {
    type: 'alerts',
    name: 'Alerts',
    description: 'Important notifications and alerts',
    defaultSettings: {},
    minWidth: 3,
    minHeight: 1,
    maxWidth: 6,
    maxHeight: 3,
  },
  {
    type: 'quick_actions',
    name: 'Quick Actions',
    description: 'Shortcuts to common tasks',
    defaultSettings: {},
    minWidth: 2,
    minHeight: 1,
    maxWidth: 4,
    maxHeight: 2,
  },
  {
    type: 'target_progress',
    name: 'Target Progress',
    description: 'Progress toward KPI targets',
    defaultSettings: {},
    minWidth: 4,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 4,
  },
];

// ============================================================================
// LAYOUTS CRUD
// ============================================================================

/**
 * List user's dashboard layouts.
 */
export const listDashboardLayouts = createServerFn({ method: 'GET' })
  .inputValidator(listDashboardLayoutsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    const { page = 1, pageSize = 20, search, isDefault } = data;

    // Build where conditions - user can only see their own layouts
    const conditions = [
      eq(dashboardLayouts.organizationId, ctx.organizationId),
      eq(dashboardLayouts.userId, ctx.user.id),
    ];

    if (search) {
      conditions.push(ilike(dashboardLayouts.name, `%${search}%`));
    }
    if (isDefault !== undefined) {
      conditions.push(eq(dashboardLayouts.isDefault, isDefault));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(dashboardLayouts)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;

    const items = await db
      .select()
      .from(dashboardLayouts)
      .where(whereClause)
      .orderBy(desc(dashboardLayouts.isDefault), desc(dashboardLayouts.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get a single dashboard layout.
 */
export const getDashboardLayout = createServerFn({ method: 'GET' })
  .inputValidator(getDashboardLayoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    const [layout] = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.id, data.id),
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!layout) {
      throw new Error('Layout not found');
    }

    return layout;
  });

/**
 * Get the current user's layout (default or most recent).
 * Note: Returns raw DB types for layout - client should validate if needed.
 */
export const getUserLayout = createServerFn({ method: 'GET' }).handler(
  async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    // Try to get user's default layout
    let [layout] = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id),
          eq(dashboardLayouts.isDefault, true)
        )
      )
      .limit(1);

    // If no default, get most recently updated
    if (!layout) {
      [layout] = await db
        .select()
        .from(dashboardLayouts)
        .where(
          and(
            eq(dashboardLayouts.organizationId, ctx.organizationId),
            eq(dashboardLayouts.userId, ctx.user.id)
          )
        )
        .orderBy(desc(dashboardLayouts.updatedAt))
        .limit(1);
    }

    return {
      layout: layout ?? null,
      availableWidgets: DEFAULT_WIDGETS,
    };
  }
);

/**
 * Create a new dashboard layout.
 */
export const createDashboardLayout = createServerFn({ method: 'POST' })
  .inputValidator(createDashboardLayoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.update });

    // If this is marked as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(dashboardLayouts)
        .set({ isDefault: false })
        .where(
          and(
            eq(dashboardLayouts.organizationId, ctx.organizationId),
            eq(dashboardLayouts.userId, ctx.user.id),
            eq(dashboardLayouts.isDefault, true)
          )
        );
    }

    const [layout] = await db
      .insert(dashboardLayouts)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        name: data.name,
        isDefault: data.isDefault ?? false,
        layout: data.layout,
        filters: data.filters ?? {
          dateRangeStart: null,
          dateRangeEnd: null,
          dateRangePreset: '30d',
          comparisonEnabled: false,
          comparisonType: null,
        },
      })
      .returning();

    return layout;
  });

/**
 * Update an existing dashboard layout.
 */
export const updateDashboardLayout = createServerFn({ method: 'POST' })
  .inputValidator(updateDashboardLayoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.update });

    const { id, ...updates } = data;

    // If setting as default, unset other defaults first
    if (updates.isDefault) {
      await db
        .update(dashboardLayouts)
        .set({ isDefault: false })
        .where(
          and(
            eq(dashboardLayouts.organizationId, ctx.organizationId),
            eq(dashboardLayouts.userId, ctx.user.id),
            eq(dashboardLayouts.isDefault, true)
          )
        );
    }

    // Build update object
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.isDefault !== undefined) updateValues.isDefault = updates.isDefault;
    if (updates.layout !== undefined) updateValues.layout = updates.layout;
    if (updates.filters !== undefined) updateValues.filters = updates.filters;

    const [layout] = await db
      .update(dashboardLayouts)
      .set(updateValues)
      .where(
        and(
          eq(dashboardLayouts.id, id),
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id)
        )
      )
      .returning();

    if (!layout) {
      throw new Error('Layout not found');
    }

    return layout;
  });

/**
 * Quick save current layout without changing name/default.
 */
export const saveDashboardLayout = createServerFn({ method: 'POST' })
  .inputValidator(saveDashboardLayoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.update });

    // Get user's default layout or create one
    let [layout] = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id),
          eq(dashboardLayouts.isDefault, true)
        )
      )
      .limit(1);

    if (layout) {
      // Update existing
      [layout] = await db
        .update(dashboardLayouts)
        .set({
          layout: data.layout,
          filters: data.filters,
          updatedAt: new Date(),
        })
        .where(eq(dashboardLayouts.id, layout.id))
        .returning();
    } else {
      // Create new default
      [layout] = await db
        .insert(dashboardLayouts)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          name: 'My Dashboard',
          isDefault: true,
          layout: data.layout,
          filters: data.filters ?? {
            dateRangeStart: null,
            dateRangeEnd: null,
            dateRangePreset: '30d',
            comparisonEnabled: false,
            comparisonType: null,
          },
        })
        .returning();
    }

    return layout;
  });

/**
 * Delete a dashboard layout.
 */
export const deleteDashboardLayout = createServerFn({ method: 'POST' })
  .inputValidator(deleteDashboardLayoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.update });

    const [layout] = await db
      .delete(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.id, data.id),
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id)
        )
      )
      .returning();

    if (!layout) {
      throw new Error('Layout not found');
    }

    return { success: true };
  });

/**
 * Set a layout as the default.
 */
export const setDefaultDashboardLayout = createServerFn({ method: 'POST' })
  .inputValidator(setDefaultDashboardLayoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.update });

    // Unset all existing defaults
    await db
      .update(dashboardLayouts)
      .set({ isDefault: false })
      .where(
        and(
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id),
          eq(dashboardLayouts.isDefault, true)
        )
      );

    // Set the new default
    const [layout] = await db
      .update(dashboardLayouts)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(dashboardLayouts.id, data.id),
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id)
        )
      )
      .returning();

    if (!layout) {
      throw new Error('Layout not found');
    }

    return layout;
  });

/**
 * Clone an existing layout.
 */
export const cloneDashboardLayout = createServerFn({ method: 'POST' })
  .inputValidator(cloneDashboardLayoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.update });

    // Get the source layout
    const [source] = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.id, data.id),
          eq(dashboardLayouts.organizationId, ctx.organizationId),
          eq(dashboardLayouts.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!source) {
      throw new Error('Source layout not found');
    }

    // Create the clone
    const [clone] = await db
      .insert(dashboardLayouts)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        name: data.name,
        isDefault: false,
        layout: source.layout,
        filters: source.filters,
      })
      .returning();

    return clone;
  });

/**
 * Get available widgets for dashboard building.
 */
export const getAvailableWidgets = createServerFn({ method: 'GET' }).handler(async () => {
  await withAuth({ permission: PERMISSIONS.dashboard.read });

  return DEFAULT_WIDGETS;
});
