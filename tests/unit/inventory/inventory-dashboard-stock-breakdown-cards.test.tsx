import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryDashboardStockBreakdownCards } from '@/components/domain/inventory/inventory-dashboard-stock-breakdown-cards';
import type { CategoryStock, LocationStock } from '@/hooks/inventory';

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
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>${amount}</span>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => (
    <div data-testid="location-progress" data-value={String(value)} />
  ),
}));

function category(overrides: Partial<CategoryStock>): CategoryStock {
  return {
    categoryId: overrides.categoryId ?? null,
    categoryName: overrides.categoryName ?? 'Batteries',
    unitCount: overrides.unitCount ?? 24,
    totalValue: overrides.totalValue ?? 12500,
  };
}

function location(overrides: Partial<LocationStock>): LocationStock {
  return {
    locationId: overrides.locationId ?? 'location-1',
    locationName: overrides.locationName ?? 'Main Warehouse',
    locationType: overrides.locationType ?? 'warehouse',
    unitCount: overrides.unitCount ?? 14,
    totalValue: overrides.totalValue ?? 8000,
    percentage: overrides.percentage ?? 60,
  };
}

function renderBreakdown(
  props: Partial<ComponentProps<typeof InventoryDashboardStockBreakdownCards>> = {}
) {
  render(
    <InventoryDashboardStockBreakdownCards
      categories={[category({})]}
      locations={[location({})]}
      isLoading={false}
      showDegraded={false}
      readErrorMessage="WMS read failed"
      {...props}
    />
  );
}

describe('InventoryDashboardStockBreakdownCards', () => {
  it('renders category value and location occupancy summaries', () => {
    renderBreakdown({
      categories: [
        category({
          categoryId: 'category-1',
          categoryName: 'Battery Modules',
          unitCount: 24,
          totalValue: 12500,
        }),
        category({
          categoryId: 'category-2',
          categoryName: 'Inverters',
          unitCount: 6,
          totalValue: 4200,
        }),
      ],
      locations: [
        location({
          locationId: 'location-1',
          locationName: 'Main Warehouse',
          percentage: 60,
        }),
        location({
          locationId: 'location-2',
          locationName: 'Service Van',
          percentage: 20,
        }),
      ],
    });

    expect(screen.getByText('On-Hand by Category')).toBeInTheDocument();
    expect(screen.getByText('Battery Modules')).toBeInTheDocument();
    expect(screen.getByText('$12500')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Inverters')).toBeInTheDocument();
    expect(screen.getByText('On-Hand by Location')).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Service Van')).toBeInTheDocument();
    expect(screen.getAllByTestId('location-progress')[0]).toHaveAttribute('data-value', '60');
    expect(screen.getAllByTestId('location-progress')[1]).toHaveAttribute('data-value', '20');
  });

  it('keeps category and location stale warnings visible when WMS data is degraded', () => {
    renderBreakdown({
      showDegraded: true,
      readErrorMessage: 'Using cached WMS data',
    });

    expect(screen.getByText('Category breakdown may be stale.')).toBeInTheDocument();
    expect(screen.getByText('Location breakdown may be stale.')).toBeInTheDocument();
    expect(screen.getAllByText('Using cached WMS data')).toHaveLength(2);
  });

  it('renders honest empty states for missing category and location configuration', () => {
    renderBreakdown({
      categories: [],
      locations: [],
    });

    expect(screen.getByText('No categories found')).toBeInTheDocument();
    expect(
      screen.getByText('Inventory items will be grouped by category once products are assigned categories.')
    ).toBeInTheDocument();
    expect(screen.getByText('No locations configured')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a location' })).toHaveAttribute(
      'href',
      '/inventory/locations'
    );
  });

  it('renders stable skeletons while the WMS dashboard is loading', () => {
    const { container } = render(
      <InventoryDashboardStockBreakdownCards
        categories={[]}
        locations={[]}
        isLoading
        showDegraded={false}
        readErrorMessage="Loading"
      />
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(24);
  });

  it('keeps category and location breakdown rendering out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const stockBreakdown = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-stock-breakdown-cards.tsx'),
      'utf8'
    );

    expect(dashboard).toContain('InventoryDashboardStockBreakdownCards');
    expect(dashboard).not.toContain('function CategoryList');
    expect(dashboard).not.toContain('function LocationList');
    expect(dashboard).not.toContain('function CategorySkeleton');
    expect(dashboard).not.toContain('function LocationSkeleton');
    expect(dashboard).not.toContain('On-Hand by Category');
    expect(dashboard).not.toContain('useOrgFormat');
    expect(stockBreakdown).toContain('export function InventoryDashboardStockBreakdownCards');
    expect(stockBreakdown).toContain('function CategoryList');
    expect(stockBreakdown).toContain('function LocationList');
  });
});
