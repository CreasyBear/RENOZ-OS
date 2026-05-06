import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseCampaignPreview = vi.fn();

vi.mock('@/hooks/communications/use-campaigns', () => ({
  useCampaignPreview: (...args: unknown[]) => mockUseCampaignPreview(...args),
}));

describe('campaign preview read states', () => {
  it('uses operator-safe copy for recipient preview failures', async () => {
    mockUseCampaignPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('postgres timeout while previewing campaign recipients'),
    });

    const { CampaignPreviewPanel } = await import(
      '@/components/domain/communications/campaigns/campaign-preview-panel'
    );

    render(
      <CampaignPreviewPanel
        name="Warranty reminder"
        templateType="reminder"
        recipientCriteria={{ statuses: ['active'] }}
      />
    );

    expect(screen.getByText('Error loading preview')).toBeInTheDocument();
    expect(
      screen.getByText('Campaign preview is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('postgres timeout while previewing campaign recipients')
    ).not.toBeInTheDocument();
  });
});
