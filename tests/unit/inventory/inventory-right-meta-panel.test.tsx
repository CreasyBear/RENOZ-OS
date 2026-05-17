import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RightMetaPanel } from '@/components/domain/inventory/views/inventory-right-meta-panel';
import type { ItemDetailData } from '@/components/domain/inventory/item-detail';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  }) => (
    <a
      href={to.replace('$productId', params?.productId ?? '')}
      data-product-id={params?.productId}
      data-search-tab={search?.tab}
      {...props}
    >
      {children}
    </a>
  ),
}));

function item(overrides: Partial<ItemDetailData> = {}): ItemDetailData {
  return {
    id: 'item-1',
    productId: 'product-1',
    productName: 'Battery Module',
    productSku: 'BAT-100',
    productDescription: '48V lithium-ion storage module',
    locationId: 'location-1',
    locationName: 'Main Warehouse',
    locationCode: 'WH-1',
    serialNumber: 'SN-001',
    lotNumber: 'LOT-2026-A',
    binLocation: 'A1-02',
    expiryDate: new Date('2027-01-01T00:00:00.000Z'),
    receivedAt: new Date('2026-01-02T00:00:00.000Z'),
    lastMovementAt: new Date('2026-02-03T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-04T00:00:00.000Z'),
    quantityOnHand: 10,
    quantityAllocated: 2,
    quantityAvailable: 8,
    unitCost: 100,
    totalValue: 1000,
    status: 'available',
    ...overrides,
  };
}

describe('RightMetaPanel', () => {
  it('renders product context and links operators back to product inventory', () => {
    render(<RightMetaPanel item={item()} />);

    expect(screen.getByText('Battery Module')).toBeInTheDocument();
    expect(screen.getByText('48V lithium-ion storage module')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /View Product Inventory/i });
    expect(link).toHaveAttribute('href', '/products/product-1');
    expect(link).toHaveAttribute('data-product-id', 'product-1');
    expect(link).toHaveAttribute('data-search-tab', 'inventory');
  });

  it('renders identification, location, lifecycle dates, and audit dates', () => {
    render(<RightMetaPanel item={item()} />);

    const panel = screen.getByRole('complementary');

    expect(within(panel).getByText('Identification')).toBeInTheDocument();
    expect(within(panel).getByText('SKU')).toBeInTheDocument();
    expect(within(panel).getByText('BAT-100')).toBeInTheDocument();
    expect(within(panel).getByText('Serial #')).toBeInTheDocument();
    expect(within(panel).getByText('SN-001')).toBeInTheDocument();
    expect(within(panel).getByText('Lot #')).toBeInTheDocument();
    expect(within(panel).getByText('LOT-2026-A')).toBeInTheDocument();
    expect(within(panel).getByText('Bin')).toBeInTheDocument();
    expect(within(panel).getByText('A1-02')).toBeInTheDocument();

    expect(within(panel).getByText('Location')).toBeInTheDocument();
    expect(within(panel).getByText('WH-1')).toBeInTheDocument();
    expect(within(panel).getByText('Main Warehouse')).toBeInTheDocument();

    expect(within(panel).getByText('Dates')).toBeInTheDocument();
    expect(within(panel).getByText('Expiry')).toBeInTheDocument();
    expect(within(panel).getByText('Jan 1, 2027')).toBeInTheDocument();
    expect(within(panel).getByText('Received')).toBeInTheDocument();
    expect(within(panel).getByText('Jan 2, 2026')).toBeInTheDocument();
    expect(within(panel).getByText('Last Move')).toBeInTheDocument();
    expect(within(panel).getByText('Feb 3, 2026')).toBeInTheDocument();

    expect(within(panel).getByText('Audit Trail')).toBeInTheDocument();
    expect(within(panel).getByText('Created')).toBeInTheDocument();
    expect(within(panel).getByText('Updated')).toBeInTheDocument();
    expect(within(panel).getByText('Feb 4, 2026')).toBeInTheDocument();
  });

  it('keeps optional metadata honest when item details are missing', () => {
    render(
      <RightMetaPanel
        item={item({
          productDescription: undefined,
          serialNumber: undefined,
          lotNumber: undefined,
          binLocation: undefined,
          expiryDate: undefined,
          receivedAt: undefined,
          lastMovementAt: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        })}
      />
    );

    expect(screen.getByText('No description')).toBeInTheDocument();
    expect(screen.queryByText('Serial #')).not.toBeInTheDocument();
    expect(screen.queryByText('Lot #')).not.toBeInTheDocument();
    expect(screen.queryByText('Bin')).not.toBeInTheDocument();
    expect(screen.queryByText('Expiry')).not.toBeInTheDocument();
    expect(screen.queryByText('Received')).not.toBeInTheDocument();
    expect(screen.queryByText('Last Move')).not.toBeInTheDocument();
    expect(screen.queryByText('Created')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
  });

  it('keeps the right meta panel out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const rightMetaPanel = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-right-meta-panel.tsx'),
      'utf8'
    );

    expect(detailView).toContain(
      "import { RightMetaPanel } from './inventory-right-meta-panel'"
    );
    expect(detailView).not.toContain('function RightMetaPanel');
    expect(rightMetaPanel).toContain('export function RightMetaPanel');
    expect(rightMetaPanel).toContain('Audit Trail');
  });
});
