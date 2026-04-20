import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListQualityInspections = vi.fn();
const mockCreateQualityInspection = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/server/functions/inventory', () => ({
  listQualityInspections: (...args: unknown[]) => mockListQualityInspections(...args),
  createQualityInspection: (...args: unknown[]) => mockCreateQualityInspection(...args),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <div />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>Loading</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

vi.mock('@/components/shared/activity', () => ({
  UnifiedActivityTimeline: () => <div>Activity Timeline</div>,
}));

vi.mock('@/components/shared/mobile-sidebar-sheet', () => ({
  MobileSidebarSheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/data-table', () => ({
  StatusCell: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock('@/components/domain/inventory/alerts/inventory-item-alerts', () => ({
  InventoryItemAlerts: () => <div>Alerts</div>,
}));

vi.mock('@/components/domain/inventory/components', () => ({
  ItemLifecycleProgress: () => <div>Lifecycle Progress</div>,
  OrderAssociationCard: () => <div>Order Association</div>,
  ItemLifecycleTimeline: () => <div>Lifecycle Timeline</div>,
}));

vi.mock('@/lib/activities', () => ({
  getActivitiesFeedSearch: () => ({}),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventoryQualityQueryNormalizationWave3Wrapper';
  return Wrapper;
}

const baseItem = {
  id: 'inventory-1',
  productId: 'product-1',
  productName: 'Battery Unit',
  productSku: 'BAT-001',
  locationId: 'location-1',
  locationName: 'Main Warehouse',
  locationCode: 'MAIN',
  quantityOnHand: 1,
  quantityAllocated: 0,
  quantityAvailable: 1,
  unitCost: 10,
  totalValue: 10,
  status: 'available' as const,
};

describe('inventory quality query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListQualityInspections.mockResolvedValue({
      inspections: [],
    });
  });

  it('treats quality inspection history as always-shaped and preserves empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useQualityInspections } = await import('@/hooks/inventory/use-quality');

    const { result } = renderHook(() => useQualityInspections('inventory-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      inspections: [],
    });
  });

  it('normalizes thrown quality history failures as system errors', async () => {
    mockListQualityInspections.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useQualityInspections } = await import('@/hooks/inventory/use-quality');

    const { result } = renderHook(() => useQualityInspections('inventory-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Quality inspection history is temporarily unavailable. Please refresh and try again.',
    });
  });

  it('renders an unavailable quality state instead of an empty-history fallback', async () => {
    const retry = vi.fn();
    const { InventoryDetailView } = await import(
      '@/components/domain/inventory/views/inventory-detail-view'
    );

    render(
      <InventoryDetailView
        item={baseItem}
        activeTab="quality"
        onTabChange={vi.fn()}
        showMetaPanel={false}
        onToggleMetaPanel={vi.fn()}
        qualityRecords={[]}
        isLoadingQuality={false}
        qualityError={
          new Error(
            'Quality inspection history is temporarily unavailable. Please refresh and try again.'
          )
        }
        onRetryQuality={retry}
      />
    );

    expect(
      screen.getByText('Quality inspection history is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Quality inspection history is temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('No quality inspections recorded')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Quality History' }));
    expect(retry).toHaveBeenCalled();
  });

  it('keeps cached quality history visible when a refetch fails', async () => {
    const retry = vi.fn();
    const { InventoryDetailView } = await import(
      '@/components/domain/inventory/views/inventory-detail-view'
    );

    render(
      <InventoryDetailView
        item={baseItem}
        activeTab="quality"
        onTabChange={vi.fn()}
        showMetaPanel={false}
        onToggleMetaPanel={vi.fn()}
        qualityRecords={[
          {
            id: 'inspection-1',
            inventoryId: 'inventory-1',
            inspectionDate: '2026-01-01T00:00:00.000Z',
            inspectorName: 'Alex Inspector',
            result: 'pass',
            notes: 'Passed visual inspection',
            defects: [],
          },
        ]}
        isLoadingQuality={false}
        qualityError={new Error('Refresh failed. The inspection history below may be stale until the next successful reload.')}
        onRetryQuality={retry}
      />
    );

    expect(
      screen.getByText('Showing the most recent quality history while refresh is unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText(/Inspected by/i)).toBeInTheDocument();
    expect(screen.getByText('Passed visual inspection')).toBeInTheDocument();
    expect(screen.queryByText('Quality inspection history is temporarily unavailable.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Quality History' }));
    expect(retry).toHaveBeenCalled();
  });
});
