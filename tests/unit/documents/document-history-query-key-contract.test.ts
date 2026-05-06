import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('document history query key contract', () => {
  it('uses the unfiltered entity history key as a prefix for typed document history', async () => {
    const queryClient = new QueryClient();
    const rootKey = queryKeys.documents.history('order', 'order-1');
    const quoteKey = queryKeys.documents.history('order', 'order-1', 'quote');
    const invoiceKey = queryKeys.documents.history('order', 'order-1', 'invoice');
    const otherOrderKey = queryKeys.documents.history('order', 'order-2', 'quote');

    expect(rootKey).toEqual(queryKeys.documents.historyRoot('order', 'order-1'));
    expect(rootKey).not.toContain('');
    expect(quoteKey.slice(0, rootKey.length)).toEqual(rootKey);
    expect(invoiceKey.slice(0, rootKey.length)).toEqual(rootKey);
    expect(otherOrderKey.slice(0, rootKey.length)).not.toEqual(rootKey);

    queryClient.setQueryData(rootKey, []);
    queryClient.setQueryData(quoteKey, []);
    queryClient.setQueryData(invoiceKey, []);
    queryClient.setQueryData(otherOrderKey, []);

    await queryClient.invalidateQueries({ queryKey: rootKey });

    expect(queryClient.getQueryState(rootKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(quoteKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(invoiceKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherOrderKey)?.isInvalidated).toBe(false);
  });
});
