import { isReadQueryError } from '@/lib/read-path-policy';

export const PIPELINE_READ_MESSAGES = {
  pipelineBoardTitle: 'Pipeline unavailable',
  pipelineBoard: 'Pipeline data is temporarily unavailable. Please refresh and try again.',
  opportunitiesTitle: 'Opportunities unavailable',
  opportunities: 'Opportunities are temporarily unavailable. Please refresh and try again.',
  opportunitiesCached:
    'Opportunity data is temporarily unavailable. Showing cached opportunities while refresh is unavailable.',
  opportunityDocumentsTitle: 'Documents unavailable',
  opportunityDocuments: 'Opportunity documents are temporarily unavailable. Please refresh and try again.',
  opportunityDocumentsCached:
    'Opportunity documents are temporarily unavailable. Showing the most recent documents.',
  quoteVersionHistory: 'Quote version history is temporarily unavailable. Please refresh and try again.',
} as const;

export function formatPipelineReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
