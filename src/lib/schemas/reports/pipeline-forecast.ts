import { z } from 'zod'

const booleanFromSearch = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

export const pipelineForecastSearchSchema = z.object({
  period: z
    .enum([
      'this-month',
      'next-3-months',
      'this-quarter',
      'this-year',
      'next-12-months',
    ])
    .default('next-12-months'),
  groupBy: z.enum(['week', 'month', 'quarter']).default('month'),
  showWeighted: booleanFromSearch.default(true),
  tab: z
    .enum(['overview', 'by-period', 'velocity', 'attribution'])
    .default('overview'),
})

export type PipelineForecastSearch = z.infer<typeof pipelineForecastSearchSchema>
