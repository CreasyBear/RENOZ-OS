import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockGenerateQuotePdf = vi.fn();
const mockGenerateInvoicePdf = vi.fn();
const mockGetDocumentStatus = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>(
    '@tanstack/react-start'
  );
  return {
    ...actual,
    useServerFn: (fn: unknown) => fn,
  };
});

vi.mock('@/server/functions/documents', () => ({
  generateQuotePdf: (...args: unknown[]) => mockGenerateQuotePdf(...args),
  generateInvoicePdf: (...args: unknown[]) => mockGenerateInvoicePdf(...args),
  getDocumentStatus: (...args: unknown[]) => mockGetDocumentStatus(...args),
}));

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'AsyncDocumentHooksWrapper';
  return { queryClient, wrapper: Wrapper };
}

describe('async document generation hooks', () => {
  beforeEach(() => {
    mockGenerateQuotePdf.mockReset();
    mockGenerateInvoicePdf.mockReset();
    mockGetDocumentStatus.mockReset();
  });

  it('normalizes wrapped quote generation responses and invalidates order document views', async () => {
    const orderId = '143c9e34-5212-4d26-b3a0-01507c81efab';
    mockGenerateQuotePdf.mockResolvedValue({
      result: {
        success: true,
        orderId,
        message: 'Quote PDF generation started',
      },
    });

    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.orders.detail(orderId), { id: orderId });
    queryClient.setQueryData(queryKeys.documents.history('order', orderId), []);
    queryClient.setQueryData(queryKeys.documents.history('order', orderId, 'quote'), []);
    queryClient.setQueryData(queryKeys.documents.status(orderId, 'quote'), {
      orderId,
      documentType: 'quote',
      status: 'pending',
      url: null,
    });

    const { useGenerateQuote } = await import('@/hooks/documents/use-generate-document');
    const { result } = renderHook(() => useGenerateQuote(), { wrapper });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ orderId });
    });

    expect(mockGenerateQuotePdf).toHaveBeenCalledWith({
      data: {
        orderId,
      },
    });
    expect(mutationResult).toMatchObject({
      success: true,
      orderId,
      message: 'Quote PDF generation started',
    });
    expect(queryClient.getQueryState(queryKeys.orders.detail(orderId))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.documents.history('order', orderId))?.isInvalidated)
      .toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.documents.history('order', orderId, 'quote'))?.isInvalidated
    ).toBe(true);
    expect(queryClient.getQueryState(queryKeys.documents.status(orderId, 'quote'))?.isInvalidated)
      .toBe(true);
  });

  it('normalizes raw Response invoice generation payloads and falls back to the input order id', async () => {
    const orderId = '60161fd6-f2fb-4dbf-b8e7-66ed9e3584cc';
    mockGenerateInvoicePdf.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            success: true,
            message: 'Invoice PDF generation started',
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );

    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.documents.status(orderId, 'invoice'), {
      orderId,
      documentType: 'invoice',
      status: 'pending',
      url: null,
    });

    const { useGenerateInvoice } = await import('@/hooks/documents/use-generate-document');
    const { result } = renderHook(() => useGenerateInvoice(), { wrapper });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ orderId });
    });

    expect(mutationResult).toMatchObject({
      success: true,
      orderId,
      message: 'Invoice PDF generation started',
    });
    expect(queryClient.getQueryState(queryKeys.documents.status(orderId, 'invoice'))?.isInvalidated)
      .toBe(true);
  });

  it('normalizes wrapped document status responses before returning query data', async () => {
    const orderId = 'f523e2fb-5290-4f2c-85e9-d3bd3ff3aa5f';
    mockGetDocumentStatus.mockResolvedValue({
      result: {
        orderId,
        documentType: 'quote',
        status: 'completed',
        url: 'https://example.com/quote.pdf',
      },
    });

    const { wrapper } = createHarness();
    const { useDocumentStatus } = await import('@/hooks/documents/use-generate-document');

    const { result } = renderHook(
      () => useDocumentStatus({ orderId, documentType: 'quote' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      orderId,
      documentType: 'quote',
      status: 'completed',
      url: 'https://example.com/quote.pdf',
    });
  });
});
