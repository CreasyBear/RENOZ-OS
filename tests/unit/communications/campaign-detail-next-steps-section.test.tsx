import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CampaignDetailNextStepsSection } from '@/components/domain/communications/campaigns/campaign-detail-next-steps-section';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function renderSection(overrides = {}) {
  const props = {
    status: 'sent' as const,
    onViewAnalytics: vi.fn(),
    onCreateNewCampaign: vi.fn(),
    onViewEmailHistory: vi.fn(),
    ...overrides,
  };

  render(<CampaignDetailNextStepsSection {...props} />);
  return props;
}

describe('CampaignDetailNextStepsSection', () => {
  it('renders terminal campaign next steps and routes each action', () => {
    const props = renderSection();

    expect(screen.getByLabelText('Next steps')).toBeInTheDocument();
    expect(screen.getByText('Campaign completed successfully')).toBeInTheDocument();
    expect(
      screen.getByText('Your campaign has been sent. Here are some suggested next steps:')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View Analytics/ }));
    fireEvent.click(screen.getByRole('button', { name: /Create New Campaign/ }));
    fireEvent.click(screen.getByRole('button', { name: /View Email History/ }));

    expect(props.onViewAnalytics).toHaveBeenCalledTimes(1);
    expect(props.onCreateNewCampaign).toHaveBeenCalledTimes(1);
    expect(props.onViewEmailHistory).toHaveBeenCalledTimes(1);
  });

  it('does not render next steps before a campaign is sent', () => {
    const { container } = render(
      <CampaignDetailNextStepsSection
        status="sending"
        onViewAnalytics={vi.fn()}
        onCreateNewCampaign={vi.fn()}
        onViewEmailHistory={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps terminal next-step rendering outside the campaign detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const nextStepsSection = read(
      'src/components/domain/communications/campaigns/campaign-detail-next-steps-section.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailNextStepsSection');
    expect(detailPanel).not.toContain('Campaign completed successfully');
    expect(detailPanel).not.toContain('Create New Campaign');
    expect(nextStepsSection).toContain('Campaign completed successfully');
    expect(nextStepsSection).toContain('Create New Campaign');
  });
});
