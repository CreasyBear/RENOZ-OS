import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CampaignDetailSkeleton } from '@/components/domain/communications/campaigns/campaign-detail-skeleton';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('CampaignDetailSkeleton', () => {
  it('renders an accessible campaign detail loading state', () => {
    render(<CampaignDetailSkeleton />);

    const loadingRegion = screen.getByLabelText('Loading campaign details');
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Recipient')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('keeps campaign detail skeleton markup outside the detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const skeleton = read(
      'src/components/domain/communications/campaigns/campaign-detail-skeleton.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailSkeleton />');
    expect(detailPanel).not.toContain('aria-label="Loading campaign details"');
    expect(detailPanel).not.toContain('Array.from({ length: 5 })');
    expect(detailPanel).not.toContain('TableHeader');
    expect(detailPanel).not.toContain('Skeleton className');
    expect(skeleton).toContain('aria-label="Loading campaign details"');
    expect(skeleton).toContain('Array.from({ length: 5 })');
  });
});
