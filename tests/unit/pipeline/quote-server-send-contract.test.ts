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

  it('keeps quote send result failures operator-safe with follow-up write evidence', () => {
    const quoteSend = read('src/server/functions/pipeline/quote-send.ts');

    expect(quoteSend).toContain("import { pipelineLogger } from '@/lib/logger'");
    expect(quoteSend).toContain('QUOTE_EMAIL_FAILED_MESSAGE');
    expect(quoteSend).toContain('QUOTE_EMAIL_HISTORY_CREATE_FAILED_MESSAGE');
    expect(quoteSend).toContain('QUOTE_EMAIL_HISTORY_STATUS_FAILED_MESSAGE');
    expect(quoteSend).toContain('QUOTE_FOLLOW_UP_FAILED_MESSAGE');
    expect(quoteSend).toContain(
      "pipelineLogger.warn('Quote PDF attachment download returned a non-OK response'"
    );
    expect(quoteSend).toContain(
      "pipelineLogger.error('Failed to prepare quote PDF attachment', error"
    );
    expect(quoteSend).toContain(
      "pipelineLogger.error('Failed to record quote email history', error"
    );
    expect(quoteSend).toContain(
      "pipelineLogger.error('Quote email provider failed before returning a delivery result', error"
    );
    expect(quoteSend).toContain(
      "pipelineLogger.error('Failed to send quote email', sendError"
    );
    expect(quoteSend).toContain(
      "pipelineLogger.error('Failed to mark quote email history failed', error"
    );
    expect(quoteSend).toContain(
      "pipelineLogger.error('Failed to mark quote email history sent', error"
    );
    expect(quoteSend).toContain(
      "pipelineLogger.error('Failed to complete quote send follow-up updates', error"
    );

    expect(quoteSend).toContain('.returning({ id: emailHistory.id })');
    expect(quoteSend).toContain('PIPELINE_QUOTE_EMAIL_HISTORY_CREATE_FAILED');
    expect(quoteSend).toContain('PIPELINE_QUOTE_EMAIL_HISTORY_FAILED_STATUS_MISSING');
    expect(quoteSend).toContain('PIPELINE_QUOTE_EMAIL_HISTORY_SENT_STATUS_MISSING');
    expect(quoteSend).toContain('const markEmailHistoryFailed = async');
    expect(quoteSend).toContain("emailHistory: await markEmailHistoryFailed()");
    expect(quoteSend).toContain('.returning({ id: opportunityActivities.id })');
    expect(quoteSend).toContain('PIPELINE_QUOTE_SEND_ACTIVITY_FAILED');
    expect(quoteSend).toContain('.returning({ id: opportunities.id })');
    expect(quoteSend).toContain('Opportunity stage changed before the proposal update.');

    expect(quoteSend).not.toContain('sendError.message');
    expect(quoteSend).not.toContain('Failed to send email: ${sendError.message}');
    expect(quoteSend).not.toContain('message: sendError.message');
    expect(quoteSend).not.toContain('error instanceof Error ? error.message');
    expect(quoteSend).not.toContain(
      'const { data: sendResult, error: sendError } = await resend.emails.send'
    );
  });
});
