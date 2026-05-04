import { z } from 'zod';
import {
  warrantyClaimantModeSchema,
  warrantyClaimantRoleSchema,
  warrantyClaimQuickFilterSchema,
  warrantyClaimStatusSchema,
  warrantyClaimTypeSchema,
} from '@/lib/schemas/warranty';
import {
  DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION,
  DEFAULT_WARRANTY_CLAIM_SORT_FIELD,
  WARRANTY_CLAIM_SORT_FIELDS,
} from '@/components/domain/warranty/warranty-claim-sorting';

export const claimsSearchSchema = z.object({
  customerId: z.string().uuid().optional(),
  claimantRole: warrantyClaimantRoleSchema.optional(),
  claimantMode: warrantyClaimantModeSchema.optional(),
  claimantCustomerId: z.string().uuid().optional(),
  quickFilter: warrantyClaimQuickFilterSchema.optional(),
  status: warrantyClaimStatusSchema.optional(),
  type: warrantyClaimTypeSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  sortBy: z.enum(WARRANTY_CLAIM_SORT_FIELDS).default(DEFAULT_WARRANTY_CLAIM_SORT_FIELD),
  sortOrder: z.enum(['asc', 'desc']).default(DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION),
});
