/**
 * Dashboard Layouts Validation Schemas
 *
 * Zod schemas for user dashboard configurations.
 * Matches JSONB types from drizzle/schema/dashboard/dashboard-layouts.ts
 *
 * @see drizzle/schema/dashboard/dashboard-layouts.ts
 * @see design-patterns.md Section 2 - Zod Schemas
 */

import { z } from 'zod';
import { idParamSchema, paginationSchema } from '../_shared/patterns';
import { userRoleSchema } from '../auth/auth';

// ============================================================================
// DASHBOARD WIDGET TYPES
// ============================================================================

export const dashboardWidgetTypeValues = [
  'kpi_cards',
  'revenue_chart',
  'orders_chart',
  'customers_chart',
  'inventory_chart',
  'pipeline_chart',
  'recent_activities',
  'upcoming_tasks',
  'alerts',
  'quick_actions',
  'kwh_deployed_chart',
  'warranty_claims_chart',
  'target_progress',
] as const;

export const dashboardWidgetTypeSchema = z.enum(dashboardWidgetTypeValues);

export type DashboardWidgetType = z.infer<typeof dashboardWidgetTypeSchema>;

// ============================================================================
// CHART TYPES
// ============================================================================

export const chartTypeValues = ['line', 'bar', 'pie', 'area'] as const;

export const chartTypeSchema = z.enum(chartTypeValues);

export type ChartType = z.infer<typeof chartTypeSchema>;

// ============================================================================
// DATE RANGE PRESETS
// ============================================================================

export const widgetDateRangeValues = ['7d', '30d', '90d', '365d', 'custom'] as const;

export const widgetDateRangeSchema = z.enum(widgetDateRangeValues);

export type WidgetDateRange = z.infer<typeof widgetDateRangeSchema>;

// ============================================================================
// WIDGET POSITION (matches WidgetPosition interface from Drizzle)
// ============================================================================

export const widgetPositionSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  width: z.number().int().min(1).max(12),
  height: z.number().int().min(1).max(8),
});

export type WidgetPosition = z.infer<typeof widgetPositionSchema>;

// ============================================================================
// WIDGET SETTINGS (matches WidgetSettings interface from Drizzle)
// ============================================================================

export const widgetSettingsSchema = z.object({
  metric: z.string().optional(),
  chartType: chartTypeSchema.optional(),
  dateRange: widgetDateRangeSchema.optional(),
  showTrend: z.boolean().optional(),
  showTarget: z.boolean().optional(),
  refreshInterval: z.number().int().min(30).max(3600).optional(), // 30s to 1hr
});

export type WidgetSettings = z.infer<typeof widgetSettingsSchema>;

// ============================================================================
// WIDGET CONFIG (matches WidgetConfig interface from Drizzle)
// ============================================================================

export const widgetConfigSchema = z.object({
  id: z.string(),
  type: dashboardWidgetTypeSchema,
  title: z.string().min(1).max(100),
  position: widgetPositionSchema,
  settings: widgetSettingsSchema,
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;

// ============================================================================
// THEME OPTIONS
// ============================================================================

export const themeValues = ['light', 'dark', 'system'] as const;

export const themeSchema = z.enum(themeValues);

export type Theme = z.infer<typeof themeSchema>;

// ============================================================================
// DASHBOARD LAYOUT CONFIG (matches DashboardLayoutConfig from Drizzle)
// ============================================================================

export const dashboardLayoutConfigSchema = z.object({
  widgets: z.array(widgetConfigSchema).min(1, 'At least one widget is required'),
  gridColumns: z.number().int().min(1).max(12).default(12),
  theme: themeSchema.default('system'),
  compactMode: z.boolean().default(false),
});

export type DashboardLayoutConfig = z.infer<typeof dashboardLayoutConfigSchema>;

// ============================================================================
// DASHBOARD FILTERS (matches DashboardFilters from Drizzle)
// ============================================================================

export const layoutDateRangePresetValues = ['7d', '30d', '90d', '365d', 'custom'] as const;

export const layoutDateRangePresetSchema = z.enum(layoutDateRangePresetValues);

export const layoutComparisonTypeValues = ['previous_period', 'previous_year'] as const;

export const layoutComparisonTypeSchema = z.enum(layoutComparisonTypeValues);

export const dashboardFiltersSchema = z.object({
  dateRangeStart: z.string().nullable(),
  dateRangeEnd: z.string().nullable(),
  dateRangePreset: layoutDateRangePresetSchema.nullable(),
  comparisonEnabled: z.boolean().default(false),
  comparisonType: layoutComparisonTypeSchema.nullable(),
});

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;

// ============================================================================
// CREATE DASHBOARD LAYOUT
// ============================================================================

export const createDashboardLayoutSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  isDefault: z.boolean().default(false),
  layout: dashboardLayoutConfigSchema,
  filters: dashboardFiltersSchema.optional(),
});

