import { z } from 'zod';
import { idParamSchema, paginationSchema } from '@/lib/schemas';

export const portalListSchema = paginationSchema.pick({
  page: true,
  pageSize: true,
});

export const portalOrderParamsSchema = idParamSchema;

export const portalQuoteParamsSchema = idParamSchema;

export type PortalListParams = z.infer<typeof portalListSchema>;
export type PortalOrderParams = z.infer<typeof portalOrderParamsSchema>;
export type PortalQuoteParams = z.infer<typeof portalQuoteParamsSchema>;
