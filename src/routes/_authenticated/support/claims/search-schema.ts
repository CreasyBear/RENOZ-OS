import { z } from 'zod';
import {
  DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION,
  DEFAULT_WARRANTY_CLAIM_SORT_FIELD,
  WARRANTY_CLAIM_SORT_FIELDS,
} from '@/components/domain/warranty/warranty-claim-sorting';

export const claimsSearchSchema = z.object({
  quickFilter: z.enum(['submitted', 'at_risk_sla', 'awaiting_decision']).optional(),
  status: z
    .enum(['submitted', 'under_review', 'approved', 'denied', 'resolved', 'cancelled'])
    .optional(),
  type: z
    .enum(['cell_degradation', 'bms_fault', 'inverter_failure', 'installation_defect', 'other'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  sortBy: z.enum(WARRANTY_CLAIM_SORT_FIELDS).default(DEFAULT_WARRANTY_CLAIM_SORT_FIELD),
  sortOrder: z.enum(['asc', 'desc']).default(DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION),
});
