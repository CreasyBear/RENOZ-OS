import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCampaignDetailActions } from '@/hooks/communications/use-campaign-detail-actions';

import type { Campaign } from '@/lib/schemas/communications';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  navigate: vi.fn(),
  sendCampaign: vi.fn(),
  pauseCampaign: vi.fn(),
  resumeCampaign: vi.fn(),
  testSendCampaign: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/hooks/_shared/use-confirmation', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
  confirmations: {
    sendCampaign: (campaignName: string, recipientCount: number) => ({
      title: 'Send Campaign',
      description: `Send "${campaignName}" to ${recipientCount.toLocaleString()} recipients? This will start sending emails immediately.`,
      confirmLabel: 'Send Now',
      variant: 'default',
    }),
    pauseCampaign: (campaignName: string) => ({
      title: 'Pause Campaign',
      description: `Pause sending for "${campaignName}"? You can resume it later.`,
      confirmLabel: 'Pause',
      variant: 'default',
    }),
  },
}));

vi.mock('@/hooks/communications/use-campaigns', () => ({
  useSendCampaign: () => ({
    mutateAsync: mocks.sendCampaign,
    isPending: false,
  }),
  usePauseCampaign: () => ({
    mutateAsync: mocks.pauseCampaign,
    isPending: false,
  }),
  useResumeCampaign: () => ({
    mutateAsync: mocks.resumeCampaign,
    isPending: false,
  }),
  useTestSendCampaign: () => ({
    mutateAsync: mocks.testSendCampaign,
    isPending: false,
  }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    warning: mocks.toastWarning,
  },
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
    description: null,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    organizationId: 'org-1',
    ...overrides,
  } as Campaign;
}

describe('useCampaignDetailActions', () => {
  beforeEach(() => {
    mocks.confirm.mockReset();
    mocks.navigate.mockReset();
    mocks.sendCampaign.mockReset();
    mocks.pauseCampaign.mockReset();
    mocks.resumeCampaign.mockReset();
    mocks.testSendCampaign.mockReset();
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastWarning.mockReset();

    mocks.confirm.mockResolvedValue({ confirmed: true });
    mocks.sendCampaign.mockResolvedValue(undefined);
    mocks.pauseCampaign.mockResolvedValue(undefined);
    mocks.resumeCampaign.mockResolvedValue(undefined);
    mocks.testSendCampaign.mockResolvedValue(undefined);
  });

  it('sends confirmed campaigns through the communications mutation contract', async () => {
    const { result } = renderHook(() =>
      useCampaignDetailActions({
        campaign: makeCampaign(),
        campaignId: 'campaign-1',
      })
    );

    await act(async () => {
      await result.current.actions.onSendCampaign();
    });

    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Send Campaign',
        confirmLabel: 'Send Now',
      })
    );
    expect(mocks.sendCampaign).toHaveBeenCalledWith({ id: 'campaign-1' });
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Campaign sending started',
      expect.objectContaining({
        description:
          'Your campaign "Dealer launch" is now being sent to 12 recipients.',
      })
    );
  });

  it('owns campaign detail navigation and test-send dialog state', async () => {
    const { result } = renderHook(() =>
      useCampaignDetailActions({
        campaign: makeCampaign(),
        campaignId: 'campaign-1',
      })
    );

    act(() => {
      result.current.actions.onEditCampaign();
      result.current.actions.onViewAnalytics();
      result.current.actions.onViewEmailHistory();
    });

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/communications/campaigns/$campaignId/edit',
      params: { campaignId: 'campaign-1' },
    });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/communications/campaigns/analytics',
    });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/communications/inbox',
      search: { campaignId: 'campaign-1' },
    });

    act(() => {
      result.current.actions.onOpenTestSendDialog();
    });

    expect(result.current.state.testSendDialogOpen).toBe(true);

    act(() => {
      result.current.actions.onTestSendDialogOpenChange(false);
    });

    expect(result.current.state.testSendDialogOpen).toBe(false);

    await act(async () => {
      await result.current.actions.onSendTestEmail('operator@example.com');
    });

    expect(mocks.testSendCampaign).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      testEmail: 'operator@example.com',
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Test email sent', {
      description: 'Sent to operator@example.com',
    });
  });

  it('blocks action attempts when the campaign detail record is unavailable', async () => {
    const { result } = renderHook(() =>
      useCampaignDetailActions({
        campaign: null,
        campaignId: 'campaign-1',
      })
    );

    await act(async () => {
      await result.current.actions.onSendCampaign();
    });

    await expect(
      result.current.actions.onSendTestEmail('operator@example.com')
    ).resolves.toEqual({ status: 'blocked', feedback: [] });
    expect(mocks.sendCampaign).not.toHaveBeenCalled();
    expect(mocks.testSendCampaign).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('keeps the panel on a hook-owned action orchestration boundary', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const detailHook = read(
      'src/hooks/communications/use-campaign-detail-actions.ts'
    );
    const detailActions = read(
      'src/lib/communications/campaign-detail-actions.ts'
    );

    expect(detailPanel).toContain('useCampaignDetailActions({');
    expect(detailPanel).not.toContain('useSendCampaign');
    expect(detailPanel).not.toContain('useConfirmation');
    expect(detailPanel).not.toContain('toast.');
    expect(detailPanel).not.toContain('sendCampaignFromDetail({');
    expect(detailHook).toContain('useSendCampaign');
    expect(detailHook).toContain('useConfirmation');
    expect(detailHook).toContain('toast.');
    expect(detailHook).toContain('sendCampaignFromDetail({');
    expect(detailActions).toContain(
      'formatCommunicationCampaignMutationError(error, "send")'
    );
  });
});
