'use server';

/**
 * Campaign send Trigger.dev wiring.
 *
 * Business processing lives in the communications shared helper so jobs and
 * ServerFns both stay at their own boundary.
 */

import { logger, schedules, task, wait } from "@trigger.dev/sdk/v3";
import {
  pauseCampaignSend,
  processCampaignSend,
  processDueScheduledCampaigns,
  type PauseCampaignPayload,
  type SendCampaignPayload,
  type SendCampaignResult,
} from "@/server/functions/communications/_shared/campaign-send-processing";

export type { PauseCampaignPayload, SendCampaignPayload, SendCampaignResult };

export const sendCampaignTask = task({
  id: "send-campaign",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: SendCampaignPayload): Promise<SendCampaignResult> =>
    processCampaignSend(payload, {
      logger,
      waitForSeconds: (seconds) => wait.for({ seconds }),
    }),
});

export const pauseCampaignTask = task({
  id: "pause-campaign",
  run: async (
    payload: PauseCampaignPayload,
  ): Promise<{ campaignId: string; status: string }> =>
    pauseCampaignSend(payload, logger),
});

export const processScheduledCampaignsTask = schedules.task({
  id: "process-scheduled-campaigns",
  cron: "*/5 * * * *",
  run: async (): Promise<{ processed: number; campaignIds: string[] }> =>
    processDueScheduledCampaigns({
      logger,
      triggerSendCampaign: (payload) => sendCampaignTask.trigger(payload),
    }),
});

export const sendCampaignJob = sendCampaignTask;
export const pauseCampaignJob = pauseCampaignTask;
export const processScheduledCampaignsJob = processScheduledCampaignsTask;
