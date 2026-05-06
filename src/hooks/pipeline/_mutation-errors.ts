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
