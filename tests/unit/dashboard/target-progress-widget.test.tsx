import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TargetProgressWidget } from '@/components/domain/dashboard/target-progress';
import type { TargetProgressResponse } from '@/lib/schemas/reports/targets';

describe('TargetProgressWidget', () => {
  it('renders unavailable target metrics without displaying fake zero progress', () => {
    const progress: TargetProgressResponse = {
      targets: [
        {
          targetId: '11111111-1111-4111-8111-111111111111',
          targetName: 'Revenue target',
          metric: 'revenue',
          period: 'monthly',
          targetValue: 100000,
          currentValue: 0,
          percentage: 0,
          status: 'unavailable',
          daysRemaining: 12,
          startDate: new Date('2026-05-01T00:00:00Z'),
          endDate: new Date('2026-05-31T00:00:00Z'),
        },
      ],
      overall: {
        achieved: 0,
        total: 1,
        percentage: 0,
        unavailable: 1,
      },
    };

    render(<TargetProgressWidget progress={progress} />);

    expect(screen.getByText('Revenue target')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Progress temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText('0 of 1 achieved (0%) - 1 unavailable')).toBeInTheDocument();
    expect(screen.queryByText('$0 / $100,000')).not.toBeInTheDocument();
  });
});
