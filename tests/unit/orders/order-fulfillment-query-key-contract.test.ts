import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('order fulfillment query key contract', () => {
  it('uses the unfiltered fulfillment key as a prefix for fulfillment summaries and filtered queues', async () => {
    const queryClient = new QueryClient();
    const rootKey = queryKeys.orders.fulfillment();
    const summaryKey = queryKeys.orders.fulfillmentSummary();
    const pickedQueueKey = queryKeys.orders.fulfillment('picked');
    const shipmentsKey = queryKeys.orders.shipments();

    expect(rootKey).toEqual(queryKeys.orders.fulfillmentRoot());
    expect(rootKey).not.toContain('');
    expect(summaryKey.slice(0, rootKey.length)).toEqual(rootKey);
    expect(pickedQueueKey.slice(0, rootKey.length)).toEqual(rootKey);
    expect(shipmentsKey.slice(0, rootKey.length)).not.toEqual(rootKey);

    queryClient.setQueryData(rootKey, []);
    queryClient.setQueryData(summaryKey, {});
    queryClient.setQueryData(pickedQueueKey, []);
    queryClient.setQueryData(shipmentsKey, []);

    await queryClient.invalidateQueries({ queryKey: rootKey });

    expect(queryClient.getQueryState(rootKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(summaryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(pickedQueueKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(shipmentsKey)?.isInvalidated).toBe(false);
  });
});
