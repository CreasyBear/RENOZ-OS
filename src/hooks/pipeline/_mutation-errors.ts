import { formatMutationError } from '@/lib/mutation-error-feedback';

export type PipelineQuoteMutationAction = 'generatePdf' | 'send' | 'delete' | 'save' | 'restore';

const PIPELINE_QUOTE_MUTATION_FALLBACKS: Record<PipelineQuoteMutationAction, string> = {
  generatePdf: 'Unable to generate quote PDF. Refresh and try again.',
  send: 'Unable to send quote. Refresh and try again.',
  delete: 'Unable to delete quote. Refresh and try again.',
  save: 'Unable to save quote. Refresh and try again.',
  restore: 'Unable to restore quote version. Refresh and try again.',
};

const PIPELINE_QUOTE_CODE_MESSAGES: Record<string, string> = {
  CONFLICT: 'Quote state changed. Refresh and review before trying again.',
  FORBIDDEN: 'You do not have permission to manage quotes.',
  NOT_FOUND: 'Quote was not found. Refresh and try again.',
  PDF_MISSING: 'Quote PDF is unavailable. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage quotes.',
  VALIDATION_ERROR: 'Quote details need review before continuing.',
};

export function formatPipelineQuoteMutationError(
  error: unknown,
  action: PipelineQuoteMutationAction
): string {
  return formatMutationError(error, PIPELINE_QUOTE_MUTATION_FALLBACKS[action], {
    codeMessages: PIPELINE_QUOTE_CODE_MESSAGES,
  });
}

export type PipelineOpportunityMutationAction =
  | 'stage'
  | 'create'
  | 'delete'
  | 'update'
  | 'bulkDelete'
  | 'bulkStage'
  | 'convertToOrder';

const PIPELINE_OPPORTUNITY_MUTATION_FALLBACKS: Record<PipelineOpportunityMutationAction, string> = {
  stage: 'Unable to update opportunity stage. Refresh and try again.',
  create: 'Unable to create opportunity. Refresh and try again.',
  delete: 'Unable to delete opportunity. Refresh and try again.',
  update: 'Unable to update opportunity. Refresh and try again.',
  bulkDelete: 'Unable to delete selected opportunities. Refresh and try again.',
  bulkStage: 'Unable to update selected opportunity stages. Refresh and try again.',
  convertToOrder: 'Unable to convert opportunity to an order. Refresh and try again.',
};

const PIPELINE_OPPORTUNITY_CODE_MESSAGES: Record<string, string> = {
  CONFLICT: 'Opportunity changed since this page loaded. Refresh and review before trying again.',
  FORBIDDEN: 'You do not have permission to update opportunities.',
  NOT_FOUND: 'Opportunity was not found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update opportunities.',
  VALIDATION_ERROR: 'Opportunity details need review before continuing.',
  VERSION_CONFLICT: 'Opportunity changed since this page loaded. Refresh and review before trying again.',
};

export function formatPipelineOpportunityMutationError(
  error: unknown,
  action: PipelineOpportunityMutationAction
): string {
  return formatMutationError(error, PIPELINE_OPPORTUNITY_MUTATION_FALLBACKS[action], {
    codeMessages: PIPELINE_OPPORTUNITY_CODE_MESSAGES,
  });
}

export type PipelineActivityMutationAction = 'log' | 'scheduleFollowUp' | 'complete';

const PIPELINE_ACTIVITY_MUTATION_FALLBACKS: Record<PipelineActivityMutationAction, string> = {
  log: 'Unable to log activity. Refresh and try again.',
  scheduleFollowUp: 'Unable to schedule follow-up. Refresh and try again.',
  complete: 'Unable to complete activity. Refresh and try again.',
};

const PIPELINE_ACTIVITY_CODE_MESSAGES: Record<string, string> = {
  CONFLICT: 'Activity state changed. Refresh and review before trying again.',
  FORBIDDEN: 'You do not have permission to manage opportunity activities.',
  NOT_FOUND: 'Activity was not found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage opportunity activities.',
  VALIDATION_ERROR: 'Activity details need review before continuing.',
};

export function formatPipelineActivityMutationError(
  error: unknown,
  action: PipelineActivityMutationAction
): string {
  return formatMutationError(error, PIPELINE_ACTIVITY_MUTATION_FALLBACKS[action], {
    codeMessages: PIPELINE_ACTIVITY_CODE_MESSAGES,
  });
}
