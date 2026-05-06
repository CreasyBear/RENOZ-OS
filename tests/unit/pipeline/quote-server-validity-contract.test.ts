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

describe('pipeline quote server validity contract', () => {
  it('keeps quote expiration defaults and generated PDF validity on one constant', () => {
    const source = read('src/server/functions/pipeline/quote-versions.tsx');

    expect(source).toContain('const DEFAULT_QUOTE_VALIDITY_DAYS = 30');
    expect(source).not.toContain('const QUOTE_VALIDITY_DAYS = 30');
    expect(count(source, 'DEFAULT_QUOTE_VALIDITY_DAYS')).toBe(3);
    expect(source).toContain('expiresAt.setDate(expiresAt.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS)');
    expect(source).toContain(
      'new Date(issueDate.getTime() + DEFAULT_QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000)'
    );
  });
});
