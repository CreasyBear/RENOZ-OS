import { z } from 'zod'

export const customerReportsSearchSchema = z.object({
  tab: z.enum(['dashboard', 'lifecycle', 'value']).default('dashboard'),
  dateRange: z.enum(['7d', '30d', '90d', '365d', 'all']).default('30d'),
  valueRange: z.enum(['3m', '6m', '1y']).default('6m'),
  lifecycleRange: z.enum(['3m', '6m', '1y']).default('6m'),
})

export type CustomerReportsSearch = z.infer<typeof customerReportsSearchSchema>

/** Report date range filter values (customer reports tab) */
export type CustomerReportDateRange = '7d' | '30d' | '90d' | '365d' | 'all'

/** Value analysis range filter values */
export type ValueRange = '3m' | '6m' | '1y'

/** Lifecycle analytics range filter values */
export type LifecycleRange = '3m' | '6m' | '1y'

/** Filter state for customer report date range */
export interface CustomerReportDateFilterState extends Record<string, unknown> {
  dateRange: CustomerReportDateRange
}

/** Filter state for customer report lifecycle range */
export interface CustomerReportLifecycleFilterState extends Record<string, unknown> {
  lifecycleRange: LifecycleRange
}

/** Filter state for customer report value range */
export interface CustomerReportValueFilterState extends Record<string, unknown> {
  valueRange: ValueRange
}
