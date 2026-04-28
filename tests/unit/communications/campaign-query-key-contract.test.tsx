import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('campaign query key contract', () => {
  it('includes recipient offset so pages do not share cache entries', () => {
    expect(
      queryKeys.communications.campaignRecipients('campaign-1', {
        status: 'pending',
        limit: 50,
        offset: 0,
      })
    ).not.toEqual(
      queryKeys.communications.campaignRecipients('campaign-1', {
        status: 'pending',
        limit: 50,
        offset: 50,
      })
    );
  });

  it('includes preview sample size so different previews do not share cache entries', () => {
    const recipientCriteria = { statuses: ['active'], tags: ['vip'] };

    expect(
      queryKeys.communications.campaignPreview({
        recipientCriteria,
        sampleSize: 5,
      })
    ).not.toEqual(
      queryKeys.communications.campaignPreview({
        recipientCriteria,
        sampleSize: 25,
      })
    );
  });
});
