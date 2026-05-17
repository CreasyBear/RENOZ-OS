import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryDashboardCommandBar } from '@/components/domain/inventory/inventory-dashboard-command-bar';

const mockNavigate = vi.fn();
const mockUseInventorySearch = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode;
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/hooks/inventory', () => ({
  useInventorySearch: (...args: unknown[]) => mockUseInventorySearch(...args),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: string;
    size?: string;
  }) => (
    <button type="button" onClick={onClick} aria-label={props['aria-label']} title={props.title}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

function renderCommandBar(onRefresh = vi.fn()) {
  render(<InventoryDashboardCommandBar onRefresh={onRefresh} />);
  return { onRefresh };
}

describe('InventoryDashboardCommandBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInventorySearch.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    });
  });

  it('debounces inventory search and shows an honest empty search result', () => {
    renderCommandBar();

    fireEvent.focus(screen.getByLabelText('Search inventory'));
    fireEvent.change(screen.getByLabelText('Search inventory'), {
      target: { value: 'battery' },
    });

    expect(mockUseInventorySearch).toHaveBeenLastCalledWith('battery', { limit: 8 }, true);
    expect(screen.getByText('No inventory found for "battery"')).toBeInTheDocument();
  });

  it('navigates to inventory items and product inventory from search results', () => {
    mockUseInventorySearch.mockReturnValue({
      data: {
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Battery Module',
            productSku: 'BAT-100',
            serialNumber: 'SN-001',
            locationName: 'Main Warehouse',
            quantityOnHand: 3,
            status: 'allocated',
          },
        ],
      },
      isLoading: false,
    });

    renderCommandBar();

    fireEvent.focus(screen.getByLabelText('Search inventory'));
    fireEvent.change(screen.getByLabelText('Search inventory'), {
      target: { value: 'bat' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Battery Module/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/inventory/$itemId',
      params: { itemId: 'item-1' },
    });

    fireEvent.focus(screen.getByLabelText('Search inventory'));
    fireEvent.change(screen.getByLabelText('Search inventory'), {
      target: { value: 'bat' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'View Product Inventory' }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/products/$productId',
      params: { productId: 'product-1' },
      search: { tab: 'inventory' },
    });
  });

  it('keeps refresh and warehouse quick action entry points together', () => {
    const { onRefresh } = renderCommandBar();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Receive Inventory/i })).toHaveAttribute(
      'href',
      '/inventory/receiving'
    );
    expect(screen.getByRole('link', { name: /Stock Count/i })).toHaveAttribute(
      'href',
      '/inventory/counts'
    );
    expect(screen.getByRole('link', { name: /Manage Locations/i })).toHaveAttribute(
      'href',
      '/inventory/locations'
    );
    expect(screen.getByRole('link', { name: /Alert Settings/i })).toHaveAttribute(
      'href',
      '/inventory/alerts'
    );
  });

  it('keeps command bar search wiring out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const commandBar = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-command-bar.tsx'),
      'utf8'
    );

    expect(dashboard).toContain(
      "import { InventoryDashboardCommandBar } from './inventory-dashboard-command-bar'"
    );
    expect(dashboard).toContain('<InventoryDashboardCommandBar onRefresh={handleRefresh} />');
    expect(dashboard).not.toContain('useInventorySearch');
    expect(dashboard).not.toContain('id="inventory-search"');
    expect(commandBar).toContain('export function InventoryDashboardCommandBar');
    expect(commandBar).toContain('useInventorySearch');
    expect(commandBar).toContain('Receive Inventory');
  });
});
