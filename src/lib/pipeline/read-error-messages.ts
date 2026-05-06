import { isReadQueryError } from '@/lib/read-path-policy';

export const PIPELINE_READ_MESSAGES = {
  pipelineBoardTitle: 'Pipeline unavailable',
  pipelineBoard: 'Pipeline data is temporarily unavailable. Please refresh and try again.',
  opportunitiesTitle: 'Opportunities unavailable',
  opportunities: 'Opportunities are temporarily unavailable. Please refresh and try again.',
  opportunitiesCached:
    'Opportunity data is temporarily unavailable. Showing cached opportunities while refresh is unavailable.',
  opportunityDetails:
    'Opportunity details are temporarily unavailable. Please refresh and try again.',
  opportunityNotFound: 'The requested opportunity could not be found.',
  opportunitySearch: 'Opportunity search is temporarily unavailable. Please refresh and try again.',
  opportunityAlerts: 'Opportunity alerts are temporarily unavailable. Please refresh and try again.',
  opportunityActiveItems:
    'Opportunity active items are temporarily unavailable. Please refresh and try again.',
  opportunityDocumentsTitle: 'Documents unavailable',
  opportunityDocuments: 'Opportunity documents are temporarily unavailable. Please refresh and try again.',
  opportunityDocumentsCached:
    'Opportunity documents are temporarily unavailable. Showing the most recent documents.',
  pipelineMetrics: 'Pipeline metrics are temporarily unavailable. Please refresh and try again.',
  pipelineForecast: 'Pipeline forecast is temporarily unavailable. Please refresh and try again.',
  pipelineVelocity: 'Pipeline velocity is temporarily unavailable. Please refresh and try again.',
  revenueAttribution: 'Revenue attribution is temporarily unavailable. Please refresh and try again.',
  pipelineCustomers: 'Pipeline customers are temporarily unavailable. Please refresh and try again.',
  pipelineProducts: 'Pipeline products are temporarily unavailable. Please refresh and try again.',
  quoteVersionDetails:
    'Quote version details are temporarily unavailable. Please refresh and try again.',
  quoteVersionNotFound: 'The requested quote version could not be found.',
  quoteComparison: 'Quote comparison is temporarily unavailable. Please refresh and try again.',
  expiringQuotes: 'Expiring quote data is temporarily unavailable. Please refresh and try again.',
  expiredQuotes: 'Expired quote data is temporarily unavailable. Please refresh and try again.',
  quoteValidityStats:
    'Quote validity statistics are temporarily unavailable. Please refresh and try again.',
  quoteVersionHistory: 'Quote version history is temporarily unavailable. Please refresh and try again.',
} as const;

export function formatPipelineReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
