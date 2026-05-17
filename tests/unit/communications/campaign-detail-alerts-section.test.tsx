import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignDetailAlertsSection } from '@/components/domain/communications/campaigns/campaign-detail-alerts-section';

import type { Campaign } from '@/lib/schemas/communications';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    name: 'Dealer launch',
    status: 'draft',
    recipientCount: 100,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
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

describe('CampaignDetailAlertsSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders generated campaign alerts with optional actions', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const recipients = document.createElement('div');
    recipients.id = 'recipients';
    document.body.appendChild(recipients);

    render(
      <CampaignDetailAlertsSection
        campaign={makeCampaign({
          sentCount: 100,
          bounceCount: 12,
          openCount: 100,
        })}
      />
    );

    expect(screen.getByLabelText('Campaign alerts')).toBeInTheDocument();
    expect(screen.getByText('High bounce rate detected')).toBeInTheDocument();
    expect(
      screen.getByText('12 emails bounced (12%). Review recipient list and email content.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View recipients' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('dismisses visible alerts and renders nothing when no campaign alerts apply', async () => {
    const { rerender } = render(
      <CampaignDetailAlertsSection
        campaign={makeCampaign({
          sentCount: 100,
          bounceCount: 12,
          openCount: 100,
        })}
      />
    );

    fireEvent.click(screen.getByLabelText('Dismiss alert'));

    await waitFor(() => {
      expect(screen.queryByText('High bounce rate detected')).not.toBeInTheDocument();
    });

    rerender(<CampaignDetailAlertsSection campaign={makeCampaign()} />);

    expect(screen.queryByLabelText('Campaign alerts')).not.toBeInTheDocument();
  });

  it('keeps alert generation and dismissal outside the campaign detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const alertsSection = read(
      'src/components/domain/communications/campaigns/campaign-detail-alerts-section.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailAlertsSection campaign={campaign} />');
    expect(detailPanel).not.toContain('generateCampaignAlerts');
    expect(detailPanel).not.toContain('useAlertDismissals');
    expect(detailPanel).not.toContain('Dismiss alert');
    expect(alertsSection).toContain('generateCampaignAlerts');
    expect(alertsSection).toContain('useAlertDismissals');
    expect(alertsSection).toContain('Dismiss alert');
  });
});
