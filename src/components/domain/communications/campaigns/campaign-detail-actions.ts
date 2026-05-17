import { confirmations } from "@/hooks/_shared/use-confirmation";
import { formatCommunicationCampaignMutationError } from "@/hooks/communications/_mutation-errors";

import type {
  ConfirmationOptions,
  ConfirmationResult,
} from "@/contexts/confirmation-context";
import type {
  Campaign,
  PauseCampaignInput,
  ResumeCampaignInput,
  SendCampaignInput,
  TestSendCampaignInput,
} from "@/lib/schemas/communications";

export interface CampaignDetailActionMutations {
  sendCampaign: (input: SendCampaignInput) => Promise<unknown>;
  pauseCampaign: (input: PauseCampaignInput) => Promise<unknown>;
  resumeCampaign: (input: ResumeCampaignInput) => Promise<unknown>;
  testSendCampaign: (input: TestSendCampaignInput) => Promise<unknown>;
}

export interface CampaignDetailActionFeedback {
  type: "success" | "warning" | "error";
  title: string;
  description?: string;
}

export type CampaignDetailActionResult =
  | {
      status: "success";
      feedback: CampaignDetailActionFeedback[];
    }
  | {
      status: "blocked";
      feedback: CampaignDetailActionFeedback[];
    }
  | {
      status: "cancelled";
      feedback: CampaignDetailActionFeedback[];
    };

type ConfirmCampaignAction = (
  options?: ConfirmationOptions
) => Promise<Pick<ConfirmationResult, "confirmed">>;

interface CampaignDetailActionContext {
  campaign: Campaign;
  mutations: CampaignDetailActionMutations;
}

export async function sendCampaignFromDetail({
  campaign,
  confirm,
  mutations,
}: CampaignDetailActionContext & {
  confirm: ConfirmCampaignAction;
}): Promise<CampaignDetailActionResult> {
  if (campaign.recipientCount === 0) {
    return {
      status: "blocked",
      feedback: [
        {
          type: "error",
          title: "Cannot send campaign",
          description: "This campaign has no recipients. Please add recipients before sending.",
        },
      ],
    };
  }

  const { confirmed } = await confirm(
    confirmations.sendCampaign(campaign.name, campaign.recipientCount)
  );

  if (!confirmed) {
    return { status: "cancelled", feedback: [] };
  }

  try {
    await mutations.sendCampaign({ id: campaign.id });
    return {
      status: "success",
      feedback: [
        {
          type: "success",
          title: "Campaign sending started",
          description: `Your campaign "${campaign.name}" is now being sent to ${campaign.recipientCount} recipients.`,
        },
      ],
    };
  } catch (error) {
    return {
      status: "blocked",
      feedback: [
        {
          type: "error",
          title: "Failed to send campaign",
          description: formatCommunicationCampaignMutationError(error, "send"),
        },
      ],
    };
  }
}

export async function pauseCampaignFromDetail({
  campaign,
  confirm,
  mutations,
}: CampaignDetailActionContext & {
  confirm: ConfirmCampaignAction;
}): Promise<CampaignDetailActionResult> {
  const { confirmed } = await confirm(confirmations.pauseCampaign(campaign.name));

  if (!confirmed) {
    return { status: "cancelled", feedback: [] };
  }

  try {
    await mutations.pauseCampaign({ id: campaign.id });
    return {
      status: "success",
      feedback: [
        {
          type: "success",
          title: "Campaign paused",
          description: `Campaign "${campaign.name}" has been paused. You can resume it later.`,
        },
      ],
    };
  } catch (error) {
    return {
      status: "blocked",
      feedback: [
        {
          type: "error",
          title: "Failed to pause campaign",
          description: formatCommunicationCampaignMutationError(error, "pause"),
        },
      ],
    };
  }
}

export async function resumeCampaignFromDetail({
  campaign,
  mutations,
}: CampaignDetailActionContext): Promise<CampaignDetailActionResult> {
  try {
    await mutations.resumeCampaign({ id: campaign.id });
    return {
      status: "success",
      feedback: [
        {
          type: "success",
          title: "Campaign resumed",
          description: `Campaign "${campaign.name}" is now sending again.`,
        },
      ],
    };
  } catch (error) {
    return {
      status: "blocked",
      feedback: [
        {
          type: "error",
          title: "Failed to resume campaign",
          description: formatCommunicationCampaignMutationError(error, "resume"),
        },
      ],
    };
  }
}

export async function testSendCampaignFromDetail({
  campaign,
  testEmail,
  mutations,
}: CampaignDetailActionContext & {
  testEmail: string;
}): Promise<CampaignDetailActionResult> {
  try {
    await mutations.testSendCampaign({ campaignId: campaign.id, testEmail });
    return {
      status: "success",
      feedback: [
        {
          type: "success",
          title: "Test email sent",
          description: `Sent to ${testEmail}`,
        },
      ],
    };
  } catch (error) {
    return {
      status: "blocked",
      feedback: [
        {
          type: "error",
          title: "Failed to send test email",
          description: formatCommunicationCampaignMutationError(error, "testSend"),
        },
      ],
    };
  }
}
