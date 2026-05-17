import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('communications domain remediation trace', () => {
  it('uses one server-side inbox read instead of a client-side email/scheduled mashup', () => {
    const hook = read('src/hooks/communications/use-inbox.ts');
    const server = read('src/server/functions/communications/inbox.ts');
    const readModel = read('src/server/functions/communications/_shared/inbox-read.ts');
    const filters = read('src/server/functions/communications/_shared/inbox-filters.ts');
    const mappers = read('src/server/functions/communications/_shared/inbox-mappers.ts');

    expect(hook).toContain('listInboxItems');
    expect(hook).not.toContain('listEmailHistory');
    expect(hook).not.toContain('getScheduledEmails');
    expect(server).toContain('export const listInboxItems');
    expect(server).toContain('readInboxItems(data');
    expect(readModel).toContain('hasNextPage');
    expect(readModel).toContain('buildHistoryConditions');
    expect(readModel).toContain('toHistoryInboxItem');
    expect(filters).toContain('export function buildHistoryConditions');
    expect(mappers).toContain('export function toScheduledInboxItem');
    expect(mappers).not.toContain('scheduled@system');
  });

  it('keeps scheduled email cache keys complete for pagination', () => {
    const hook = read('src/hooks/communications/use-scheduled-emails.ts');

    expect(hook).toContain('queryKeys.communications.scheduledEmailsList({');
    expect(hook).toContain('limit,');
    expect(hook).toContain('offset,');
  });

  it('keeps scheduled call cache keys complete for widget and list filters', () => {
    const hook = read('src/hooks/communications/use-scheduled-calls.ts');
    const widget = read('src/components/domain/communications/calls/upcoming-calls-widget.tsx');

    expect(hook).toContain('queryKeys.communications.scheduledCallsList({');
    expect(hook).toContain('fromDate: fromDate?.toISOString()');
    expect(hook).toContain('toDate: toDate?.toISOString()');
    expect(hook).toContain('limit,');
    expect(hook).toContain('offset,');
    expect(widget).toContain('const widgetFromDate = useMemo(() => new Date(), [])');
    expect(widget).toContain('fromDate: widgetFromDate');
  });

  it('keeps scheduled email ServerFns thin and processing owned by shared helpers', () => {
    const server = read('src/server/functions/communications/scheduled-emails.ts');
    const job = read('src/trigger/jobs/process-scheduled-emails.ts');
    const processing = read(
      'src/server/functions/communications/_shared/scheduled-email-processing.ts',
    );

    expect(server).not.toContain("from '@/lib/db'");
    expect(server).not.toContain("from 'drizzle/schema");
    expect(job).toContain('_shared/scheduled-email-processing');
    expect(job).not.toContain('server/functions/communications/scheduled-emails');
    expect(processing).toContain("from './suppression-read'");
    expect(processing).not.toContain('server/functions/communications/email-suppression');
    expect(processing).toContain('claimScheduledEmail');
    expect(processing).toContain("eq(scheduledEmails.status, 'pending')");
    expect(processing).toContain("eq(scheduledEmails.status, 'processing')");
  });

  it('keeps suppression behavior in shared helpers for non-UI flows', () => {
    const facade = read('src/server/functions/communications/email-suppression.ts');
    const resendWebhook = read('src/trigger/jobs/process-resend-webhook.ts');
    const unsubscribe = read('src/routes/api/unsubscribe.$token.ts');
    const warranty = read('src/trigger/jobs/warranty-notifications.ts');

    expect(facade).not.toContain("from '@/lib/db'");
    expect(facade).not.toContain("from 'drizzle/schema");
    expect(facade).toContain('./_shared/suppression-read');
    expect(facade).toContain('./_shared/suppression-mutations');
    expect(facade).toContain('./_shared/suppression-policy');
    expect(resendWebhook).toContain('_shared/suppression-mutations');
    expect(resendWebhook).toContain('_shared/suppression-policy');
    expect(unsubscribe).toContain('_shared/suppression-mutations');
    expect(warranty).toContain('_shared/suppression-read');
  });

  it('keeps unsubscribe token verification owned by signed HMAC tokens only', () => {
    const route = read('src/routes/api/unsubscribe.$token.ts');
    const secureTokens = read('src/lib/server/unsubscribe-tokens.ts');
    const preferenceFacade = read('src/lib/server/communication-preferences.ts');

    expect(route).toContain(
      'verifyUnsubscribeToken as verifySecureToken',
    );
    expect(route).toContain('const securePayload = verifySecureToken(token)');
    expect(route).not.toContain("from '@/lib/server/communication-preferences'");
    expect(secureTokens).toContain('createHmac("sha256", secret)');
    expect(secureTokens).toContain('timingSafeEqual');
    expect(preferenceFacade).not.toContain('LegacyUnsubscribePayload');
    expect(preferenceFacade).not.toContain('decodeBase64');
    expect(preferenceFacade).not.toContain('verifyUnsubscribeToken');
  });

  it('keeps Resend webhook signature failures behind provider-owned log context', () => {
    const route = read('src/routes/api/webhooks/resend.ts');

    expect(route).toContain('getResendWebhookSignatureFailureLogContext(error)');
    expect(route).not.toContain('error instanceof Error ? error.message');
  });

  it('separates campaign cancel from pause and preserves recipient customer identity', () => {
    const page = read('src/routes/_authenticated/communications/campaigns/campaigns-page.tsx');
    const recipients = read('src/server/functions/communications/_shared/campaign-recipient-read.ts');
    const processing = read(
      'src/server/functions/communications/_shared/campaign-send-processing.ts'
    );
    const schema = read('drizzle/schema/communications/email-campaigns.ts');

    expect(page).toContain('useCancelCampaign');
    expect(page).toContain('await cancelMutation.mutateAsync({ id })');
    expect(recipients).toContain('customerId: contact.customerId');
    expect(processing).toContain('recipient.customerId ?? recipient.contactCustomerId');
    expect(schema).toContain('customerId: uuid("customer_id")');
  });

  it('keeps campaign hook ownership on the active campaign module', () => {
    const index = read('src/hooks/communications/index.ts');
    const activeHook = read('src/hooks/communications/use-campaigns.ts');

    expect(index).toContain("export * from './use-campaigns';");
    expect(index).not.toContain('use-email-campaigns');
    expect(activeHook).toContain('export function useCreateCampaign()');
    expect(activeHook).toContain('queryKeys.communications.campaigns()');
    expect(activeHook).not.toContain('queryKeys.communications.all');
    expect(existsSync(join(root, 'src/hooks/communications/use-email-campaigns.ts'))).toBe(
      false
    );
  });

  it('marks only the most specific communications nav item active', () => {
    const nav = read('src/routes/_authenticated/communications/communications-nav.tsx');

    expect(nav).toContain('sortedItems.find');
    expect(nav).toContain('const isActive = activePath === item.to');
  });
});
