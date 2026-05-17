import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  submitCampaignWizard,
  type CampaignWizardSubmitMutations,
} from '@/components/domain/communications/campaigns/campaign-wizard-submit';
import { createEmptyCampaignWizardFormData } from '@/components/domain/communications/campaigns/campaign-wizard-model';

import type { Campaign } from '@/lib/schemas/communications';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeCampaign(id = 'campaign-1'): Campaign {
  return {
    id,
    name: 'Dealer launch',
    description: null,
    templateType: 'newsletter',
    templateData: {},
    recipientCriteria: {},
    scheduledAt: null,
  } as Campaign;
}

function makeForm() {
  return {
    ...createEmptyCampaignWizardFormData(),
    name: 'Dealer launch',
    templateType: 'newsletter',
  };
}

function makeMutations(
  overrides: Partial<CampaignWizardSubmitMutations> = {}
) {
  const createCampaign = vi.fn<CampaignWizardSubmitMutations['createCampaign']>(
    async () => makeCampaign('created-campaign')
  );
  const updateCampaign = vi.fn<CampaignWizardSubmitMutations['updateCampaign']>(
    async () => makeCampaign('updated-campaign')
  );
  const populateRecipients = vi.fn<
    CampaignWizardSubmitMutations['populateRecipients']
  >(async () => ({ recipientCount: 12 }));
  const sendCampaign = vi.fn<CampaignWizardSubmitMutations['sendCampaign']>(
    async () => undefined
  );

  return {
    createCampaign,
    updateCampaign,
    populateRecipients,
    sendCampaign,
    ...overrides,
  };
}

describe('campaign wizard submit workflow', () => {
  it('blocks invalid saved-template submissions before calling mutations', async () => {
    const mutations = makeMutations();

    const result = await submitCampaignWizard({
      formData: makeForm(),
      hasInvalidTemplate: true,
      mutations,
    });

    expect(result).toEqual({
      status: 'submitError',
      message:
        'The selected saved template is no longer available. Choose another template or detach it before saving.',
    });
    expect(mutations.createCampaign).not.toHaveBeenCalled();
    expect(mutations.updateCampaign).not.toHaveBeenCalled();
    expect(mutations.populateRecipients).not.toHaveBeenCalled();
    expect(mutations.sendCampaign).not.toHaveBeenCalled();
  });

  it('creates, populates, and immediately sends unscheduled campaigns', async () => {
    const mutations = makeMutations();

    const result = await submitCampaignWizard({
      formData: makeForm(),
      hasInvalidTemplate: false,
      mutations,
    });

    expect(result).toEqual({
      status: 'success',
      campaignId: 'created-campaign',
      feedback: [
        {
          type: 'success',
          title: 'Campaign created and sent successfully',
        },
        {
          type: 'success',
          title: 'Campaign created successfully',
        },
      ],
    });
    expect(mutations.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Dealer launch',
        scheduledAt: undefined,
      })
    );
    expect(mutations.populateRecipients).toHaveBeenCalledWith({
      campaignId: 'created-campaign',
    });
    expect(mutations.sendCampaign).toHaveBeenCalledWith({
      id: 'created-campaign',
    });
  });

  it('creates scheduled campaigns without sending immediately', async () => {
    const mutations = makeMutations();
    const scheduledAt = new Date('2026-06-01T04:00:00.000Z');

    const result = await submitCampaignWizard({
      formData: {
        ...makeForm(),
        scheduleEnabled: true,
        scheduledAt,
      },
      hasInvalidTemplate: false,
      mutations,
    });

    expect(result).toEqual({
      status: 'success',
      campaignId: 'created-campaign',
      feedback: [
        {
          type: 'success',
          title: 'Campaign created successfully',
        },
      ],
    });
    expect(mutations.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledAt })
    );
    expect(mutations.sendCampaign).not.toHaveBeenCalled();
  });

  it('returns operator-safe blocking feedback when recipient population fails', async () => {
    const mutations = makeMutations({
      populateRecipients: vi.fn<
        CampaignWizardSubmitMutations['populateRecipients']
      >(async () => {
        throw new Error('postgres database constraint failed while populating recipients');
      }),
    });

    const result = await submitCampaignWizard({
      formData: makeForm(),
      hasInvalidTemplate: false,
      mutations,
    });

    expect(result).toEqual({
      status: 'blocked',
      feedback: [
        {
          type: 'error',
          title: 'Failed to populate recipients',
          description: 'Unable to populate communication campaign recipients.',
        },
      ],
    });
    expect(mutations.sendCampaign).not.toHaveBeenCalled();
  });

  it('returns operator-safe blocking feedback when immediate send fails', async () => {
    const mutations = makeMutations({
      sendCampaign: vi.fn<CampaignWizardSubmitMutations['sendCampaign']>(
        async () => {
          throw new Error('SQL syntax error at or near "recipient_status"');
        }
      ),
    });

    const result = await submitCampaignWizard({
      formData: makeForm(),
      hasInvalidTemplate: false,
      mutations,
    });

    expect(result).toEqual({
      status: 'blocked',
      feedback: [
        {
          type: 'warning',
          title: 'Campaign created but failed to start sending',
          description:
            'Unable to send communication campaign. You can send it manually from the campaign detail page.',
        },
      ],
    });
  });

  it('updates campaigns and keeps recipient refresh failures non-blocking', async () => {
    const mutations = makeMutations({
      populateRecipients: vi.fn<
        CampaignWizardSubmitMutations['populateRecipients']
      >(async () => ({ recipientCount: 0 })),
    });

    const result = await submitCampaignWizard({
      formData: makeForm(),
      hasInvalidTemplate: false,
      initialCampaign: makeCampaign('existing-campaign'),
      mutations,
    });

    expect(result).toEqual({
      status: 'success',
      campaignId: 'updated-campaign',
      feedback: [
        {
          type: 'warning',
          title: 'No recipients found',
          description: 'Recipient criteria updated but no recipients match. Campaign saved.',
        },
        {
          type: 'success',
          title: 'Campaign updated successfully',
        },
      ],
    });
    expect(mutations.updateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'existing-campaign' })
    );
    expect(mutations.createCampaign).not.toHaveBeenCalled();
    expect(mutations.sendCampaign).not.toHaveBeenCalled();
  });

  it('keeps the wizard component on the extracted submit boundary', () => {
    const wizard = read(
      'src/components/domain/communications/campaigns/campaign-wizard.tsx'
    );

    expect(wizard).toContain('submitCampaignWizard({');
    expect(wizard).toContain('showCampaignWizardFeedback(result.feedback)');
    expect(wizard).not.toContain('let campaign: Campaign');
    expect(wizard).not.toContain('let populateResult');
    expect(wizard).not.toContain('const scheduledAt = getCampaignWizardScheduledAt(formData)');
    expect(wizard).not.toContain('formatCommunicationCampaignMutationError(error');
  });
});
