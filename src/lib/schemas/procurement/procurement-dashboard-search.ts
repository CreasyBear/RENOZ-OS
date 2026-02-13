import { z } from 'zod'

export const procurementDashboardSearchSchema = z.object({
  range: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  from: z.string().optional(),
  to: z.string().optional(),
})

export type ProcurementDashboardSearch = z.infer<typeof procurementDashboardSearchSchema>
