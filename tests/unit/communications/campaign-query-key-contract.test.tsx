import { describe, expect, it } from 'vitest';
import { communicationsQueryKeys } from '@/lib/query-key-catalog/communications';
import { queryKeys } from '@/lib/query-keys';

describe('campaign query key contract', () => {
  it('exposes the communications catalog through the public query key adapter', () => {
    expect(queryKeys.communications).toBe(communicationsQueryKeys);
  });

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

  it('keeps communications cache roots in the communications-owned catalog', () => {
    expect(communicationsQueryKeys.campaigns()).toEqual(['communications', 'campaigns']);
    expect(communicationsQueryKeys.scheduledCallsList({ limit: 10 })).toEqual([
      'communications',
      'scheduledCalls',
      'list',
      { limit: 10 },
    ]);
    expect(communicationsQueryKeys.emailSuppression.check('ops@example.com')).toEqual([
      'communications',
      'emailSuppression',
      'check',
      'ops@example.com',
    ]);
  });
});
