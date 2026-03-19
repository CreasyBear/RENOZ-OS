import { describe, expect, it, vi } from 'vitest';
import { processXeroPaymentWebhookEvents } from '@/server/functions/financial/xero-invoice-sync';

describe('processXeroPaymentWebhookEvents', () => {
  it('accepts applied and duplicate batches', async () => {
    const applyFn = vi
      .fn()
      .mockResolvedValueOnce({ success: true, duplicate: false, resultState: 'applied' })
      .mockResolvedValueOnce({ success: true, duplicate: true, resultState: 'duplicate' });

    const result = await processXeroPaymentWebhookEvents([{ id: 'evt-1' }, { id: 'evt-2' }], applyFn as never);

    expect(result).toMatchObject({
      status: 'accepted',
      httpStatus: 200,
      duplicateCount: 1,
    });
  });

  it('returns retry when any event is retryable', async () => {
    const applyFn = vi
      .fn()
      .mockResolvedValueOnce({ success: true, duplicate: false, resultState: 'applied' })
      .mockResolvedValueOnce({
        success: false,
        retryable: true,
        resultState: 'processing',
        error: 'Rate limited',
      });

    const result = await processXeroPaymentWebhookEvents([{ id: 'evt-1' }, { id: 'evt-2' }], applyFn as never);

    expect(result).toMatchObject({
      status: 'retry',
      httpStatus: 503,
    });
  });
});
