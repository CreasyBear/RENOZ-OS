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
  it('keeps quote create and restore version numbering tenant scoped', () => {
    const source = read('src/server/functions/pipeline/quote-versions.tsx');

    expect(source).toContain('export const createQuoteVersion');
    expect(source).toContain('export const restoreQuoteVersion');
    expect(count(source, 'eq(quoteVersions.opportunityId, opportunityId)')).toBe(2);
    expect(count(source, 'eq(quoteVersions.organizationId, ctx.organizationId)')).toBe(3);
    expect(count(source, 'orderBy(desc(quoteVersions.versionNumber))')).toBe(2);
  });

  it('keeps quote create and restore opportunity value updates tenant scoped with returned-row evidence', () => {
    const source = read('src/server/functions/pipeline/quote-versions.tsx');

    expect(count(source, '.update(opportunities)')).toBe(2);
    expect(count(source, 'eq(opportunities.id, opportunityId)')).toBe(4);
    expect(count(source, 'eq(opportunities.organizationId, ctx.organizationId)')).toBe(4);
    expect(count(source, '.returning({ id: opportunities.id })')).toBe(2);
    expect(count(source, "throw new NotFoundError('Opportunity not found', 'opportunity')")).toBe(4);
  });
});
