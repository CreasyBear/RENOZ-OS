import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CampaignDetailLoadedState } from '@/components/domain/communications/campaigns/campaign-detail-loaded-state';

import type { Campaign, CampaignRecipient } from '@/lib/schemas/communications';

vi.mock('@/hooks/_shared/use-alert-dismissals', () => ({
  useAlertDismissals: () => ({
    dismiss: vi.fn(),
    isAlertDismissed: () => false,
  }),
}));

vi.mock('@/hooks/_shared/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('@/components/shared', () => ({
  MetricCard: ({ title, value }: { title: string; value: ReactNode }) => (
    <div aria-label={`Metric ${title}`}>
      <span>{title}</span>
      <span>{value}</span>
    </div>
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
    recipientCount: 1,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    failedCount: 0,
    templateType: 'newsletter',
    templateData: {},
    recipientCriteria: {},
    description: 'Internal launch',
    scheduledAt: new Date('2026-05-20T04:00:00.000Z'),
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-05-01T04:00:00.000Z'),
    updatedAt: new Date('2026-05-01T04:00:00.000Z'),
    createdBy: null,
    organizationId: 'org-1',
    ...overrides,
  } as Campaign;
}

function makeRecipient(
  overrides: Partial<CampaignRecipient> = {}
): CampaignRecipient {
  return {
    id: 'recipient-1',
    email: 'operator@example.com',
    name: 'Operator Example',
    contactId: null,
    customerId: null,
    customerName: null,
    status: 'pending',
    sentAt: null,
    openedAt: null,
    clickedAt: null,
    errorMessage: null,
    ...overrides,
  };
}

function renderLoadedState(overrides: Partial<Campaign> = {}) {
  const props = {
    campaign: makeCampaign(overrides),
    recipients: [makeRecipient()],
    recipientsLoading: false,
    isSendPending: false,
    isPausePending: false,
    isResumePending: false,
    testSendDialogOpen: false,
    isTestSendPending: false,
    onBack: vi.fn(),
    onSendCampaign: vi.fn(),
    onPauseCampaign: vi.fn(),
    onResumeCampaign: vi.fn(),
    onEditCampaign: vi.fn(),
    onViewAnalytics: vi.fn(),
    onViewEmailHistory: vi.fn(),
    onOpenTestSendDialog: vi.fn(),
    onTestSendDialogOpenChange: vi.fn(),
    onSendTestEmail: vi.fn().mockResolvedValue({ status: 'success', feedback: [] }),
  };

  render(<CampaignDetailLoadedState {...props} />);
  return props;
}

describe('CampaignDetailLoadedState', () => {
  it('renders the loaded campaign detail layout and routes primary actions', () => {
    const props = renderLoadedState();

    expect(screen.getByRole('heading', { name: 'Dealer launch' })).toBeInTheDocument();
    expect(screen.getByText('Campaign lifecycle')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign statistics')).toBeInTheDocument();
    expect(screen.getByText('Campaign Information')).toBeInTheDocument();
    expect(screen.getByText('Recipients (1)')).toBeInTheDocument();
    expect(screen.getByText('operator@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(props.onSendCampaign).toHaveBeenCalledTimes(1);
    expect(props.onEditCampaign).toHaveBeenCalledTimes(1);
  });

  it('keeps loaded campaign section layout outside the detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const loadedState = read(
      'src/components/domain/communications/campaigns/campaign-detail-loaded-state.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailLoadedState');
    expect(detailPanel).not.toContain('<CampaignDetailHeader');
    expect(detailPanel).not.toContain('<CampaignDetailLifecycleSection');
    expect(detailPanel).not.toContain('<CampaignDetailRecipientsSection');
    expect(detailPanel).not.toContain('<CampaignDetailTestSendDialog');
    expect(detailPanel).not.toContain('className={cn("space-y-6"');
    expect(loadedState).toContain('<CampaignDetailHeader');
    expect(loadedState).toContain('<CampaignDetailLifecycleSection');
    expect(loadedState).toContain('<CampaignDetailRecipientsSection');
    expect(loadedState).toContain('<CampaignDetailTestSendDialog');
  });
});
