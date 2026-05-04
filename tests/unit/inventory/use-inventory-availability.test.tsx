import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listInventoryMock = vi.fn();

vi.mock('@/server/functions/inventory/inventory', () => ({
  listInventory: (args: unknown) => listInventoryMock(args),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useInventoryAvailability', () => {
  beforeEach(() => {
    listInventoryMock.mockReset();
  });

  it('counts only available inventory as allocatable stock', async () => {
    listInventoryMock.mockResolvedValue({
      items: [
        {
          id: 'inv-quarantined',
          status: 'quarantined',
          quantityAvailable: 5,
          quantityAllocated: 0,
        },
        {
          id: 'inv-damaged',
          status: 'damaged',
          quantityAvailable: 2,
          quantityAllocated: 0,
        },
        {
          id: 'inv-available',
          status: 'available',
          quantityAvailable: 3,
          quantityAllocated: 1,
        },
      ],
    });

    const queryClient = new QueryClient();
    const { useInventoryAvailability } = await import('@/hooks/inventory/use-inventory-availability');

    const { result } = renderHook(
      () => useInventoryAvailability({ productId: 'product-1', quantity: 4 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      productId: 'product-1',
      requestedQty: 4,
      availableQty: 3,
      reservedQty: 1,
      isAvailable: false,
      shortfall: 1,
    });
  });
});
