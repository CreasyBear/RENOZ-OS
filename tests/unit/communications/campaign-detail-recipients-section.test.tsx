import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CampaignDetailRecipientsSection } from '@/components/domain/communications/campaigns/campaign-detail-recipients-section';
import type { CampaignRecipient } from '@/lib/schemas/communications';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
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
    status: 'sent',
    sentAt: null,
    openedAt: null,
    clickedAt: null,
    errorMessage: null,
    ...overrides,
  };
}

describe('CampaignDetailRecipientsSection', () => {
  it('renders recipient rows with status and activity evidence', () => {
    render(
      <CampaignDetailRecipientsSection
        recipientCount={4}
        isLoading={false}
        recipients={[
          makeRecipient({
            id: 'clicked',
            email: 'clicked@example.com',
            name: 'Clicked Contact',
            status: 'clicked',
            clickedAt: new Date('2026-05-17T01:00:00.000Z'),
          }),
          makeRecipient({
            id: 'opened',
            email: 'opened@example.com',
            name: 'Opened Contact',
            status: 'opened',
            openedAt: new Date('2026-05-17T02:00:00.000Z'),
          }),
          makeRecipient({
            id: 'failed',
            email: 'failed@example.com',
            name: null,
            status: 'failed',
            errorMessage: 'Provider rejected the message because the address bounced',
          }),
          makeRecipient({
            id: 'pending',
            email: 'pending@example.com',
            name: 'Pending Contact',
            status: 'pending',
          }),
        ]}
      />
    );

    expect(screen.getByText('Recipients (4)')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign recipients')).toBeInTheDocument();
    expect(screen.getByText('Clicked Contact')).toBeInTheDocument();
    expect(screen.getByText('clicked@example.com')).toBeInTheDocument();
    expect(screen.getByText('Opened Contact')).toBeInTheDocument();
    expect(screen.getByText('opened@example.com')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('failed@example.com')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) =>
        element?.tagName === 'SPAN' && content.startsWith('Clicked ')
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText((content, element) =>
        element?.tagName === 'SPAN' && content.startsWith('Opened ')
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Error: Provider rejected the message/)).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
  });

  it('renders loading and empty recipient states inside the section boundary', () => {
    const { rerender } = render(
      <CampaignDetailRecipientsSection
        recipientCount={0}
        isLoading={true}
        recipients={[]}
      />
    );

    expect(screen.getByText('Recipients (0)')).toBeInTheDocument();
    expect(screen.queryByText('No recipients yet')).not.toBeInTheDocument();

    rerender(
      <CampaignDetailRecipientsSection
        recipientCount={0}
        isLoading={false}
        recipients={[]}
      />
    );

    expect(screen.getByText('No recipients yet')).toBeInTheDocument();
    expect(
      screen.getByText('Recipients will be populated when the campaign is sent or scheduled.')
    ).toBeInTheDocument();
  });

  it('keeps recipient table rendering outside the campaign detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const loadedState = read(
      'src/components/domain/communications/campaigns/campaign-detail-loaded-state.tsx'
    );
    const recipientsSection = read(
      'src/components/domain/communications/campaigns/campaign-detail-recipients-section.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailLoadedState');
    expect(detailPanel).not.toContain('<CampaignDetailRecipientsSection');
    expect(loadedState).toContain('<CampaignDetailRecipientsSection');
    expect(detailPanel).not.toContain('Campaign recipients');
    expect(detailPanel).not.toContain('No recipients yet');
    expect(detailPanel).not.toContain('RecipientStatusBadge');
    expect(recipientsSection).toContain('Campaign recipients');
    expect(recipientsSection).toContain('No recipients yet');
    expect(recipientsSection).toContain('RecipientStatusBadge');
  });
});
