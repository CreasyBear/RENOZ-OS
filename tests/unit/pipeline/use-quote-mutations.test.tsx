import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const generateQuotePdfMock = vi.fn();
const sendQuoteMock = vi.fn();
const deleteQuoteMock = vi.fn();

vi.mock('@/server/functions/pipeline/quote-versions', () => ({
  createQuoteVersion: vi.fn(),
  restoreQuoteVersion: vi.fn(),
  updateQuoteExpiration: vi.fn(),
  extendQuoteValidity: vi.fn(),
  generateQuotePdf: (args: unknown) => generateQuotePdfMock(args),
  sendQuote: (args: unknown) => sendQuoteMock(args),
}));

vi.mock('@/server/functions/pipeline/quote-delete', () => ({
  deleteQuote: (args: unknown) => deleteQuoteMock(args),
}));

describe('useQuoteMutations hardening', () => {
  beforeEach(() => {
    generateQuotePdfMock.mockReset();
    sendQuoteMock.mockReset();
    deleteQuoteMock.mockReset();
  });

  function createWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  }

  it('invalidates opportunity, documents, and activity views after sending a quote', async () => {
    sendQuoteMock.mockResolvedValue({
      success: true,
      status: 'sent',
      stages: {
        pdf: { status: 'completed' },
        emailHistory: { status: 'completed' },
        email: { status: 'completed' },
        stageBump: { status: 'completed' },
      },
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useSendQuote } = await import('@/hooks/pipeline/use-quote-mutations');
    const { result } = renderHook(() => useSendQuote(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        opportunityId: 'opp-1',
        quoteVersionId: 'quote-1',
        recipientEmail: 'customer@example.com',
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.quoteVersions('opp-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.opportunity('opp-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.opportunities.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.opportunities.infiniteLists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.documents.history('opportunity', 'opp-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.byOpportunity('opp-1'),
    });
  });

  it('refreshes quote and document state after generating a quote PDF', async () => {
    generateQuotePdfMock.mockResolvedValue({
      quoteVersionId: 'quote-1',
      pdfUrl: 'https://example.com/q.pdf',
      filename: 'quote.pdf',
      fileSize: 1024,
      checksum: 'abc123',
      status: 'completed',
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useGenerateQuotePdf } = await import('@/hooks/pipeline/use-quote-mutations');
    const { result } = renderHook(() => useGenerateQuotePdf(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ quoteVersionId: 'quote-1' });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.documents.all,
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.all,
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.quoteVersion('quote-1'),
    });
  });

  it('refreshes quote lists, quote detail, and pipeline metrics after deleting a quote', async () => {
    deleteQuoteMock.mockResolvedValue({ success: true });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useDeleteQuote } = await import('@/hooks/pipeline/use-quote-mutations');
    const { result } = renderHook(() => useDeleteQuote(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('quote-1');
    });

    expect(deleteQuoteMock).toHaveBeenCalledWith({ data: { id: 'quote-1' } });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.quotes.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.quotes.detail('quote-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.metrics(),
    });
  });
});
