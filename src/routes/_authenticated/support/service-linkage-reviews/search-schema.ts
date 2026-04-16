import { z } from 'zod';
import {
  serviceLinkageReviewReasonSchema,
  serviceLinkageReviewStatusSchema,
} from '@/lib/schemas/service';

export const serviceLinkageReviewsSearchSchema = z.object({
  status: serviceLinkageReviewStatusSchema.default('pending'),
  reasonCode: serviceLinkageReviewReasonSchema.optional(),
});
