import { z } from 'zod';
import { serviceSystemOwnershipStatusSchema } from '@/lib/schemas/service';

export const serviceSystemsSearchSchema = z.object({
  search: z.string().optional(),
  ownershipStatus: serviceSystemOwnershipStatusSchema.optional(),
});
