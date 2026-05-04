import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateSerializedItem = vi.fn();
const mockUpdateSerializedItem = vi.fn();
const mockDeleteSerializedItem = vi.fn();
const mockAddSerializedItemNote = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/hooks/_shared/use-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock('@/server/functions/inventory/serialized-items', () => ({
  listSerializedItems: vi.fn(),
  getSerializedItem: vi.fn(),
  createSerializedItem: (...args: unknown[]) => mockCreateSerializedItem(...args),
  updateSerializedItem: (...args: unknown[]) => mockUpdateSerializedItem(...args),
  deleteSerializedItem: (...args: unknown[]) => mockDeleteSerializedItem(...args),
  addSerializedItemNote: (...args: unknown[]) => mockAddSerializedItemNote(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventorySerializedItemsQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory serialized item query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses safe mutation fallback copy instead of raw serialized create errors', async () => {
    mockCreateSerializedItem.mockRejectedValue(
      new Error('duplicate key value violates unique constraint serialized_items_serial_unique')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCreateSerializedItem } = await import('@/hooks/inventory/use-serialized-items');

    const { result } = renderHook(() => useCreateSerializedItem(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        productId: '11111111-1111-4111-8111-111111111111',
        serialNumber: 'SN-001',
        status: 'available',
      })
    ).rejects.toThrow('duplicate key value');

    expect(mockToastError).toHaveBeenCalledWith('Failed to create serialized item');
  });

  it('keeps serialized lineage code guidance for blocked shipment mutations', async () => {
    mockUpdateSerializedItem.mockRejectedValue({
      details: {
        validationErrors: {
          code: ['shipped_status_conflict'],
        },
      },
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useUpdateSerializedItem } = await import('@/hooks/inventory/use-serialized-items');

    const { result } = renderHook(() => useUpdateSerializedItem(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        id: '22222222-2222-4222-8222-222222222222',
        status: 'available',
      })
    ).rejects.toMatchObject({
      details: {
        validationErrors: {
          code: ['shipped_status_conflict'],
        },
      },
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'This serial has shipment history and cannot be mutated in this way.'
    );
  });

  it('uses safe mutation fallback copy for serialized delete and note errors', async () => {
    mockDeleteSerializedItem.mockRejectedValueOnce(
      new Error('delete from serialized_items violates foreign key constraint')
    );
    mockAddSerializedItemNote.mockRejectedValueOnce(
      new Error('insert into serialized_item_events violates row-level security policy')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useDeleteSerializedItem, useAddSerializedItemNote } = await import(
      '@/hooks/inventory/use-serialized-items'
    );

    const deleteMutation = renderHook(() => useDeleteSerializedItem(), {
      wrapper: createWrapper(queryClient),
    });
    const noteMutation = renderHook(() => useAddSerializedItemNote(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      deleteMutation.result.current.mutateAsync({
        id: '33333333-3333-4333-8333-333333333333',
      })
    ).rejects.toThrow('foreign key');

    await expect(
      noteMutation.result.current.mutateAsync({
        id: '44444444-4444-4444-8444-444444444444',
        note: 'Quarantine inspection note',
      })
    ).rejects.toThrow('row-level security');

    expect(mockToastError).toHaveBeenCalledWith('Failed to delete serialized item');
    expect(mockToastError).toHaveBeenCalledWith('Failed to add note');
  });
});
