import { z } from 'zod';

export const releaseGateReportSchema = z.object({
  gateName: z.string().min(1),
  status: z.enum(['pass', 'fail']),
  generatedAt: z.string().datetime(),
  metrics: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  failingRules: z.array(z.string()),
});

export type ReleaseGateReport = z.infer<typeof releaseGateReportSchema>;