export type CreateDashboardLayoutInput = z.infer<typeof createDashboardLayoutSchema>;

// ============================================================================
// UPDATE DASHBOARD LAYOUT
// ============================================================================

export const updateDashboardLayoutSchema = createDashboardLayoutSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateDashboardLayoutInput = z.infer<typeof updateDashboardLayoutSchema>;

// ============================================================================
// SAVE LAYOUT (simplified for quick save)
// ============================================================================

export const saveDashboardLayoutSchema = z.object({
  layout: dashboardLayoutConfigSchema,
  filters: dashboardFiltersSchema.optional(),
});

export type SaveDashboardLayoutInput = z.infer<typeof saveDashboardLayoutSchema>;

// ============================================================================
// LIST DASHBOARD LAYOUTS
// ============================================================================

export const listDashboardLayoutsSchema = paginationSchema.extend({
  isDefault: z.boolean().optional(),
  search: z.string().max(255).optional(),
});

export type ListDashboardLayoutsInput = z.infer<typeof listDashboardLayoutsSchema>;

// ============================================================================
// GET DASHBOARD LAYOUT
// ============================================================================

export const getDashboardLayoutSchema = idParamSchema;

export type GetDashboardLayoutInput = z.infer<typeof getDashboardLayoutSchema>;

// ============================================================================
// DELETE DASHBOARD LAYOUT
// ============================================================================

export const deleteDashboardLayoutSchema = idParamSchema;

export type DeleteDashboardLayoutInput = z.infer<typeof deleteDashboardLayoutSchema>;

// ============================================================================
// DASHBOARD LAYOUT OUTPUT
// ============================================================================

// userRoleSchema imported from ../auth/auth

export const dashboardLayoutSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  isDefault: z.boolean(),
  roleDefault: userRoleSchema.nullable(),
  layout: dashboardLayoutConfigSchema,
  filters: dashboardFiltersSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;

// ============================================================================
// SET DEFAULT LAYOUT
// ============================================================================

export const setDefaultDashboardLayoutSchema = idParamSchema;

export type SetDefaultDashboardLayoutInput = z.infer<typeof setDefaultDashboardLayoutSchema>;

// ============================================================================
// CLONE DASHBOARD LAYOUT
// ============================================================================

export const cloneDashboardLayoutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
});

export type CloneDashboardLayoutInput = z.infer<typeof cloneDashboardLayoutSchema>;

// ============================================================================
// RESET LAYOUT TO ROLE DEFAULT
// ============================================================================

export const resetDashboardLayoutSchema = z.object({
  role: z.string().optional(), // If not provided, resets to user's current role default
});

export type ResetDashboardLayoutInput = z.infer<typeof resetDashboardLayoutSchema>;

// ============================================================================
// WIDGET DEFINITION (available widgets)
// ============================================================================

export const widgetDefinitionSchema = z.object({
  type: dashboardWidgetTypeSchema,
  name: z.string(),
  description: z.string(),
  defaultSettings: widgetSettingsSchema,
  minWidth: z.number().int().min(1).max(12).default(2),
  minHeight: z.number().int().min(1).max(8).default(1),
  maxWidth: z.number().int().min(1).max(12).default(12),
  maxHeight: z.number().int().min(1).max(8).default(4),
  requiredPermission: z.string().optional(),
});

export type WidgetDefinition = z.infer<typeof widgetDefinitionSchema>;

// ============================================================================
// GET USER LAYOUT RESPONSE
// ============================================================================

export const getUserLayoutResponseSchema = z.object({
  layout: dashboardLayoutSchema.nullable(),
  availableWidgets: z.array(widgetDefinitionSchema),
});

export type GetUserLayoutResponse = z.infer<typeof getUserLayoutResponseSchema>;

// ============================================================================
// FILTER STATE
// ============================================================================

export interface DashboardLayoutsFiltersState {
  isDefault: boolean | null;
  search: string;
}

export const defaultDashboardLayoutsFilters: DashboardLayoutsFiltersState = {
  isDefault: null,
  search: '',
};
