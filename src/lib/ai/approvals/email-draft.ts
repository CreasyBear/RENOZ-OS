import { z } from 'zod';

export const aiEmailDraftSchema = z.object({
  customerId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
});

export type AIEmailDraft = z.infer<typeof aiEmailDraftSchema>;
