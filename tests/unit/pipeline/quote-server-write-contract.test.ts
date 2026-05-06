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

describe('pipeline quote server write contract', () => {
  it('keeps quote create and restore write ownership isolated', () => {
    const createSource = read('src/server/functions/pipeline/quote-versions.tsx');
    const restoreSource = read('src/server/functions/pipeline/quote-version-restore.ts');
    const mutationSource = read('src/hooks/pipeline/use-quote-mutations.ts');

    expect(createSource).toContain('export const createQuoteVersion');
    expect(createSource).not.toContain('export const restoreQuoteVersion');
    expect(createSource).not.toContain('restoreQuoteVersionSchema');
    expect(createSource).not.toContain('Source version does not belong to this opportunity');

    expect(restoreSource).toContain('export const restoreQuoteVersion');
    expect(restoreSource).toContain('restoreQuoteVersionSchema');
    expect(restoreSource).toContain('Source version does not belong to this opportunity');
    expect(restoreSource).toContain('Restored from v${sourceVersion[0].versionNumber}');

    expect(mutationSource).toContain(
      "import { restoreQuoteVersion } from '@/server/functions/pipeline/quote-version-restore'"
    );
  });

  it('keeps quote create version numbering and opportunity update tenant scoped', () => {
    const source = read('src/server/functions/pipeline/quote-versions.tsx');

    expect(count(source, 'eq(quoteVersions.opportunityId, opportunityId)')).toBe(1);
    expect(count(source, 'eq(quoteVersions.organizationId, ctx.organizationId)')).toBe(1);
    expect(count(source, 'orderBy(desc(quoteVersions.versionNumber))')).toBe(1);
    expect(source).toContain("throw new ServerError('Unable to create quote version')");
    expect(count(source, '.update(opportunities)')).toBe(1);
    expect(count(source, 'eq(opportunities.id, opportunityId)')).toBe(2);
    expect(count(source, 'eq(opportunities.organizationId, ctx.organizationId)')).toBe(2);
    expect(count(source, '.returning({ id: opportunities.id })')).toBe(1);
    expect(count(source, "throw new NotFoundError('Opportunity not found', 'opportunity')")).toBe(2);
  });

  it('keeps quote restore version numbering and opportunity update tenant scoped', () => {
    const source = read('src/server/functions/pipeline/quote-version-restore.ts');

    expect(count(source, 'eq(quoteVersions.opportunityId, opportunityId)')).toBe(1);
    expect(count(source, 'eq(quoteVersions.organizationId, ctx.organizationId)')).toBe(2);
    expect(count(source, 'orderBy(desc(quoteVersions.versionNumber))')).toBe(1);
    expect(count(source, '.update(opportunities)')).toBe(1);
    expect(count(source, 'eq(opportunities.id, opportunityId)')).toBe(2);
    expect(count(source, 'eq(opportunities.organizationId, ctx.organizationId)')).toBe(2);
    expect(count(source, '.returning({ id: opportunities.id })')).toBe(1);
    expect(count(source, "throw new NotFoundError('Opportunity not found', 'opportunity')")).toBe(2);
  });
});
