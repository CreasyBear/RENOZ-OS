import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  PIPELINE_READ_MESSAGES,
  formatPipelineReadError,
} from '@/lib/pipeline/read-error-messages';

describe('pipeline read error messages', () => {
  it('uses normalized read-query copy and rejects raw pipeline read errors', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 503, code: 'INTERNAL_ERROR', message: 'quote version SQL timeout' },
      {
        contractType: 'always-shaped',
        fallbackMessage: PIPELINE_READ_MESSAGES.quoteVersionHistory,
      }
    );

    expect(formatPipelineReadError(normalized, 'Fallback copy')).toBe(
      PIPELINE_READ_MESSAGES.quoteVersionHistory
    );
    expect(formatPipelineReadError(new Error('quote version SQL timeout'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });

  it('keeps board, opportunity, and document read fallbacks in the domain map', () => {
    expect(PIPELINE_READ_MESSAGES.pipelineBoard).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.opportunities).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.opportunitiesCached).toContain('Showing cached opportunities');
    expect(PIPELINE_READ_MESSAGES.opportunityDetails).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.opportunityNotFound).toContain('could not be found');
    expect(PIPELINE_READ_MESSAGES.opportunitySearch).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.opportunityDocuments).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.opportunityDocumentsCached).toContain(
      'Showing the most recent documents'
    );
    expect(PIPELINE_READ_MESSAGES.pipelineMetrics).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.pipelineForecast).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.pipelineVelocity).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.revenueAttribution).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.pipelineCustomers).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.pipelineProducts).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.quoteVersionDetails).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.quoteVersionNotFound).toContain('could not be found');
    expect(PIPELINE_READ_MESSAGES.quoteComparison).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.expiringQuotes).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.expiredQuotes).toContain('temporarily unavailable');
    expect(PIPELINE_READ_MESSAGES.quoteValidityStats).toContain('temporarily unavailable');
  });
});
