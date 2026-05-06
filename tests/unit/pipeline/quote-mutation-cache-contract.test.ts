import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function count(source: string, pattern: string): number {
  return source.split(pattern).length - 1;
}

describe('pipeline quote mutation cache contract', () => {
  it('keeps repeated quote mutation invalidation groups centralized', () => {
    const source = read('src/hooks/pipeline/use-quote-mutations.ts');

    expect(source).toContain('function invalidateOpportunityListCaches');
    expect(source).toContain('function invalidateQuoteVersionsAndOpportunity');
    expect(source).toContain('function invalidateQuoteExpiryCaches');
    expect(source).toContain('function invalidateQuoteExpirationCaches');
    expect(source).toContain('function invalidateDeletedQuoteCaches');
    expect(source).toContain('function invalidateGeneratedQuotePdfCaches');
    expect(source).toContain('function invalidateSentQuoteCaches');

    expect(count(source, 'invalidateOpportunityListCaches(queryClient)')).toBe(3);
    expect(count(source, 'invalidateQuoteVersionsAndOpportunity(queryClient, opportunityId)')).toBe(3);
    expect(count(source, 'invalidateQuoteVersionsAndOpportunity(queryClient, variables.opportunityId)')).toBe(0);
    expect(count(source, 'invalidateQuoteExpiryCaches(queryClient)')).toBe(1);
    expect(count(source, 'invalidateQuoteExpirationCaches(queryClient, opportunityId)')).toBe(2);
    expect(count(source, 'invalidateDeletedQuoteCaches(queryClient, id)')).toBe(1);
    expect(count(source, 'invalidateGeneratedQuotePdfCaches(queryClient, variables.quoteVersionId)')).toBe(1);
    expect(count(source, 'invalidateSentQuoteCaches(queryClient, variables.opportunityId)')).toBe(1);

    expect(count(source, 'queryKeys.opportunities.lists()')).toBe(1);
    expect(count(source, 'queryKeys.opportunities.infiniteLists()')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.quoteVersions(opportunityId)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.opportunity(opportunityId)')).toBe(2);
    expect(count(source, 'queryKeys.pipeline.expiringQuotes(7)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.expiredQuotes()')).toBe(1);
    expect(count(source, 'queryKeys.quotes.lists()')).toBe(1);
    expect(count(source, 'queryKeys.quotes.detail(quoteId)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.metrics()')).toBe(1);
    expect(count(source, 'queryKeys.documents.all')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.all')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.quoteVersion(quoteVersionId)')).toBe(1);
    expect(count(source, "queryKeys.documents.history('opportunity', opportunityId)")).toBe(1);
    expect(count(source, 'queryKeys.activities.byOpportunity(opportunityId)')).toBe(1);
  });

  it('keeps delete quote in mutation hooks instead of quote read hooks', () => {
    const readSource = read('src/hooks/pipeline/use-quotes.ts');
    const mutationSource = read('src/hooks/pipeline/use-quote-mutations.ts');
    const barrelSource = read('src/hooks/pipeline/index.ts');

    expect(readSource).not.toContain('useMutation');
    expect(readSource).not.toContain('useQueryClient');
    expect(readSource).not.toContain('deleteQuote');
    expect(readSource).not.toContain('useDeleteQuote');

    expect(mutationSource).toContain('export function useDeleteQuote()');
    expect(mutationSource).toContain("import { deleteQuote } from '@/server/functions/pipeline/quote-delete'");
    expect(barrelSource).toContain("useDeleteQuote,\n  type CreateQuoteVersionInput");
  });

  it('keeps delete quote server ownership isolated from broad quote versioning', () => {
    const pipelineServerSource = read('src/server/functions/pipeline/pipeline.ts');
    const quoteServerSource = read('src/server/functions/pipeline/quote-versions.tsx');
    const quoteDeleteSource = read('src/server/functions/pipeline/quote-delete.ts');

    expect(pipelineServerSource).not.toContain('export const deleteQuote');
    expect(pipelineServerSource).not.toContain('QUOTE_EXCLUDED_FIELDS');
    expect(pipelineServerSource).not.toContain('buildQuoteByIdWhere');
    expect(quoteServerSource).not.toContain('export const deleteQuote');
    expect(quoteServerSource).not.toContain('QUOTE_EXCLUDED_FIELDS');
    expect(quoteServerSource).not.toContain('buildQuoteByIdWhere');

    expect(quoteDeleteSource).toContain('export const deleteQuote');
    expect(quoteDeleteSource).toContain('permission: PERMISSIONS.quote.delete');
    expect(quoteDeleteSource).toContain('buildQuoteByIdWhere(id, ctx.organizationId)');
    expect(quoteDeleteSource).toContain("throw new ValidationError('Cannot delete an accepted quote')");
    expect(quoteDeleteSource).toContain("entityType: 'quote'");
    expect(quoteDeleteSource).toContain("action: 'delete'");
    expect(quoteDeleteSource).toContain('computeChanges({');
  });
});
