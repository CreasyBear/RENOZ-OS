import type { ProcessRmaInput, RmaResolutionDetails } from '@/lib/schemas/support/rma';
import type { ExecuteRmaRemedyResult } from './rma-remedy-execution';

export interface RmaExecutionStatePatch {
  status: 'received' | 'processed';
  processedAt: string | null;
  processedBy: string | null;
  resolution: ProcessRmaInput['resolution'] | null;
  resolutionDetails: RmaResolutionDetails | null;
  executionStatus: 'pending' | 'blocked' | 'completed';
  executionBlockedReason: string | null;
  executionCompletedAt: string | null;
  executionCompletedBy: string | null;
  refundPaymentId: string | null;
  creditNoteId: string | null;
  replacementOrderId: string | null;
}

export function buildPendingRmaExecutionState(): Pick<
  RmaExecutionStatePatch,
  | 'executionStatus'
  | 'executionBlockedReason'
  | 'executionCompletedAt'
  | 'executionCompletedBy'
> {
  return {
    executionStatus: 'pending',
    executionBlockedReason: null,
    executionCompletedAt: null,
    executionCompletedBy: null,
  };
}

export function buildCompletedRmaExecutionState(params: {
  resolution: ProcessRmaInput['resolution'];
  execution: ExecuteRmaRemedyResult;
}): RmaExecutionStatePatch {
  return {
    status: params.execution.status,
    processedAt: params.execution.processedAt,
    processedBy: params.execution.processedBy,
    resolution: params.resolution,
    resolutionDetails: params.execution.resolutionDetails,
    executionStatus: params.execution.executionStatus,
    executionBlockedReason: params.execution.executionBlockedReason,
    executionCompletedAt: params.execution.executionCompletedAt,
    executionCompletedBy: params.execution.executionCompletedBy,
    refundPaymentId: params.execution.refundPaymentId,
    creditNoteId: params.execution.creditNoteId,
    replacementOrderId: params.execution.replacementOrderId,
  };
}

export function buildBlockedRmaExecutionState(params: {
  resolution: ProcessRmaInput['resolution'];
  input: ProcessRmaInput;
  userId: string;
  message: string;
  now?: string;
}): RmaExecutionStatePatch {
  const resolvedAt = params.now ?? new Date().toISOString();

  return {
    status: 'received',
    processedAt: null,
    processedBy: null,
    resolution: params.resolution,
    resolutionDetails: {
      resolvedAt,
      resolvedBy: params.userId,
      refundAmount:
        params.input.resolution === 'refund' ? params.input.amount : undefined,
      notes: params.input.notes,
    },
    executionStatus: 'blocked',
    executionBlockedReason: params.message,
    executionCompletedAt: null,
    executionCompletedBy: null,
    refundPaymentId: null,
    creditNoteId: null,
    replacementOrderId: null,
  };
}
