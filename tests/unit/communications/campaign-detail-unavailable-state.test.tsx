import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CampaignDetailUnavailableState } from '@/components/domain/communications/campaigns/campaign-detail-unavailable-state';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('CampaignDetailUnavailableState', () => {
  it('renders operator-safe campaign detail unavailable copy', () => {
    const onBack = vi.fn();

    render(
      <CampaignDetailUnavailableState
        error={new Error('postgres campaign detail timeout')}
        onBack={onBack}
      />
    );

    expect(screen.getByText('Campaign not found')).toBeInTheDocument();
    expect(
      screen.getByText('Campaign details are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres campaign detail timeout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to campaigns' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps campaign detail unavailable markup outside the detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const unavailableState = read(
      'src/components/domain/communications/campaigns/campaign-detail-unavailable-state.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailUnavailableState ');
    expect(detailPanel).not.toContain('formatCommunicationReadError(');
    expect(detailPanel).not.toContain('COMMUNICATION_READ_MESSAGES.campaignDetails');
    expect(detailPanel).not.toContain('EmptyStateContainer');
    expect(detailPanel).not.toContain('title="Campaign not found"');
    expect(unavailableState).toContain('formatCommunicationReadError(');
    expect(unavailableState).toContain('COMMUNICATION_READ_MESSAGES.campaignDetails');
  });
});
