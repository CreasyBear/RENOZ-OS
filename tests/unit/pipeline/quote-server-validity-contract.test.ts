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
    const constantSource = read('src/server/functions/pipeline/quote-validity-constants.ts');
    const quoteVersioning = read('src/server/functions/pipeline/quote-versions.tsx');
    const quoteValidity = read('src/server/functions/pipeline/quote-validity.ts');

    expect(constantSource).toContain('export const DEFAULT_QUOTE_VALIDITY_DAYS = 30');
    expect(quoteVersioning).not.toContain('const DEFAULT_QUOTE_VALIDITY_DAYS = 30');
    expect(quoteVersioning).not.toContain('const QUOTE_VALIDITY_DAYS = 30');
    expect(quoteValidity).not.toContain('const DEFAULT_QUOTE_VALIDITY_DAYS = 30');
    expect(count(quoteVersioning, 'DEFAULT_QUOTE_VALIDITY_DAYS')).toBe(2);
    expect(count(quoteValidity, 'DEFAULT_QUOTE_VALIDITY_DAYS')).toBe(2);
    expect(quoteValidity).toContain('expiresAt.setDate(expiresAt.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS)');
    expect(quoteVersioning).toContain(
      'new Date(issueDate.getTime() + DEFAULT_QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000)'
    );
  });

  it('keeps quote validity alert and stats reads out of quote versioning', () => {
    const quoteVersioning = read('src/server/functions/pipeline/quote-versions.tsx');
    const quoteValidity = read('src/server/functions/pipeline/quote-validity.ts');
    const useQuotes = read('src/hooks/pipeline/use-quotes.ts');

    expect(quoteVersioning).not.toContain('export const getExpiringQuotes');
    expect(quoteVersioning).not.toContain('export const getExpiredQuotes');
    expect(quoteVersioning).not.toContain('export const getQuoteValidityStats');
    expect(quoteVersioning).not.toContain('export const setDefaultQuoteExpiration');
    expect(quoteVersioning).not.toContain('export const extendQuoteValidity');
    expect(quoteVersioning).not.toContain('export const validateQuoteForConversion');

    expect(quoteValidity).toContain('export const getExpiringQuotes');
    expect(quoteValidity).toContain('export const getExpiredQuotes');
    expect(quoteValidity).toContain('export const getQuoteValidityStats');
    expect(quoteValidity).toContain('export const getQuoteValidityStatsSchema');
    expect(quoteValidity).toContain('export const setDefaultQuoteExpiration');
    expect(quoteValidity).toContain('export const extendQuoteValidity');
    expect(quoteValidity).toContain('export const validateQuoteForConversion');
    expect(quoteValidity).toContain("notInArray(opportunities.stage, ['won', 'lost'])");
    expect(quoteValidity).toContain("throw new ValidationError('New expiration date must be in the future')");
    expect(quoteValidity).toContain("message: 'No quote has been created for this opportunity'");

    expect(useQuotes).toContain("} from '@/server/functions/pipeline/quote-validity'");
  });
});
