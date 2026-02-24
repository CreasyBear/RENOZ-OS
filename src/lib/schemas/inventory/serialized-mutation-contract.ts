import { z } from 'zod';
import { workflowTransitionSchema } from '@/lib/schemas/_shared/workflow-transition';

export const serializedMutationErrorCodeSchema = z.enum([
  'allocation_conflict',
  'shipped_status_conflict',
  'invalid_serial_state',
  'transition_blocked',
  'notification_failed',
]);

export const serializedMutationPartialFailureSchema = z.object({
  code: serializedMutationErrorCodeSchema,
  message: z.string(),
});

export const serializedMutationResultSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  transition: workflowTransitionSchema.optional(),
  affectedIds: z.array(z.string().uuid()).optional(),
  errorsById: z.record(z.string(), z.string()).optional(),
  partialFailure: serializedMutationPartialFailureSchema.optional(),
});

export type SerializedMutationErrorCode = z.infer<typeof serializedMutationErrorCodeSchema>;
export type SerializedMutationResult = z.infer<typeof serializedMutationResultSchema>;
