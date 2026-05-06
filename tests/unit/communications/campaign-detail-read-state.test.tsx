import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockUseCampaign = vi.fn();
const mockUseCampaignRecipients = vi.fn();
const mockMutation = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/communications/use-campaigns', () => ({
  useCampaign: (...args: unknown[]) => mockUseCampaign(...args),
  useCampaignRecipients: (...args: unknown[]) => mockUseCampaignRecipients(...args),
  useSendCampaign: () => mockMutation(),
  usePauseCampaign: () => mockMutation(),
  useResumeCampaign: () => mockMutation(),
  useTestSendCampaign: () => mockMutation(),
}));

vi.mock('@/hooks/_shared/use-alert-dismissals', () => ({
  useAlertDismissals: () => ({
    dismiss: vi.fn(),
    isAlertDismissed: () => false,
  }),
}));

vi.mock('@/hooks/_shared/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('@/hooks/_shared/use-confirmation', () => ({
  useConfirmation: () => ({
    confirm: vi.fn().mockResolvedValue({ confirmed: false }),
  }),
  confirmations: {
    sendCampaign: vi.fn(),
    pauseCampaign: vi.fn(),
  },
}));

vi.mock('@/components/shared', () => ({
  MetricCard: ({ title, value }: { title: string; value: ReactNode }) => (
    <div>
      <div>{title}</div>
      <div>{value}</div>
    </div>
  ),
}));

describe('campaign detail read states', () => {
  it('uses operator-safe copy for campaign detail failures', async () => {
    mockUseCampaign.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('postgres campaign detail timeout'),
    });
    mockUseCampaignRecipients.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    mockMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const { CampaignDetailPanel } = await import(
      '@/components/domain/communications/campaigns/campaign-detail-panel'
    );

    render(<CampaignDetailPanel campaignId="campaign-1" onBack={vi.fn()} />);

    expect(screen.getByText('Campaign not found')).toBeInTheDocument();
    expect(
      screen.getByText('Campaign details are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres campaign detail timeout')).not.toBeInTheDocument();
  });
});
