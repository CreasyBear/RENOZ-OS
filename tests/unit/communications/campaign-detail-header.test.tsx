import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CampaignDetailHeader } from '@/components/domain/communications/campaigns/campaign-detail-header';

import type { EntityHeaderProps } from '@/components/shared/detail-view';
import type { Campaign } from '@/lib/schemas/communications';

vi.mock('@/components/shared/detail-view', () => ({
  EntityHeader: ({
    name,
    subtitle,
    status,
    typeBadge,
    primaryAction,
    secondaryActions = [],
    onEdit,
  }: EntityHeaderProps) => (
    <section aria-label="Campaign detail header">
      <h1>{name}</h1>
      <div>{subtitle}</div>
      <div>{status?.value}</div>
      <div>{typeBadge}</div>
      {onEdit && <button onClick={onEdit}>Edit</button>}
      {primaryAction && (
        <button onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
          {primaryAction.label}
        </button>
      )}
      {secondaryActions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      ))}
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
    status: 'draft',
    recipientCount: 12,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    failedCount: 0,
    templateType: 'newsletter',
    templateData: {},
    recipientCriteria: {},
    description: 'Internal launch',
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

function renderHeader(overrides: Partial<Campaign> = {}) {
  const props = {
    campaign: makeCampaign(overrides),
    isSendPending: false,
    isPausePending: false,
    isResumePending: false,
    onBack: vi.fn(),
    onSendCampaign: vi.fn(),
    onPauseCampaign: vi.fn(),
    onResumeCampaign: vi.fn(),
    onEditCampaign: vi.fn(),
    onViewAnalytics: vi.fn(),
    onViewEmailHistory: vi.fn(),
    onOpenTestSendDialog: vi.fn(),
  };

  render(<CampaignDetailHeader {...props} />);
  return props;
}

describe('CampaignDetailHeader', () => {
  it('renders draft campaign identity and routes editable send/test actions', () => {
    const props = renderHeader();

    expect(screen.getByRole('heading', { name: 'Dealer launch' })).toBeInTheDocument();
    expect(screen.getByText('Newsletter template · Internal launch')).toBeInTheDocument();
    expect(screen.getByText('newsletter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Test Email' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to campaigns' }));

    expect(props.onSendCampaign).toHaveBeenCalledTimes(1);
    expect(props.onEditCampaign).toHaveBeenCalledTimes(1);
    expect(props.onOpenTestSendDialog).toHaveBeenCalledTimes(1);
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('disables draft send when no recipients are available', () => {
    renderHeader({ recipientCount: 0 });

    expect(screen.getByRole('button', { name: 'Send Now' })).toBeDisabled();
  });

  it('routes paused campaigns through resume while keeping test send available', () => {
    const props = renderHeader({ status: 'paused' });

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Test Email' }));

    expect(props.onResumeCampaign).toHaveBeenCalledTimes(1);
    expect(props.onOpenTestSendDialog).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('routes sending campaigns through the pending-aware pause action', () => {
    const props = {
      ...renderHeader({ status: 'sending' }),
    };

    expect(screen.getByRole('button', { name: 'Pause' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(props.onPauseCampaign).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Send Test Email' })).not.toBeInTheDocument();
  });

  it('routes sent campaigns through analytics and email history actions', () => {
    const props = renderHeader({ status: 'sent' });

    fireEvent.click(screen.getByRole('button', { name: 'View Analytics' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Email History' }));

    expect(props.onViewAnalytics).toHaveBeenCalledTimes(1);
    expect(props.onViewEmailHistory).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send Test Email' })).not.toBeInTheDocument();
  });

  it('keeps campaign header action assembly outside the detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const loadedState = read(
      'src/components/domain/communications/campaigns/campaign-detail-loaded-state.tsx'
    );
    const header = read(
      'src/components/domain/communications/campaigns/campaign-detail-header.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailLoadedState');
    expect(detailPanel).not.toContain('<CampaignDetailHeader');
    expect(loadedState).toContain('<CampaignDetailHeader');
    expect(detailPanel).not.toContain('secondaryActions=');
    expect(detailPanel).not.toContain('getCampaignStatusVariant');
    expect(detailPanel).not.toContain('Send Test Email');
    expect(detailPanel).not.toContain('View Email History');
    expect(header).toContain('getCampaignStatusVariant');
    expect(header).toContain('Send Test Email');
    expect(header).toContain('View Email History');
  });
});
