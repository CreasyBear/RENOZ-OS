import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryDashboardMetrics } from '@/components/domain/inventory/inventory-dashboard-metrics';

vi.mock('@/components/shared/metric-card', () => ({
  MetricCard: ({
    title,
    value,
    subtitle,
    delta,
    positive,
    alert,
    isLoading,
  }: {
    title: string;
    value: ReactNode;
    subtitle?: string;
    delta?: number;
    positive?: boolean;
    alert?: boolean;
    isLoading?: boolean;
  }) => (
    <section
      aria-label={title}
      data-delta={delta ?? ''}
      data-positive={positive === undefined ? '' : String(positive)}
      data-alert={String(!!alert)}
      data-loading={String(!!isLoading)}
    >
      <span>{title}</span>
      <span>{value}</span>
      {subtitle ? <span>{subtitle}</span> : null}
    </section>
  ),
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>${amount}</span>,
}));

function renderMetrics(
  props: Partial<ComponentProps<typeof InventoryDashboardMetrics>> = {}
) {
  render(
    <InventoryDashboardMetrics
      totals={{ totalValue: 125000, totalUnits: 42, totalSkus: 7 }}
      comparison={{ totalValueChange: 12, totalUnitsChange: -3, alertsChange: -20 }}
      metrics={{ lowStockCount: 2, outOfStockCount: 1 }}
      locationsCount={4}
      isLoading={false}
      showDashboardUnavailable={false}
      stockSemantics={{
        currentAlerts: 'allocatable_available',
        previousPeriodComparison: 'allocatable_available',
      }}
      comparisonUnits={{ alertsChange: 'percentage' }}
      {...props}
    />
  );
}

describe('InventoryDashboardMetrics', () => {
  it('renders stock value, physical units, allocatable alerts, and location count', () => {
    renderMetrics();

    expect(screen.getByRole('region', { name: 'Total Value' })).toHaveTextContent('$125000');
    expect(screen.getByRole('region', { name: 'Total Value' })).toHaveTextContent('7 SKUs');
    expect(screen.getByRole('region', { name: 'Total Value' })).toHaveAttribute(
      'data-delta',
      '12'
    );
    expect(screen.getByRole('region', { name: 'On-Hand Units' })).toHaveTextContent('42');
    expect(screen.getByRole('region', { name: 'On-Hand Units' })).toHaveTextContent(
      'Physical stock'
    );
    expect(screen.getByRole('region', { name: 'On-Hand Units' })).toHaveAttribute(
      'data-positive',
      'false'
    );
    expect(screen.getByRole('region', { name: 'Allocatable Alerts' })).toHaveTextContent('3');
    expect(screen.getByRole('region', { name: 'Allocatable Alerts' })).toHaveTextContent(
      '2 low, 1 out available'
    );
    expect(screen.getByRole('region', { name: 'Locations' })).toHaveTextContent('4');
    expect(screen.getByRole('region', { name: 'Locations' })).toHaveTextContent(
      'Active warehouses'
    );
  });

  it('uses honest unavailable copy when dashboard metrics are unavailable', () => {
    renderMetrics({ showDashboardUnavailable: true });

    expect(screen.getByRole('region', { name: 'Allocatable Alerts' })).toHaveTextContent('--');
    expect(screen.getByRole('region', { name: 'Allocatable Alerts' })).toHaveTextContent(
      'Alert metrics unavailable'
    );
    expect(screen.getByRole('region', { name: 'Allocatable Alerts' })).toHaveAttribute(
      'data-alert',
      'false'
    );
  });

  it('only renders alert deltas when alert comparison units and semantics are comparable', () => {
    renderMetrics({
      comparison: { alertsChange: 4 },
      comparisonUnits: { alertsChange: 'count' },
    });

    expect(screen.getByRole('region', { name: 'Allocatable Alerts' })).toHaveAttribute(
      'data-delta',
      ''
    );
  });

  it('keeps the metrics strip out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const metrics = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-metrics.tsx'),
      'utf8'
    );

    expect(dashboard).toContain(
      "import { InventoryDashboardMetrics } from './inventory-dashboard-metrics'"
    );
    expect(dashboard).toContain('<InventoryDashboardMetrics');
    expect(dashboard).not.toContain('alertsChangeCanRenderAsTrend');
    expect(dashboard).not.toContain('MetricCard');
    expect(metrics).toContain('export function InventoryDashboardMetrics');
    expect(metrics).toContain('Allocatable Alerts');
  });
});
