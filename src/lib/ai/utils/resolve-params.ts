/**
 * Parameter Resolution Utility
 *
 * Implements three-tier priority for tool parameters:
 * 1. forcedToolCall.toolParams (widget click - highest priority)
 * 2. AI params (AI-provided values from user query)
 * 3. metricsFilter (dashboard state)
 * 4. Schema defaults (fallback)
 *
 * Implements ARCH-002 from helicopter review.
 *
 * @see patterns/03-parameter-resolution.md
 */

import { z } from 'zod';
import type { MetricsFilter, ToolExecutionContext } from '../context';

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get the start and end dates for a period.
 */
export function getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: yesterday,
        endDate: new Date(today.getTime() - 1),
      };
    }

    case 'this_week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      return {
        startDate: startOfWeek,
        endDate: now,
      };
    }

    case 'last_week': {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(today);
      endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
      endOfLastWeek.setHours(23, 59, 59, 999);
      return {
        startDate: startOfLastWeek,
        endDate: endOfLastWeek,
      };
    }

    case 'this_month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };

    case 'last_month': {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      lastOfLastMonth.setHours(23, 59, 59, 999);
      return {
        startDate: firstOfLastMonth,
        endDate: lastOfLastMonth,
      };
    }

    case 'this_quarter': {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return {
        startDate: quarterStart,
        endDate: now,
      };
    }

    case 'last_quarter': {
      const lastQuarterStart = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3 - 3,
        1
      );
      const lastQuarterEnd = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        0
      );
      lastQuarterEnd.setHours(23, 59, 59, 999);
      return {
        startDate: lastQuarterStart,
        endDate: lastQuarterEnd,
      };
    }

    case 'this_year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now,
      };

    case 'last_year': {
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
      lastYearEnd.setHours(23, 59, 59, 999);
      return {
        startDate: lastYearStart,
        endDate: lastYearEnd,
      };
    }

    case 'last_7_days':
      return {
        startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: now,
      };

    case 'last_30_days':
      return {
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now,
      };

    case 'last_90_days':
      return {
        startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: now,
      };

    default:
      // Default to last 30 days
      return {
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now,
      };
  }
}

/**
 * Format a date as YYYY-MM-DD string.
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// PARAMETER MAPPING
// ============================================================================

/**
 * Map MetricsFilter to common tool parameters.
 * This converts dashboard filter state into tool-compatible params.
 */
export function mapMetricsFilterToParams(
  filter?: MetricsFilter
): Record<string, unknown> {
  if (!filter) return {};

  const params: Record<string, unknown> = {};

  // Handle period to date conversion
  if (filter.period) {
    if (filter.period === 'custom' && filter.startDate && filter.endDate) {
      params.startDate = filter.startDate;
      params.endDate = filter.endDate;
    } else {
      const dates = getPeriodDates(filter.period);
      params.startDate = formatDateString(dates.startDate);
      params.endDate = formatDateString(dates.endDate);
      params.period = filter.period;
    }
  }

  // Pass through other filter values
  if (filter.customerId) {
    params.customerId = filter.customerId;
  }
  if (filter.status && filter.status.length > 0) {
    params.status = filter.status;
  }
  if (filter.jobId) {
    params.jobId = filter.jobId;
  }
  if (filter.category) {
    params.category = filter.category;
  }

  return params;
}

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

/**
 * Extract default values from a Zod schema.
 * Returns an object with all fields that have default values.
 */
export function getSchemaDefaults<T extends z.ZodSchema>(
  schema: T
): Partial<z.infer<T>> {
  const defaults: Record<string, unknown> = {};

  // Handle ZodObject
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (fieldSchema instanceof z.ZodDefault) {
        defaults[key] = (fieldSchema._def as { defaultValue: () => unknown }).defaultValue();
      }
    }
  }

  return defaults as Partial<z.infer<T>>;
}

// ============================================================================
// PARAMETER RESOLUTION
// ============================================================================

/**
 * Resolve tool parameters using three-tier priority.
 *
 * Priority order (highest to lowest):
 * 1. forcedToolParams - From widget clicks
 * 2. aiParams - From AI interpretation of user query
 * 3. dashboardParams - From metricsFilter dashboard state
 * 4. defaults - From Zod schema defaults
 *
 * @example
 * ```typescript
 * const resolved = resolveToolParams(
 *   getOrdersSchema,
 *   { status: 'pending' }, // AI-provided
 *   {
 *     metricsFilter: { period: 'this_month' },
 *     forcedToolParams: { limit: 10 },
 *   }
 * );
 * // Result: { status: 'pending', limit: 10, startDate: '2024-01-01', endDate: '2024-01-31' }
 * ```
 */
export function resolveToolParams<T extends z.ZodSchema>(
  schema: T,
  aiParams: Partial<z.infer<T>>,
  context: Pick<ToolExecutionContext, 'metricsFilter' | 'forcedToolParams'>
): z.infer<T> {
  // 1. Get schema defaults (lowest priority)
  const defaults = getSchemaDefaults(schema);

  // 2. Get dashboard params from metricsFilter
  const dashboardParams = mapMetricsFilterToParams(context.metricsFilter);

  // 3. Merge in priority order (later overrides earlier)
  const merged = {
    ...defaults,          // 4th priority: schema defaults
    ...dashboardParams,   // 3rd priority: dashboard state
    ...aiParams,          // 2nd priority: AI-provided params
    ...context.forcedToolParams, // 1st priority: widget click params
  };

  // 4. Parse through schema to validate and apply defaults
  return schema.parse(merged);
}

/**
 * Resolve tool parameters with optional schema validation.
 * Returns the merged params without throwing on validation failure.
 */
export function resolveToolParamsSafe<T extends z.ZodSchema>(
  schema: T,
  aiParams: Partial<z.infer<T>>,
  context: Pick<ToolExecutionContext, 'metricsFilter' | 'forcedToolParams'>
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  try {
    const resolved = resolveToolParams(schema, aiParams, context);
    return { success: true, data: resolved };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}
