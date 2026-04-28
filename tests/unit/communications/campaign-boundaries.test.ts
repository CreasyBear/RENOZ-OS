import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('campaign separation boundaries', () => {
  it('keeps shared campaign helpers outside the ServerFn facade', () => {
    const server = read('src/server/functions/communications/email-campaigns.ts');
    const actions = read('src/server/functions/communications/_shared/campaign-actions.ts');
    const selection = read(
      'src/server/functions/communications/_shared/campaign-recipient-selection.ts'
    );
    const recipients = read('src/server/functions/communications/_shared/campaign-recipient-read.ts');

    expect(server).toContain('readCampaignRecipients');
    expect(server).toContain('getCampaignForAction');
    expect(server).toContain('triggerCampaignSend');
    expect(actions).toContain('export async function ensureCampaignHasRecipients');
    expect(recipients).toContain('buildCampaignRecipientConditions');
    expect(selection).toContain('export function buildCampaignRecipientConditions');
  });

  it('keeps server-only campaign imports pointed at helpers, not ServerFns', () => {
    const serverExports = read('src/lib/server/email-campaigns.ts');

    expect(serverExports).toContain('_shared/campaign-actions');
    expect(serverExports).toContain('_shared/campaign-recipient-selection');
    expect(serverExports).not.toContain('server/functions/communications/email-campaigns');
  });

  it('does not couple the campaign worker to ServerFn modules', () => {
    const job = read('src/trigger/jobs/send-campaign.ts');

    expect(job).not.toContain("from '@/server/functions/communications/email-campaigns'");
    expect(job).not.toContain('server/functions/communications/email-campaigns');
  });
});
