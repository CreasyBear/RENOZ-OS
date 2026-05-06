import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline quote server version read contract', () => {
  it('keeps quote version reads out of write ownership and tenant scoped', () => {
    const quoteVersioning = read('src/server/functions/pipeline/quote-versions.tsx');
    const quoteReads = read('src/server/functions/pipeline/quote-version-reads.ts');
    const useQuotes = read('src/hooks/pipeline/use-quotes.ts');

    expect(quoteVersioning).not.toContain('export const getQuoteVersion');
    expect(quoteVersioning).not.toContain('export const listQuoteVersions');
    expect(quoteVersioning).not.toContain('quoteVersionFilterSchema');
    expect(quoteVersioning).not.toContain('quoteVersionParamsSchema');

    expect(quoteReads).toContain('export const getQuoteVersion');
    expect(quoteReads).toContain('export const listQuoteVersions');
    expect(quoteReads).toContain('normalizeObjectInput(quoteVersionParamsSchema)');
    expect(quoteReads).toContain('normalizeObjectInput(quoteVersionFilterSchema)');
    expect(quoteReads).toContain('eq(quoteVersions.id, id)');
    expect(quoteReads).toContain('eq(quoteVersions.organizationId, ctx.organizationId)');
    expect(quoteReads).toContain('eq(opportunities.organizationId, ctx.organizationId)');
    expect(quoteReads).toContain('eq(quoteVersions.opportunityId, opportunityId)');
    expect(quoteReads).toContain('orderBy(desc(quoteVersions.versionNumber))');
    expect(quoteReads).toContain("throw new NotFoundError('Opportunity not found', 'opportunity')");
    expect(quoteReads).toContain("throw new NotFoundError('Quote version not found', 'quoteVersion')");

    expect(useQuotes).toContain("} from '@/server/functions/pipeline/quote-version-reads'");
    expect(useQuotes).toContain('queryKeys.pipeline.quoteVersions(opportunityId)');
    expect(useQuotes).toContain('queryKeys.pipeline.quoteVersion(versionId)');
  });
});
