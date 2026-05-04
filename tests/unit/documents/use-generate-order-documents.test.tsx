import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGenerateOrderDocument = vi.fn();
const mockGenerateShipmentDocument = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>(
    '@tanstack/react-start'
  );
  return {
    ...actual,
    useServerFn: (fn: unknown) => fn,
  };
});

vi.mock('@/server/functions/documents/generate-documents-sync', () => ({
  generateOrderDocument: (...args: unknown[]) => mockGenerateOrderDocument(...args),
  generateShipmentDocument: (...args: unknown[]) => mockGenerateShipmentDocument(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'GenerateOrderDocumentsWrapper';
  return Wrapper;
}

describe('order document generation hooks', () => {
  it('normalizes wrapped order document responses before returning them to callers', async () => {
    mockGenerateOrderDocument.mockResolvedValue({
      result: {
        orderId: '64f93295-5ed4-4ca2-9717-735039132698',
        documentType: 'invoice',
        entityType: 'order',
        entityId: '64f93295-5ed4-4ca2-9717-735039132698',
        url: 'https://example.com/invoice.pdf',
        filename: 'invoice.pdf',
        storagePath: 'orders/invoice.pdf',
        fileSize: 1234,
        checksum: 'abc123',
      },
    });

    const { useGenerateOrderInvoice } = await import('@/hooks/documents/use-generate-order-documents');

    const { result } = renderHook(() => useGenerateOrderInvoice(), {
      wrapper: createWrapper(),
    });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        orderId: '64f93295-5ed4-4ca2-9717-735039132698',
      });
    });

    expect(mockGenerateOrderDocument).toHaveBeenCalledWith({
      data: {
        orderId: '64f93295-5ed4-4ca2-9717-735039132698',
        documentType: 'invoice',
      },
    });
    expect(mutationResult).toMatchObject({
      orderId: '64f93295-5ed4-4ca2-9717-735039132698',
      documentType: 'invoice',
      url: 'https://example.com/invoice.pdf',
      filename: 'invoice.pdf',
    });
  });

  it('normalizes raw Response payloads from POST server functions', async () => {
    mockGenerateOrderDocument.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            orderId: '64f93295-5ed4-4ca2-9717-735039132698',
            documentType: 'pro-forma',
            entityType: 'order',
            entityId: '64f93295-5ed4-4ca2-9717-735039132698',
            url: 'https://example.com/pro-forma.pdf',
            filename: 'pro-forma.pdf',
            storagePath: 'orders/pro-forma.pdf',
            fileSize: 987,
            checksum: 'ghi789',
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );

    const { useGenerateOrderProForma } = await import(
      '@/hooks/documents/use-generate-order-documents'
    );

    const { result } = renderHook(() => useGenerateOrderProForma(), {
      wrapper: createWrapper(),
    });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        orderId: '64f93295-5ed4-4ca2-9717-735039132698',
      });
    });

    expect(mutationResult).toMatchObject({
      orderId: '64f93295-5ed4-4ca2-9717-735039132698',
      documentType: 'pro-forma',
      url: 'https://example.com/pro-forma.pdf',
      filename: 'pro-forma.pdf',
    });
  });

  it('normalizes wrapped shipment document responses before returning them to callers', async () => {
    mockGenerateShipmentDocument.mockResolvedValue({
      data: {
        orderId: '64f93295-5ed4-4ca2-9717-735039132698',
        shipmentId: '5c646761-ef6c-45c8-a150-c41f8ab37708',
        documentType: 'packing-slip',
        entityType: 'shipment',
        entityId: '5c646761-ef6c-45c8-a150-c41f8ab37708',
        url: 'https://example.com/packing-slip.pdf',
        filename: 'packing-slip.pdf',
        storagePath: 'shipments/packing-slip.pdf',
        fileSize: 4321,
        checksum: 'def456',
      },
    });

    const { useGenerateShipmentPackingSlip } = await import(
      '@/hooks/documents/use-generate-order-documents'
    );

    const { result } = renderHook(() => useGenerateShipmentPackingSlip(), {
      wrapper: createWrapper(),
    });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        shipmentId: '5c646761-ef6c-45c8-a150-c41f8ab37708',
      });
    });

    expect(mockGenerateShipmentDocument).toHaveBeenCalledWith({
      data: {
        shipmentId: '5c646761-ef6c-45c8-a150-c41f8ab37708',
        documentType: 'packing-slip',
      },
    });
    expect(mutationResult).toMatchObject({
      shipmentId: '5c646761-ef6c-45c8-a150-c41f8ab37708',
      documentType: 'packing-slip',
      url: 'https://example.com/packing-slip.pdf',
      filename: 'packing-slip.pdf',
    });
  });
});
