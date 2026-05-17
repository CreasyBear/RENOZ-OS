import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CampaignDetailLifecycleSection } from '@/components/domain/communications/campaigns/campaign-detail-lifecycle-section';

import type { Campaign } from '@/lib/schemas/communications';

vi.mock('@/hooks/_shared/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    name: 'Dealer launch',
    status: 'scheduled',
    recipientCount: 10,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    failedCount: 0,
    templateType: 'newsletter',
    templateData: {},
    recipientCriteria: {},
    description: null,
    scheduledAt: new Date('2026-06-01T04:00:00.000Z'),
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-05-01T04:00:00.000Z'),
    updatedAt: new Date('2026-05-01T04:00:00.000Z'),
    createdBy: null,
    organizationId: 'org-1',
    ...overrides,
  } as Campaign;
}

describe('CampaignDetailLifecycleSection', () => {
  it('renders scheduled campaign lifecycle stage context', () => {
    render(<CampaignDetailLifecycleSection campaign={makeCampaign()} />);

    expect(
      screen.getByLabelText('Campaign progress: Scheduled stage')
    ).toBeInTheDocument();
    expect(screen.getByText('Campaign lifecycle')).toBeInTheDocument();
    expect(screen.getByText(/Scheduled for/)).toBeInTheDocument();
    expect(screen.getByLabelText('Draft - completed')).toBeInTheDocument();
    expect(screen.getByLabelText('Scheduled - current')).toBeInTheDocument();
    expect(screen.getByLabelText('Sending - pending')).toBeInTheDocument();
  });

  it('renders sending progress as a percent of sent recipients', () => {
    render(
      <CampaignDetailLifecycleSection
        campaign={makeCampaign({
          status: 'sending',
          recipientCount: 10,
          sentCount: 4,
          scheduledAt: null,
        })}
      />
    );

    expect(
      screen.getByLabelText('Campaign progress: Sending stage')
    ).toBeInTheDocument();
    expect(screen.getByText('Sending 4 of 10 emails...')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByLabelText('Sending progress: 40%')).toBeInTheDocument();
  });

  it('does not render lifecycle progress for terminal failure states', () => {
    const { container } = render(
      <CampaignDetailLifecycleSection
        campaign={makeCampaign({ status: 'cancelled', scheduledAt: null })}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps lifecycle rendering outside the campaign detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const lifecycleSection = read(
      'src/components/domain/communications/campaigns/campaign-detail-lifecycle-section.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailLifecycleSection campaign={campaign} />');
    expect(detailPanel).not.toContain('calculateSendProgress(campaign.sentCount');
    expect(detailPanel).not.toContain('CAMPAIGN_STAGES.map');
    expect(lifecycleSection).toContain('calculateSendProgress(campaign.sentCount');
    expect(lifecycleSection).toContain('CAMPAIGN_STAGES.map');
  });
});
