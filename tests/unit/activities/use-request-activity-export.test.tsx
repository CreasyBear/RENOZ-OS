import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockRequestActivityExport = vi.fn();

vi.mock('@/server/functions/activities/activities', () => ({
  requestActivityExport: (...args: unknown[]) => mockRequestActivityExport(...args),
}));

describe('useRequestActivityExport', () => {
  it('calls the activity export server function through a mutation', async () => {
    mockRequestActivityExport.mockResolvedValue({
      status: 'completed',
      downloadUrl: 'https://example.com/export',
      filename: 'activity-export-2026-03-16.csv',
      expiresAt: new Date('2026-03-17T00:00:00.000Z'),
      format: 'csv',
      generatedAt: new Date('2026-03-16T00:00:00.000Z'),
      recordCount: 1,
    });

    const { useRequestActivityExport } = await import('@/hooks/activities/use-activities');
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRequestActivityExport(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ format: 'csv' });
    });

    expect(mockRequestActivityExport).toHaveBeenCalledWith({
      data: { format: 'csv' },
    });
  });
});
