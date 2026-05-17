import { formatCommunicationCampaignMutationError } from "@/hooks/communications/_mutation-errors";
import { getCampaignWizardScheduledAt, type CampaignWizardFormData } from "./campaign-wizard-model";

import type {
  Campaign,
  CreateCampaignInput,
  PopulateCampaignRecipientsInput,
  SendCampaignInput,
  UpdateCampaignInput,
} from "@/lib/schemas/communications";

export interface CampaignWizardSubmitMutations {
  createCampaign: (input: CreateCampaignInput) => Promise<Campaign>;
  updateCampaign: (input: UpdateCampaignInput) => Promise<Campaign>;
  populateRecipients: (
    input: PopulateCampaignRecipientsInput
  ) => Promise<{ recipientCount: number }>;
  sendCampaign: (input: SendCampaignInput) => Promise<unknown>;
}

export interface CampaignWizardFeedback {
  type: "success" | "warning" | "error";
  title: string;
  description?: string;
}

export type CampaignWizardSubmitResult =
  | {
      status: "success";
      campaignId: string;
      feedback: CampaignWizardFeedback[];
    }
  | {
      status: "blocked";
      feedback: CampaignWizardFeedback[];
    }
  | {
      status: "submitError";
      message: string;
    };

interface SubmitCampaignWizardInput {
  formData: CampaignWizardFormData;
  hasInvalidTemplate: boolean;
  initialCampaign?: Campaign;
  mutations: CampaignWizardSubmitMutations;
}

const INVALID_TEMPLATE_MESSAGE =
  "The selected saved template is no longer available. Choose another template or detach it before saving.";

export async function submitCampaignWizard({
  formData,
  hasInvalidTemplate,
  initialCampaign,
  mutations,
}: SubmitCampaignWizardInput): Promise<CampaignWizardSubmitResult> {
  const isEditMode = Boolean(initialCampaign);

  try {
    if (hasInvalidTemplate) {
      throw new Error(INVALID_TEMPLATE_MESSAGE);
    }

    const scheduledAt = getCampaignWizardScheduledAt(formData);

    if (isEditMode && initialCampaign) {
      return await updateExistingCampaign({
        formData,
        initialCampaign,
        scheduledAt,
        mutations,
      });
    }

    return await createNewCampaign({
      formData,
      scheduledAt,
      mutations,
    });
  } catch (error) {
    return {
      status: "submitError",
      message: formatCommunicationCampaignMutationError(
        error,
        isEditMode ? "update" : "create"
      ),
    };
  }
}

interface CampaignWizardSubmitContext {
  formData: CampaignWizardFormData;
  scheduledAt: Date | undefined;
  mutations: CampaignWizardSubmitMutations;
}

interface CampaignWizardUpdateContext extends CampaignWizardSubmitContext {
  initialCampaign: Campaign;
}

async function updateExistingCampaign({
  formData,
  initialCampaign,
  scheduledAt,
  mutations,
}: CampaignWizardUpdateContext): Promise<CampaignWizardSubmitResult> {
  const campaign = await mutations.updateCampaign({
    id: initialCampaign.id,
    name: formData.name,
    description: formData.description || undefined,
    templateType: formData.templateType as "newsletter",
    templateData: formData.templateData,
    recipientCriteria: formData.recipientCriteria,
    scheduledAt,
  });

  const feedback: CampaignWizardFeedback[] = [];

  try {
    const populateResult = await mutations.populateRecipients({
      campaignId: campaign.id,
    });

    if (populateResult.recipientCount === 0) {
      feedback.push({
        type: "warning",
        title: "No recipients found",
        description: "Recipient criteria updated but no recipients match. Campaign saved.",
      });
    }
  } catch (error) {
    feedback.push({
      type: "warning",
      title: "Campaign updated but failed to refresh recipients",
      description: formatCommunicationCampaignMutationError(error, "populate"),
    });
  }

  feedback.push({
    type: "success",
    title: "Campaign updated successfully",
  });

  return {
    status: "success",
    campaignId: campaign.id,
    feedback,
  };
}

async function createNewCampaign({
  formData,
  scheduledAt,
  mutations,
}: CampaignWizardSubmitContext): Promise<CampaignWizardSubmitResult> {
  const campaign = await mutations.createCampaign({
    name: formData.name,
    description: formData.description || undefined,
    templateType: formData.templateType as "newsletter",
    templateData: formData.templateData,
    recipientCriteria: formData.recipientCriteria,
    scheduledAt,
  });

  let populateResult: { recipientCount: number };
  try {
    populateResult = await mutations.populateRecipients({
      campaignId: campaign.id,
    });
  } catch (error) {
    return {
      status: "blocked",
      feedback: [
        {
          type: "error",
          title: "Failed to populate recipients",
          description: formatCommunicationCampaignMutationError(error, "populate"),
        },
      ],
    };
  }

  if (populateResult.recipientCount === 0) {
    return {
      status: "blocked",
      feedback: [
        {
          type: "error",
          title: "No recipients found",
          description: "Please adjust your recipient filters and try again.",
        },
      ],
    };
  }

  const feedback: CampaignWizardFeedback[] = [];

  if (!scheduledAt) {
    try {
      await mutations.sendCampaign({ id: campaign.id });
      feedback.push({
        type: "success",
        title: "Campaign created and sent successfully",
      });
    } catch (error) {
      return {
        status: "blocked",
        feedback: [
          {
            type: "warning",
            title: "Campaign created but failed to start sending",
            description: `${formatCommunicationCampaignMutationError(error, "send")} You can send it manually from the campaign detail page.`,
          },
        ],
      };
    }
  }

  feedback.push({
    type: "success",
    title: "Campaign created successfully",
  });

  return {
    status: "success",
    campaignId: campaign.id,
    feedback,
  };
}
