import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WarrantyCoverageSummary } from '@/components/domain/warranty/views/warranty-coverage-summary';
import { calculateWarrantyCoverageProgress } from '@/components/domain/warranty/views/warranty-coverage-summary-utils';
import { formatDateAustralian } from '@/lib/warranty';
import type { ComponentProps } from 'react';

type WarrantyCoverageSummaryProps = ComponentProps<typeof WarrantyCoverageSummary>;

function createWarranty(
  overrides: Partial<WarrantyCoverageSummaryProps['warranty']> = {}
): WarrantyCoverageSummaryProps['warranty'] {
  return {
    registrationDate: '2026-01-01T00:00:00.000Z',
    expiryDate: '2026-01-11T00:00:00.000Z',
    items: [{ id: 'item-1' }, { id: 'item-2' }] as WarrantyCoverageSummaryProps['warranty']['items'],
    ...overrides,
  };
}

describe('calculateWarrantyCoverageProgress', () => {
  it('rounds and clamps warranty coverage progress', () => {
    expect(
      calculateWarrantyCoverageProgress({
        registrationDate: '2026-01-01T00:00:00.000Z',
        expiryDate: '2026-01-11T00:00:00.000Z',
        now: new Date('2026-01-06T00:00:00.000Z').getTime(),
      })
    ).toBe(50);
    expect(
      calculateWarrantyCoverageProgress({
        registrationDate: '2026-01-01T00:00:00.000Z',
        expiryDate: '2026-01-11T00:00:00.000Z',
        now: new Date('2025-12-31T00:00:00.000Z').getTime(),
      })
    ).toBe(0);
    expect(
      calculateWarrantyCoverageProgress({
        registrationDate: '2026-01-01T00:00:00.000Z',
        expiryDate: '2026-01-11T00:00:00.000Z',
        now: new Date('2026-01-12T00:00:00.000Z').getTime(),
      })
    ).toBe(100);
  });

  it('returns zero when warranty dates cannot form a valid range', () => {
    expect(
      calculateWarrantyCoverageProgress({
        registrationDate: 'not-a-date',
        expiryDate: '2026-01-11T00:00:00.000Z',
        now: new Date('2026-01-06T00:00:00.000Z').getTime(),
      })
    ).toBe(0);
    expect(
      calculateWarrantyCoverageProgress({
        registrationDate: '2026-01-11T00:00:00.000Z',
        expiryDate: '2026-01-01T00:00:00.000Z',
        now: new Date('2026-01-06T00:00:00.000Z').getTime(),
      })
    ).toBe(0);
  });
});

describe('WarrantyCoverageSummary', () => {
  it('renders coverage metrics and timeline from the warranty read model', () => {
    render(
      <WarrantyCoverageSummary
        warranty={createWarranty()}
        daysUntilExpiry={5}
        claimSummary={{ totalClaims: 3, pendingClaims: 1 }}
        claimSummaryState="ready"
        isClaimsLoading={false}
        now={new Date('2026-01-06T00:00:00.000Z').getTime()}
      />
    );

    expect(screen.getByText('Days Left')).toBeInTheDocument();
    expect(screen.getByText('5d')).toBeInTheDocument();
    expect(screen.getByText('Claims')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Covered Items')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Coverage timeline')).toBeInTheDocument();
    expect(
      screen.getByText(
        `Registered ${formatDateAustralian('2026-01-01T00:00:00.000Z', 'numeric')} · Expires ${formatDateAustralian('2026-01-11T00:00:00.000Z', 'numeric')}`
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Coverage progress: 50%' })).toBeInTheDocument();
    expect(screen.getByText('50% used')).toBeInTheDocument();
  });

  it('renders expired and unavailable claim summary states honestly', () => {
    render(
      <WarrantyCoverageSummary
        warranty={createWarranty({ items: [] as WarrantyCoverageSummaryProps['warranty']['items'] })}
        daysUntilExpiry={0}
        claimSummary={undefined}
        claimSummaryState="unavailable"
        isClaimsLoading={false}
        now={new Date('2026-01-12T00:00:00.000Z').getTime()}
      />
    );

    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Covered Items')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Coverage progress: 100%' })).toBeInTheDocument();
  });
});
