import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CampaignDetailMetricsSection } from '@/components/domain/communications/campaigns/campaign-detail-metrics-section';

import type { Campaign } from '@/lib/schemas/communications';

vi.mock('@/components/shared', () => ({
  MetricCard: ({
    title,
    value,
    iconClassName,
  }: {
    title: string;
    value: ReactNode;
    iconClassName?: string;
  }) => (
    <section aria-label={`metric-${title}`} data-icon-class={iconClassName}>
      <h3>{title}</h3>
      <div>{value}</div>
    </section>
  ),
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    name: 'Dealer launch',
    status: 'sent',
    recipientCount: 1000,
    sentCount: 400,
    openCount: 40,
    clickCount: 20,
    bounceCount: 0,
    failedCount: 0,
    templateType: 'newsletter',
    templateData: {},
    recipientCriteria: {},
    description: null,
    scheduledAt: null,
    startedAt: null,
    completedAt: new Date('2026-06-01T04:00:00.000Z'),
    createdAt: new Date('2026-05-01T04:00:00.000Z'),
    updatedAt: new Date('2026-05-01T04:00:00.000Z'),
    createdBy: null,
    organizationId: 'org-1',
    ...overrides,
  } as Campaign;
}

describe('CampaignDetailMetricsSection', () => {
  it('renders campaign metric values with percentage context', () => {
    render(<CampaignDetailMetricsSection campaign={makeCampaign()} />);

    expect(screen.getByLabelText('Campaign statistics')).toBeInTheDocument();
    expect(within(screen.getByLabelText('metric-Recipients')).getByText('1,000')).toBeInTheDocument();

    const sent = within(screen.getByLabelText('metric-Sent'));
    expect(sent.getByText('400')).toBeInTheDocument();
    expect(sent.getByText('(40%)')).toBeInTheDocument();

    const opened = within(screen.getByLabelText('metric-Opened'));
    expect(opened.getByText('40')).toBeInTheDocument();
    expect(opened.getByText('(10%)')).toBeInTheDocument();
    expect(screen.getByLabelText('metric-Opened')).toHaveAttribute(
      'data-icon-class',
      'text-green-600 dark:text-green-400'
    );

    const clicked = within(screen.getByLabelText('metric-Clicked'));
    expect(clicked.getByText('20')).toBeInTheDocument();
    expect(clicked.getByText('(5%)')).toBeInTheDocument();
  });

  it('only renders delivery issue metrics when issues exist', () => {
    const { rerender } = render(
      <CampaignDetailMetricsSection campaign={makeCampaign()} />
    );

    expect(screen.queryByLabelText('Campaign delivery issues')).not.toBeInTheDocument();

    rerender(
      <CampaignDetailMetricsSection
        campaign={makeCampaign({ bounceCount: 16, failedCount: 10 })}
      />
    );

    expect(screen.getByLabelText('Campaign delivery issues')).toBeInTheDocument();

    const bounced = within(screen.getByLabelText('metric-Bounced'));
    expect(bounced.getByText('16')).toBeInTheDocument();
    expect(bounced.getByText('(4%)')).toBeInTheDocument();
    expect(screen.getByLabelText('metric-Bounced')).toHaveAttribute(
      'data-icon-class',
      'text-amber-600 dark:text-amber-400'
    );

    const failed = within(screen.getByLabelText('metric-Failed'));
    expect(failed.getByText('10')).toBeInTheDocument();
    expect(failed.getByText('(1%)')).toBeInTheDocument();
    expect(screen.getByLabelText('metric-Failed')).toHaveAttribute(
      'data-icon-class',
      'text-red-600 dark:text-red-400'
    );
  });

  it('keeps metric rendering outside the campaign detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const metricsSection = read(
      'src/components/domain/communications/campaigns/campaign-detail-metrics-section.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailMetricsSection campaign={campaign} />');
    expect(detailPanel).not.toContain('formatCampaignStatValue');
    expect(detailPanel).not.toContain('CAMPAIGN_STAT_STYLES');
    expect(detailPanel).not.toContain('MetricCard');
    expect(metricsSection).toContain('formatCampaignStatValue');
    expect(metricsSection).toContain('CAMPAIGN_STAT_STYLES');
    expect(metricsSection).toContain('MetricCard');
  });
});
