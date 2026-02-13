/**
 * Scheduled Reports Search Schemas
 *
 * Zod schemas for scheduled reports route search state.
 */
import { z } from 'zod';
import { reportFrequencySchema, reportFormatSchema } from './scheduled-reports';

export const scheduledReportsSearchSchema = z.object({
  id: z.string().uuid().optional(),
  search: z.string().optional(),
  frequency: reportFrequencySchema.or(z.literal('all')).default('all'),
  format: reportFormatSchema.or(z.literal('all')).default('all'),
  isActive: z.enum(['all', 'active', 'inactive']).default('all'),
});

export type ScheduledReportsSearch = z.infer<typeof scheduledReportsSearchSchema>;
