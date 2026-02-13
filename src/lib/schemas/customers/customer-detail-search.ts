/**
 * Customer Detail Route Search Params
 *
 * Zod schema for /customers/$customerId search params.
 * Uses Zod 4 native .default().catch() for resilience (no undefined).
 *
 * @see TanStack/router#4322 - Zod 4 Standard Schema support
 */

import { z } from 'zod';

export const customerDetailSearchSchema = z.object({
  tab: z.enum(['overview', 'orders', 'activity']).default('overview').catch('overview'),
});

export type CustomerDetailSearch = z.infer<typeof customerDetailSearchSchema>;
