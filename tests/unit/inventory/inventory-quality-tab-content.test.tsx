import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QualityTabContent } from '@/components/domain/inventory/views/inventory-quality-tab-content';
import type { QualityRecord } from '@/components/domain/inventory/item-tabs';

function qualityRecord(overrides: Partial<QualityRecord>): QualityRecord {
  return {
    id: overrides.id ?? 'quality-1',
    inspectionDate: overrides.inspectionDate ?? new Date('2026-01-01T00:00:00.000Z'),
    inspectorName: overrides.inspectorName ?? 'Joel',
    result: overrides.result ?? 'pass',
    notes: overrides.notes,
    defects: overrides.defects,
  };
}

describe('QualityTabContent', () => {
  it('renders an honest empty state when no inspection history exists', () => {
    render(<QualityTabContent qualityRecords={[]} />);

    expect(screen.getByText('No quality inspections recorded')).toBeInTheDocument();
  });

  it('renders loading placeholders while quality history is loading', () => {
    const { container } = render(<QualityTabContent isLoading />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8);
  });

  it('renders unavailable copy and retry action for cold-load failures', () => {
    const onRetry = vi.fn();

    render(
      <QualityTabContent
        isError
        errorMessage="Quality read failed for this inventory item."
        onRetry={onRetry}
      />
    );

    expect(
      screen.getByText('Quality inspection history is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('Quality read failed for this inventory item.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Quality History' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders stale quality history with degraded warning when refresh fails after data loaded', () => {
    render(
      <QualityTabContent
        isError
        errorMessage="Using cached quality records."
        qualityRecords={[
          qualityRecord({
            inspectionDate: new Date('2026-02-03T00:00:00.000Z'),
            inspectorName: 'Mina',
            result: 'conditional',
            notes: 'Passed after cell voltage verification.',
            defects: ['loose-terminal', 'case-scuff'],
          }),
        ]}
      />
    );

    expect(
      screen.getByText('Showing the most recent quality history while refresh is unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('Using cached quality records.')).toBeInTheDocument();
    expect(screen.getByText('Feb 3, 2026')).toBeInTheDocument();
    expect(screen.getByText('Inspected by Mina')).toBeInTheDocument();
    expect(screen.getByText('Passed after cell voltage verification.')).toBeInTheDocument();
    expect(screen.getByText('loose-terminal')).toBeInTheDocument();
    expect(screen.getByText('case-scuff')).toBeInTheDocument();
    expect(screen.getByText('Conditional')).toBeInTheDocument();
  });

  it('keeps the quality tab out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const qualityTab = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-quality-tab-content.tsx'),
      'utf8'
    );

    expect(detailView).toContain(
      "import { QualityTabContent } from './inventory-quality-tab-content'"
    );
    expect(detailView).not.toContain('function QualityTabContent');
    expect(qualityTab).toContain('export function QualityTabContent');
    expect(qualityTab).toContain('Quality inspection history is temporarily unavailable.');
  });
});
