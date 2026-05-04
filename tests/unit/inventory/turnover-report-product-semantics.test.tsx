import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TurnoverReport } from '@/components/domain/inventory/reports/turnover-report';

vi.mock('@/hooks/use-org-format', () => ({
  useOrgFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

describe('inventory turnover report product semantics', () => {
  it('distinguishes period turnover from annualized turnover', () => {
    render(
      <TurnoverReport
        summary={{
          turnoverRatio: 1,
          averageDaysOnHand: 91,
          annualizedTurnover: 4,
          periodStart: new Date('2026-01-01T00:00:00Z'),
          periodEnd: new Date('2026-03-31T00:00:00Z'),
          industryBenchmark: 6,
        }}
        byProduct={[]}
      />
    );

    expect(screen.getByText('Period Turnover')).toBeInTheDocument();
    expect(
      screen.getByText('COGS / average inventory for the selected period')
    ).toBeInTheDocument();
    expect(screen.getByText('Annualized Turnover')).toBeInTheDocument();
    expect(screen.getByText('1.00x')).toBeInTheDocument();
    expect(screen.getByText('4.00x')).toBeInTheDocument();
    expect(screen.getByText('vs 6.00x benchmark')).toBeInTheDocument();
    expect(screen.queryByText('16.00x')).not.toBeInTheDocument();
  });

  it('labels product-level turnover data as products, not categories', () => {
    render(
      <TurnoverReport
        summary={{
          turnoverRatio: 4.2,
          averageDaysOnHand: 87,
          annualizedTurnover: 4.2,
          periodStart: new Date('2026-01-01T00:00:00Z'),
          periodEnd: new Date('2026-03-31T00:00:00Z'),
        }}
        byProduct={[
          {
            productId: 'product-1',
            productName: 'RZ-5120 Battery Module',
            turnoverRatio: 4.2,
            daysOnHand: 87,
            cogs: 12500,
            averageInventory: 32000,
            trend: 'up',
            trendPercentage: 12.5,
          },
        ]}
      />
    );

    expect(screen.getByText('Turnover by Product')).toBeInTheDocument();
    expect(screen.getByText('Performance breakdown by product')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByText('RZ-5120 Battery Module')).toBeInTheDocument();
    expect(screen.queryByText('Turnover by Category')).not.toBeInTheDocument();
    expect(screen.queryByText('Performance breakdown by product category')).not.toBeInTheDocument();
  });

  it('uses product empty-state copy', () => {
    render(
      <TurnoverReport
        summary={{
          turnoverRatio: 0,
          averageDaysOnHand: 0,
          annualizedTurnover: 0,
          periodStart: new Date('2026-01-01T00:00:00Z'),
          periodEnd: new Date('2026-03-31T00:00:00Z'),
        }}
        byProduct={[]}
      />
    );

    expect(screen.getByText('No product turnover data')).toBeInTheDocument();
    expect(screen.queryByText('No category data')).not.toBeInTheDocument();
  });
});
