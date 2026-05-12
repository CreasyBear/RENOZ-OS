import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();
const mockUseProducts = vi.fn();
const mockUseProduct = vi.fn();
const mockUseLocations = vi.fn();
const mockUseMovements = vi.fn();
const mockUseReceiveInventory = vi.fn();
const mockUseProductSearch = vi.fn();
const mockFetchLocations = vi.fn().mockResolvedValue(undefined);
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastWarning = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

vi.mock('@/components/layout', () => {
  function MockPageLayoutRoot({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
  }
  MockPageLayoutRoot.displayName = 'MockPageLayout';

  function MockPageLayoutHeader({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) {
    return (
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions}
      </div>
    );
  }
  MockPageLayoutHeader.displayName = 'MockPageLayoutHeader';

  function MockPageLayoutContent({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
  }
  MockPageLayoutContent.displayName = 'MockPageLayoutContent';

  MockPageLayoutRoot.Header = MockPageLayoutHeader;
  MockPageLayoutRoot.Content = MockPageLayoutContent;

  return { PageLayout: MockPageLayoutRoot };
});

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>Loading locations</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode; id?: string; className?: string }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <div>{placeholder ?? null}</div>,
}));

vi.mock('@/components/domain/inventory/receiving/receiving-form', () => ({
  ReceivingForm: ({ submitError }: { submitError?: string | null }) => (
    <div>
      <div>Receiving Form Stub</div>
      {submitError ? <div>{submitError}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/domain/inventory/receiving/receiving-history', () => ({
  ReceivingHistory: () => <div>Receiving History</div>,
}));

vi.mock('@/components/mobile/inventory-actions', () => ({
  BarcodeScanner: ({ onScan }: { onScan: (barcode: string) => void }) => (
    <button onClick={() => onScan('sku-1')}>Scan product</button>
  ),
  QuantityInput: ({ value }: { value: number }) => <div>Quantity: {value}</div>,
  OfflineIndicator: () => <div>Offline Indicator</div>,
  MobileInventoryCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MobilePageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/hooks/inventory', () => ({
  useLocations: (...args: unknown[]) => mockUseLocations(...args),
  useMovements: (...args: unknown[]) => mockUseMovements(...args),
  useReceiveInventory: (...args: unknown[]) => mockUseReceiveInventory(...args),
}));

vi.mock('@/hooks/products', () => ({
  useProducts: (...args: unknown[]) => mockUseProducts(...args),
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useProductSearch: (...args: unknown[]) => mockUseProductSearch(...args),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
  useOnlineStatus: () => true,
  useOfflineQueue: () => ({
    queue: [],
    addToQueue: vi.fn(),
    syncQueue: vi.fn(),
    isSyncing: false,
    queueLength: 0,
  }),
}));

describe('inventory receiving location read policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue({});
    mockUseProducts.mockReturnValue({
      data: { products: [] },
      isLoading: false,
    });
    mockUseProduct.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    });
    mockUseMovements.mockReturnValue({
      data: { movements: [] },
      isLoading: false,
    });
    mockUseReceiveInventory.mockReturnValue({
      mutateAsync: vi.fn(),
      error: null,
    });
    mockUseLocations.mockReturnValue({
      locations: [],
      isLoading: false,
      locationsError: new Error('select from warehouse_locations violates row-level security policy'),
      fetchLocations: mockFetchLocations,
    });
    mockUseProductSearch.mockImplementation((query: string) => ({
      data: query
        ? {
            products: [
              {
                id: 'product-1',
                name: 'Battery Unit',
                sku: 'BAT-001',
                isSerialized: false,
                status: 'active',
                isActive: true,
                trackInventory: true,
                basePrice: 10,
                costPrice: 10,
              },
            ],
          }
        : undefined,
    }));
  });

  it('blocks the desktop receive form when warehouse locations are unavailable', async () => {
    const { default: ReceivingPage } = await import(
      '@/routes/_authenticated/inventory/receiving-page'
    );

    render(<ReceivingPage />);

    expect(screen.getByText('Warehouse locations are temporarily unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Warehouse locations are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Receiving Form Stub')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Locations' }));
    expect(mockFetchLocations).toHaveBeenCalled();
  });

  it('uses safe receive submit copy instead of raw receive mutation errors', async () => {
    mockUseLocations.mockReturnValue({
      locations: [{ id: 'loc-1', code: 'MAIN', name: 'Main Warehouse' }],
      isLoading: false,
      locationsError: null,
      fetchLocations: mockFetchLocations,
    });
    mockUseReceiveInventory.mockReturnValue({
      mutateAsync: vi.fn(),
      error: new Error('insert into inventory_movements violates row-level security policy'),
    });

    const { default: ReceivingPage } = await import(
      '@/routes/_authenticated/inventory/receiving-page'
    );

    render(<ReceivingPage />);

    expect(screen.getByText('Receiving Form Stub')).toBeInTheDocument();
    expect(screen.getByText('Failed to receive inventory')).toBeInTheDocument();
    expect(screen.queryByText(/row-level security policy/i)).not.toBeInTheDocument();
  });

  it('blocks contextual receiving for products that are not active inventory stock', async () => {
    mockUseSearch.mockReturnValue({
      source: 'product_detail',
      productId: 'product-1',
      returnToProductId: 'product-1',
    });
    mockUseLocations.mockReturnValue({
      locations: [{ id: 'loc-1', code: 'MAIN', name: 'Main Warehouse' }],
      isLoading: false,
      locationsError: null,
      fetchLocations: mockFetchLocations,
    });
    mockUseProduct.mockReturnValue({
      data: {
        product: {
          id: 'product-1',
          sku: 'SVC-001',
          name: 'Installation Service',
          costPrice: 0,
          isSerialized: false,
          status: 'inactive',
          isActive: false,
          trackInventory: false,
        },
      },
      error: null,
      isLoading: false,
    });

    const { default: ReceivingPage } = await import(
      '@/routes/_authenticated/inventory/receiving-page'
    );

    render(<ReceivingPage />);

    expect(
      screen.getByText('Product is not available for manual receiving')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Select an active inventory-tracked product before recording non-PO inbound stock.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Receiving Form Stub')).not.toBeInTheDocument();
  });

  it('uses stable location unavailable copy instead of raw location read errors', async () => {
    const {
      getReceivingLocationsErrorMessage,
    } = await import('@/routes/_authenticated/inventory/receiving-error-messages');

    expect(
      getReceivingLocationsErrorMessage(
        new Error('select from warehouse_locations violates row-level security policy')
      )
    ).toBe('Warehouse locations are temporarily unavailable. Please refresh and try again.');
  });

  it('shows an unavailable mobile location state instead of no locations configured', async () => {
    const { default: MobileReceivingPage } = await import(
      '@/routes/_authenticated/mobile/-receiving-page'
    );

    render(<MobileReceivingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan product' }));

    await waitFor(() =>
      expect(
        screen.getByText('Warehouse locations are temporarily unavailable.')
      ).toBeInTheDocument()
    );

    expect(
      screen.getByText(
        'Warehouse locations are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No locations configured. Please set up warehouse locations first.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Locations' }));
    expect(mockFetchLocations).toHaveBeenCalled();
  });

  it('blocks mobile receiving scans for products that are not active inventory stock', async () => {
    mockUseLocations.mockReturnValue({
      locations: [{ id: 'loc-1', code: 'MAIN', name: 'Main Warehouse' }],
      isLoading: false,
      locationsError: null,
      fetchLocations: mockFetchLocations,
    });
    mockUseProductSearch.mockImplementation((query: string) => ({
      data: query
        ? {
            products: [
              {
                id: 'product-1',
                name: 'Installation Service',
                sku: 'SVC-001',
                isSerialized: false,
                status: 'inactive',
                isActive: true,
                trackInventory: false,
                basePrice: 10,
                costPrice: 10,
              },
            ],
          }
        : undefined,
    }));

    const { default: MobileReceivingPage } = await import(
      '@/routes/_authenticated/mobile/-receiving-page'
    );

    render(<MobileReceivingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan product' }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Product is not available for mobile receiving',
        { description: 'Select an active inventory-tracked product.' }
      )
    );

    expect(screen.queryByText('Location')).not.toBeInTheDocument();
  });

  it('prefills mobile receiving unit cost from product cost price before sell price', async () => {
    mockUseLocations.mockReturnValue({
      locations: [{ id: 'loc-1', code: 'MAIN', name: 'Main Warehouse' }],
      isLoading: false,
      locationsError: null,
      fetchLocations: mockFetchLocations,
    });
    mockUseProductSearch.mockImplementation((query: string) => ({
      data: query
        ? {
            products: [
              {
                id: 'product-1',
                name: 'Battery Unit',
                sku: 'BAT-001',
                isSerialized: false,
                status: 'active',
                isActive: true,
                trackInventory: true,
                basePrice: 100,
                costPrice: 42,
              },
            ],
          }
        : undefined,
    }));

    const { default: MobileReceivingPage } = await import(
      '@/routes/_authenticated/mobile/-receiving-page'
    );

    render(<MobileReceivingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan product' }));

    const unitCostInput = await screen.findByLabelText('Unit Cost ($)');
    expect(unitCostInput).toHaveValue(42);
  });
});
