import { z } from 'zod';

export const workflowTransitionSchema = z.object({
  transition: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  blockedBy: z.string().optional(),
  errorCode: z.string().optional(),
});

export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>;

