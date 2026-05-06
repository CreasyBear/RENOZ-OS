import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline quote server send contract', () => {
  it('keeps quote send orchestration out of quote versioning and tenant scoped', () => {
    const quoteVersioning = read('src/server/functions/pipeline/quote-versions.tsx');
    const quoteSend = read('src/server/functions/pipeline/quote-send.ts');
    const mutationHook = read('src/hooks/pipeline/use-quote-mutations.ts');

    expect(quoteVersioning).not.toContain('export const sendQuote');
    expect(quoteVersioning).not.toContain("import { Resend } from 'resend'");
    expect(quoteVersioning).not.toContain('emailHistory');
    expect(quoteVersioning).not.toContain('opportunityActivities');

    expect(quoteSend).toContain('export const sendQuote');
    expect(quoteSend).toContain("import { Resend } from 'resend'");
    expect(quoteSend).toContain("import { generateQuotePdf } from './quote-pdf'");
    expect(quoteSend).toContain('sendQuoteSchema');
    expect(quoteSend).toContain('formatCurrency(');
    expect(quoteSend).toContain('eq(quoteVersions.organizationId, ctx.organizationId)');
    expect(quoteSend).toContain('eq(opportunities.organizationId, ctx.organizationId)');
    expect(quoteSend).toContain('eq(customers.organizationId, ctx.organizationId)');
    expect(quoteSend).toContain('eq(emailHistory.organizationId, ctx.organizationId)');
    expect(quoteSend).toContain('eq(opportunities.stage, opp.stage)');

    expect(mutationHook).toContain("import { sendQuote } from '@/server/functions/pipeline/quote-send'");
    expect(mutationHook).toContain('queryKeys.documents.history');
    expect(mutationHook).toContain('queryKeys.activities.byOpportunity');
  });
});
