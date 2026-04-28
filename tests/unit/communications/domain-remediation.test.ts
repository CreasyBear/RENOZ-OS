import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('separates campaign cancel from pause and preserves recipient customer identity', () => {
    const page = read('src/routes/_authenticated/communications/campaigns/campaigns-page.tsx');
    const recipients = read('src/server/functions/communications/_shared/campaign-recipient-read.ts');
    const job = read('src/trigger/jobs/send-campaign.ts');
    const schema = read('drizzle/schema/communications/email-campaigns.ts');

    expect(page).toContain('useCancelCampaign');
    expect(page).toContain('await cancelMutation.mutateAsync({ id })');
    expect(recipients).toContain('customerId: contact.customerId');
    expect(job).toContain('recipient.customerId ?? recipient.contactCustomerId');
    expect(schema).toContain('customerId: uuid("customer_id")');
  });

  it('marks only the most specific communications nav item active', () => {
    const nav = read('src/routes/_authenticated/communications/communications-nav.tsx');

    expect(nav).toContain('sortedItems.find');
    expect(nav).toContain('const isActive = activePath === item.to');
  });
});
