import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryHeader } from '@/components/domain/inventory/views/inventory-header';
import type { ItemDetailData } from '@/components/domain/inventory/item-detail';

vi.mock('@/components/shared/data-table', () => ({
  StatusCell: ({
    status,
    statusConfig,
  }: {
    status: keyof typeof statusConfig;
    statusConfig: Record<string, { label: string }>;
  }) => <span>{statusConfig[status]?.label ?? status}</span>,
}));

function item(overrides: Partial<ItemDetailData> = {}): ItemDetailData {
  return {
    id: 'item-1',
    productId: 'product-1',
    productName: 'Battery Module',
    productSku: 'BAT-100',
    locationId: 'location-1',
    locationName: 'Main Warehouse',
    locationCode: 'WH-1',
    serialNumber: 'SN-001',
    lotNumber: 'LOT-2026-A',
    quantityOnHand: 10,
    quantityAllocated: 2,
    quantityAvailable: 8,
    unitCost: 100,
    totalValue: 1000,
    status: 'allocated',
    qualityStatus: 'damaged',
    expiryDate: new Date('2026-05-25T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-18T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('InventoryHeader', () => {
  it('renders product identity, item status, quality status, meta chips, and expiry warning', () => {
    render(<InventoryHeader item={item()} />);

    expect(screen.getByRole('heading', { name: 'Battery Module' })).toBeInTheDocument();
    expect(screen.getByText('Allocated')).toBeInTheDocument();
    expect(screen.getByText('Damaged')).toBeInTheDocument();
    expect(screen.getByText('Serial:')).toBeInTheDocument();
    expect(screen.getByText('SN-001')).toBeInTheDocument();
    expect(screen.getByText('SKU:')).toBeInTheDocument();
    expect(screen.getByText('BAT-100')).toBeInTheDocument();
    expect(screen.getByText('Location:')).toBeInTheDocument();
    expect(screen.getByText('WH-1 - Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Lot:')).toBeInTheDocument();
    expect(screen.getByText('LOT-2026-A')).toBeInTheDocument();
    expect(screen.getByText(/^Expires /)).toBeInTheDocument();
  });

  it('omits optional serial, lot, quality, and expiry warning when they are not relevant', () => {
    render(
      <InventoryHeader
        item={item({
          serialNumber: undefined,
          lotNumber: undefined,
          qualityStatus: 'good',
          expiryDate: new Date('2026-12-01T00:00:00.000Z'),
        })}
      />
    );

    expect(screen.queryByText('Serial:')).not.toBeInTheDocument();
    expect(screen.queryByText('Lot:')).not.toBeInTheDocument();
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Expires /)).not.toBeInTheDocument();
  });

  it('renders expired inventory warnings separately from quality status', () => {
    render(
      <InventoryHeader
        item={item({
          qualityStatus: undefined,
          expiryDate: new Date('2026-05-01T00:00:00.000Z'),
        })}
      />
    );

    expect(screen.getByText(/^Expired /)).toBeInTheDocument();
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
  });

  it('keeps the inventory header out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const header = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-header.tsx'),
      'utf8'
    );

    expect(detailView).toContain("import { InventoryHeader } from './inventory-header'");
    expect(detailView).not.toContain('function InventoryHeader');
    expect(detailView).not.toContain('function MetaChipsRow');
    expect(header).toContain('export function InventoryHeader');
    expect(header).toContain('MetaChipsRow');
  });
});
