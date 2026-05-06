import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline quote server comparison contract', () => {
  it('keeps quote comparison out of quote versioning and tenant scoped', () => {
    const quoteVersioning = read('src/server/functions/pipeline/quote-versions.tsx');
    const quoteComparison = read('src/server/functions/pipeline/quote-comparison.ts');
    const useQuotes = read('src/hooks/pipeline/use-quotes.ts');

    expect(quoteVersioning).not.toContain('export const compareQuoteVersions');
    expect(quoteVersioning).not.toContain('version1Id: z.string().uuid()');
    expect(quoteVersioning).not.toContain('Quote versions must be from the same opportunity');

    expect(quoteComparison).toContain('export const compareQuoteVersions');
    expect(quoteComparison).toContain('normalizeObjectInput(');
    expect(quoteComparison).toContain('version1Id: z.string().uuid()');
    expect(quoteComparison).toContain('version2Id: z.string().uuid()');
    expect(quoteComparison).toContain('eq(quoteVersions.organizationId, ctx.organizationId)');
    expect(quoteComparison).toContain("throw new NotFoundError('One or both quote versions not found', 'quoteVersion')");
    expect(quoteComparison).toContain("throw new ValidationError('Quote versions must be from the same opportunity')");
    expect(quoteComparison).toContain('subtotalPercent: v1[0].subtotal > 0 ? (subtotalDiff / v1[0].subtotal) * 100 : 0');

    expect(useQuotes).toContain("import { compareQuoteVersions } from '@/server/functions/pipeline/quote-comparison'");
    expect(useQuotes).toContain('queryKeys.pipeline.quoteComparison(version1Id, version2Id)');
  });
});
