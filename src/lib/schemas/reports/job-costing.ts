import { z } from 'zod'

export const jobCostingReportSearchSchema = z.object({
  period: z
    .enum(['this-month', 'last-month', 'this-quarter', 'this-year', 'all-time'])
    .default('this-month'),
  customerId: z.string().optional().default('all'),
  jobType: z
    .enum([
      'all',
      'installation',
      'service',
      'warranty',
      'inspection',
      'commissioning',
    ])
    .default('all'),
  status: z
    .enum([
      'all',
      'completed',
      'in_progress',
      'scheduled',
      'on_hold',
      'cancelled',
    ])
    .default('completed'),
})

export type JobCostingReportSearch = z.infer<typeof jobCostingReportSearchSchema>
