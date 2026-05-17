import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CampaignDetailMetaSection } from '@/components/domain/communications/campaigns/campaign-detail-meta-section';

import type { Campaign } from '@/lib/schemas/communications';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    name: 'Dealer launch',
    status: 'sent',
    recipientCount: 100,
    sentCount: 100,
    openCount: 25,
    clickCount: 10,
    bounceCount: 0,
    failedCount: 0,
    templateType: 'newsletter',
    templateData: {},
    recipientCriteria: {},
    description: null,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-05-01T04:00:00.000Z'),
    updatedAt: new Date('2026-05-01T04:00:00.000Z'),
    createdBy: null,
    organizationId: 'org-1',
    ...overrides,
  } as Campaign;
}

describe('CampaignDetailMetaSection', () => {
  it('renders available campaign timing fields inside the information section', () => {
    render(
      <CampaignDetailMetaSection
        campaign={makeCampaign({
          scheduledAt: new Date('2026-05-16T04:00:00.000Z'),
          startedAt: new Date('2026-05-16T05:00:00.000Z'),
          completedAt: new Date('2026-05-16T06:00:00.000Z'),
        })}
      />
    );

    expect(screen.getByText('Campaign Information')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByLabelText('Entity details')).toBeInTheDocument();
    expect(screen.getAllByText(/ago$/).length).toBeGreaterThanOrEqual(2);
  });

  it('renders nothing when the campaign has no timing fields', () => {
    const { container } = render(
      <CampaignDetailMetaSection campaign={makeCampaign()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps campaign meta field construction outside the campaign detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const loadedState = read(
      'src/components/domain/communications/campaigns/campaign-detail-loaded-state.tsx'
    );
    const metaSection = read(
      'src/components/domain/communications/campaigns/campaign-detail-meta-section.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailLoadedState');
    expect(detailPanel).not.toContain('<CampaignDetailMetaSection');
    expect(loadedState).toContain('<CampaignDetailMetaSection campaign={campaign} />');
    expect(detailPanel).not.toContain('campaignMetaFields');
    expect(detailPanel).not.toContain('DetailGrid fields');
    expect(detailPanel).not.toContain('formatDistanceToNow');
    expect(metaSection).toContain('Campaign Information');
    expect(metaSection).toContain('formatDistanceToNow');
  });
});
