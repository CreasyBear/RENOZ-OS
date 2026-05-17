import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  pauseCampaignFromDetail,
  resumeCampaignFromDetail,
  sendCampaignFromDetail,
  testSendCampaignFromDetail,
  type CampaignDetailActionMutations,
} from '@/lib/communications/campaign-detail-actions';

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

function makeMutations(
  overrides: Partial<CampaignDetailActionMutations> = {}
): CampaignDetailActionMutations {
  const sendCampaign = vi.fn<CampaignDetailActionMutations['sendCampaign']>(
    async () => undefined
  );
  const pauseCampaign = vi.fn<CampaignDetailActionMutations['pauseCampaign']>(
    async () => undefined
  );
  const resumeCampaign = vi.fn<CampaignDetailActionMutations['resumeCampaign']>(
    async () => undefined
  );
  const testSendCampaign = vi.fn<
    CampaignDetailActionMutations['testSendCampaign']
  >(async () => undefined);

  return {
    sendCampaign,
    pauseCampaign,
    resumeCampaign,
    testSendCampaign,
    ...overrides,
  };
}

describe('campaign detail actions', () => {
  it('blocks send attempts when the campaign has no recipients', async () => {
    const mutations = makeMutations();
    const confirm = vi.fn(async () => ({ confirmed: true }));

    const result = await sendCampaignFromDetail({
      campaign: makeCampaign({ recipientCount: 0 }),
      confirm,
      mutations,
    });

    expect(result).toEqual({
      status: 'blocked',
      feedback: [
        {
          type: 'error',
          title: 'Cannot send campaign',
          description:
            'This campaign has no recipients. Please add recipients before sending.',
        },
      ],
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(mutations.sendCampaign).not.toHaveBeenCalled();
  });

  it('does not send when the operator cancels confirmation', async () => {
    const mutations = makeMutations();
    const confirm = vi.fn(async () => ({ confirmed: false }));

    const result = await sendCampaignFromDetail({
      campaign: makeCampaign(),
      confirm,
      mutations,
    });

    expect(result).toEqual({ status: 'cancelled', feedback: [] });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Send Campaign',
        confirmLabel: 'Send Now',
      })
    );
    expect(mutations.sendCampaign).not.toHaveBeenCalled();
  });

  it('sends confirmed campaigns and returns success feedback', async () => {
    const mutations = makeMutations();

    const result = await sendCampaignFromDetail({
      campaign: makeCampaign(),
      confirm: vi.fn(async () => ({ confirmed: true })),
      mutations,
    });

    expect(result).toEqual({
      status: 'success',
      feedback: [
        {
          type: 'success',
          title: 'Campaign sending started',
          description:
            'Your campaign "Dealer launch" is now being sent to 12 recipients.',
        },
      ],
    });
    expect(mutations.sendCampaign).toHaveBeenCalledWith({ id: 'campaign-1' });
  });

  it('returns operator-safe send failure feedback', async () => {
    const mutations = makeMutations({
      sendCampaign: vi.fn<CampaignDetailActionMutations['sendCampaign']>(
        async () => {
          throw new Error('SQL syntax error at or near "recipient_status"');
        }
      ),
    });

    const result = await sendCampaignFromDetail({
      campaign: makeCampaign(),
      confirm: vi.fn(async () => ({ confirmed: true })),
      mutations,
    });

    expect(result).toEqual({
      status: 'blocked',
      feedback: [
        {
          type: 'error',
          title: 'Failed to send campaign',
          description: 'Unable to send communication campaign.',
        },
      ],
    });
  });

  it('pauses confirmed campaigns and keeps pause failures operator-safe', async () => {
    const successMutations = makeMutations();

    await expect(
      pauseCampaignFromDetail({
        campaign: makeCampaign({ status: 'sending' }),
        confirm: vi.fn(async () => ({ confirmed: true })),
        mutations: successMutations,
      })
    ).resolves.toEqual({
      status: 'success',
      feedback: [
        {
          type: 'success',
          title: 'Campaign paused',
          description:
            'Campaign "Dealer launch" has been paused. You can resume it later.',
        },
      ],
    });
    expect(successMutations.pauseCampaign).toHaveBeenCalledWith({
      id: 'campaign-1',
    });

    const failureResult = await pauseCampaignFromDetail({
      campaign: makeCampaign({ status: 'sending' }),
      confirm: vi.fn(async () => ({ confirmed: true })),
      mutations: makeMutations({
        pauseCampaign: vi.fn<CampaignDetailActionMutations['pauseCampaign']>(
          async () => {
            throw new Error('postgres campaign pause transaction failed');
          }
        ),
      }),
    });

    expect(failureResult).toEqual({
      status: 'blocked',
      feedback: [
        {
          type: 'error',
          title: 'Failed to pause campaign',
          description: 'Unable to pause communication campaign.',
        },
      ],
    });
  });

  it('resumes campaigns without confirmation and returns safe failure feedback', async () => {
    const mutations = makeMutations();

    const successResult = await resumeCampaignFromDetail({
      campaign: makeCampaign({ status: 'paused' }),
      mutations,
    });

    expect(successResult).toEqual({
      status: 'success',
      feedback: [
        {
          type: 'success',
          title: 'Campaign resumed',
          description: 'Campaign "Dealer launch" is now sending again.',
        },
      ],
    });
    expect(mutations.resumeCampaign).toHaveBeenCalledWith({ id: 'campaign-1' });

    const failureResult = await resumeCampaignFromDetail({
      campaign: makeCampaign({ status: 'paused' }),
      mutations: makeMutations({
        resumeCampaign: vi.fn<CampaignDetailActionMutations['resumeCampaign']>(
          async () => {
            throw new Error('ReferenceError: campaignPayload is not defined');
          }
        ),
      }),
    });

    expect(failureResult).toEqual({
      status: 'blocked',
      feedback: [
        {
          type: 'error',
          title: 'Failed to resume campaign',
          description: 'Unable to resume communication campaign.',
        },
      ],
    });
  });

  it('sends test emails and keeps provider failures operator-safe', async () => {
    const mutations = makeMutations();

    const successResult = await testSendCampaignFromDetail({
      campaign: makeCampaign(),
      testEmail: 'ops@example.com',
      mutations,
    });

    expect(successResult).toEqual({
      status: 'success',
      feedback: [
        {
          type: 'success',
          title: 'Test email sent',
          description: 'Sent to ops@example.com',
        },
      ],
    });
    expect(mutations.testSendCampaign).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      testEmail: 'ops@example.com',
    });

    const failureResult = await testSendCampaignFromDetail({
      campaign: makeCampaign(),
      testEmail: 'ops@example.com',
      mutations: makeMutations({
        testSendCampaign: vi.fn<
          CampaignDetailActionMutations['testSendCampaign']
        >(async () => {
          throw new Error('resend api key rejected by provider');
        }),
      }),
    });

    expect(failureResult).toEqual({
      status: 'blocked',
      feedback: [
        {
          type: 'error',
          title: 'Failed to send test email',
          description: 'Unable to send communication campaign test email.',
        },
      ],
    });
  });

  it('keeps the campaign detail panel on the extracted action boundary', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const detailHook = read(
      'src/hooks/communications/use-campaign-detail-actions.ts'
    );
    const actions = read(
      'src/lib/communications/campaign-detail-actions.ts'
    );

    expect(detailPanel).toContain('useCampaignDetailActions({');
    expect(detailPanel).not.toContain('sendCampaignFromDetail({');
    expect(detailPanel).not.toContain('pauseCampaignFromDetail({');
    expect(detailPanel).not.toContain('resumeCampaignFromDetail({');
    expect(detailPanel).not.toContain('testSendCampaignFromDetail({');
    expect(detailPanel).not.toContain('showCampaignDetailActionFeedback(result.feedback)');
    expect(detailPanel).not.toContain('formatCommunicationCampaignMutationError(error');
    expect(detailHook).toContain('sendCampaignFromDetail({');
    expect(detailHook).toContain('pauseCampaignFromDetail({');
    expect(detailHook).toContain('resumeCampaignFromDetail({');
    expect(detailHook).toContain('testSendCampaignFromDetail({');
    expect(detailHook).toContain('showCampaignDetailActionFeedback(result.feedback)');
    expect(actions).toContain('formatCommunicationCampaignMutationError(error, "send")');
    expect(actions).toContain('formatCommunicationCampaignMutationError(error, "pause")');
    expect(actions).toContain('formatCommunicationCampaignMutationError(error, "resume")');
    expect(actions).toContain('formatCommunicationCampaignMutationError(error, "testSend")');
  });
});
