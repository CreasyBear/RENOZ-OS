import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline read state contract', () => {
  it('keeps quote version history read state behind the pipeline read formatter', () => {
    const formatter = read('src/lib/pipeline/read-error-messages.ts');
    const barrel = read('src/lib/pipeline/index.ts');
    const quoteVersionHistory = read(
      'src/components/domain/pipeline/quotes/quote-version-history.tsx'
    );

    expect(formatter).toContain('PIPELINE_READ_MESSAGES');
    expect(formatter).toContain('formatPipelineReadError');
    expect(formatter).toContain('quoteVersionHistory:');
    expect(barrel).toContain('formatPipelineReadError');
    expect(quoteVersionHistory).toContain('formatPipelineReadError');
    expect(quoteVersionHistory).toContain('PIPELINE_READ_MESSAGES.quoteVersionHistory');
    expect(quoteVersionHistory).not.toContain('Failed to load version history.');
  });

  it('keeps board, list, and document read states behind the pipeline read formatter', () => {
    const formatter = read('src/lib/pipeline/read-error-messages.ts');
    const pipelineBoard = read('src/components/domain/pipeline/pipeline-kanban-container.tsx');
    const opportunitiesContainer = read(
      'src/components/domain/pipeline/opportunities/opportunities-list-container.tsx'
    );
    const opportunitiesPresenter = read(
      'src/components/domain/pipeline/opportunities/opportunities-list-presenter.tsx'
    );
    const documentsTab = read(
      'src/components/domain/pipeline/opportunities/tabs/opportunity-documents-tab.tsx'
    );

    expect(formatter).toContain('pipelineBoard:');
    expect(formatter).toContain('opportunities:');
    expect(formatter).toContain('opportunitiesCached:');
    expect(formatter).toContain('opportunityDocuments:');
    expect(formatter).toContain('opportunityDocumentsCached:');

    for (const source of [
      pipelineBoard,
      opportunitiesContainer,
      opportunitiesPresenter,
      documentsTab,
    ]) {
      expect(source).toContain('formatPipelineReadError');
    }

    expect(pipelineBoard).toContain('PIPELINE_READ_MESSAGES.pipelineBoard');
    expect(opportunitiesContainer).toContain('PIPELINE_READ_MESSAGES.opportunitiesCached');
    expect(opportunitiesPresenter).toContain('PIPELINE_READ_MESSAGES.opportunities');
    expect(documentsTab).toContain('PIPELINE_READ_MESSAGES.opportunityDocuments');
    expect(documentsTab).toContain('PIPELINE_READ_MESSAGES.opportunityDocumentsCached');

    expect(pipelineBoard).not.toContain('Failed to load pipeline');
    expect(pipelineBoard).not.toContain('message={error.message');
    expect(opportunitiesPresenter).not.toContain('Failed to load opportunities');
    expect(opportunitiesPresenter).not.toContain('description={error.message');
    expect(documentsTab).not.toContain('Failed to load documents');
    expect(documentsTab).not.toContain('error.message ||');
  });

  it('keeps pipeline hook read normalization fallbacks in the pipeline message map', () => {
    const server = read('src/server/functions/pipeline/pipeline.ts');
    const useOpportunities = read('src/hooks/pipeline/use-opportunities.ts');
    const usePipelineMetrics = read('src/hooks/pipeline/use-pipeline-metrics.ts');
    const useOpportunityDetailExtended = read(
      'src/hooks/pipeline/use-opportunity-detail-extended.ts'
    );

    expect(server).toContain("ServerError, ValidationError } from '@/lib/server/errors'");
    expect(server).toContain("'PIPELINE_ACTIVITY_COUNT_FAILED'");
    expect(server).not.toContain("throw new Error('Failed to fetch activity count')");
    expect(useOpportunities).toContain('PIPELINE_READ_MESSAGES.opportunities');
    expect(useOpportunities).toContain('PIPELINE_READ_MESSAGES.opportunityDetails');
    expect(useOpportunities).toContain('PIPELINE_READ_MESSAGES.opportunityNotFound');
    expect(useOpportunities).toContain('PIPELINE_READ_MESSAGES.opportunitySearch');
    expect(usePipelineMetrics).toContain('PIPELINE_READ_MESSAGES.pipelineMetrics');
    expect(usePipelineMetrics).toContain('PIPELINE_READ_MESSAGES.pipelineForecast');
    expect(usePipelineMetrics).toContain('PIPELINE_READ_MESSAGES.pipelineVelocity');
    expect(usePipelineMetrics).toContain('PIPELINE_READ_MESSAGES.revenueAttribution');
    expect(usePipelineMetrics).toContain('PIPELINE_READ_MESSAGES.pipelineCustomers');
    expect(usePipelineMetrics).toContain('PIPELINE_READ_MESSAGES.pipelineProducts');
    expect(useOpportunityDetailExtended).toContain('PIPELINE_READ_MESSAGES.opportunityAlerts');
    expect(useOpportunityDetailExtended).toContain('PIPELINE_READ_MESSAGES.opportunityActiveItems');

    expect(useOpportunities).not.toMatch(/fallbackMessage:\s*['"]/);
    expect(usePipelineMetrics).not.toMatch(/fallbackMessage:\s*['"]/);
    expect(useOpportunityDetailExtended).not.toMatch(/fallbackMessage:\s*['"]/);
  });

  it('keeps quote hook read normalization fallbacks in the pipeline message map', () => {
    const useQuotes = read('src/hooks/pipeline/use-quotes.ts');

    expect(useQuotes).toContain('PIPELINE_READ_MESSAGES.quoteVersionHistory');
    expect(useQuotes).toContain('PIPELINE_READ_MESSAGES.quoteVersionDetails');
    expect(useQuotes).toContain('PIPELINE_READ_MESSAGES.quoteVersionNotFound');
    expect(useQuotes).toContain('PIPELINE_READ_MESSAGES.quoteComparison');
    expect(useQuotes).toContain('PIPELINE_READ_MESSAGES.expiringQuotes');
    expect(useQuotes).toContain('PIPELINE_READ_MESSAGES.expiredQuotes');
    expect(useQuotes).toContain('PIPELINE_READ_MESSAGES.quoteValidityStats');
    expect(useQuotes).not.toMatch(/fallbackMessage:\s*['"]/);
  });
});
