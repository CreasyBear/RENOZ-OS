import { z } from 'zod';
import {
  filterSchema,
  idParamSchema,
  normalizeObjectInput,
  paginationSchema,
} from '../_shared/patterns';

export const forecastIntervalValues = ['daily', 'weekly', 'monthly'] as const;

export const forecastIntervalSchema = z.enum(forecastIntervalValues);

// ============================================================================
// INVENTORY FORECASTS
// ============================================================================

export const createForecastSchema = z.object({
  productId: z.string().uuid('Product is required'),
  forecastDate: z.coerce.date(),
  forecastPeriod: forecastIntervalSchema,
  demandQuantity: z.coerce.number().min(0),
  forecastAccuracy: z.coerce.number().min(0).max(100).optional(),
  confidenceLevel: z.coerce.number().min(0).max(100).optional(),
  safetyStockLevel: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  recommendedOrderQuantity: z.number().int().min(0).optional(),
});

export type CreateForecast = z.infer<typeof createForecastSchema>;

export const updateForecastSchema = createForecastSchema.partial().omit({
  productId: true,
  forecastDate: true,
  forecastPeriod: true,
});

export type UpdateForecast = z.infer<typeof updateForecastSchema>;

export const forecastSchema = createForecastSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  calculatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type Forecast = z.infer<typeof forecastSchema>;

export const forecastFilterSchema = filterSchema.extend({
  productId: z.string().uuid().optional(),
  forecastPeriod: forecastIntervalSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ForecastFilter = z.infer<typeof forecastFilterSchema>;

export const forecastListQuerySchema = normalizeObjectInput(
  paginationSchema.merge(forecastFilterSchema)
);
export type ForecastListQuery = z.infer<typeof forecastListQuerySchema>;

export const forecastParamsSchema = idParamSchema;
export type ForecastParams = z.infer<typeof forecastParamsSchema>;

/**
 * Reorder recommendation for forecasting
 */
export interface ReorderRecommendation {
  productId: string;
  productSku: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  recommendedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  daysUntilStockout: number | null;
  locationCount?: number;
  locations?: Array<{
    locationId: string;
    locationName: string;
    locationCode: string | null;
    quantityOnHand: number;
    quantityAvailable: number;
  }>;
}

/**
 * Forecast list result
 */
export interface ListForecastsResult {
  forecasts: Array<{
    id: string;
    organizationId: string;
    productId: string;
    forecastDate: string;
    forecastPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    demandQuantity: string;
    forecastAccuracy: string | null;
    confidenceLevel: string | null;
    safetyStockLevel: number | null;
    reorderPoint: number | null;
    recommendedOrderQuantity: number | null;
    calculatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
