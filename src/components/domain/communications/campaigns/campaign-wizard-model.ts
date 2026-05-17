import { getLocalTimezone } from "../timezone-select";

import type {
  Campaign,
  WizardStep,
} from "@/lib/schemas/communications";
import type { RecipientCriteria } from "./recipient-filter-builder";

export interface CampaignWizardFormData {
  name: string;
  description: string;
  templateType: string;
  templateData: {
    templateId?: string;
    templateVersion?: number;
    subjectOverride?: string;
    bodyOverride?: string;
    variables?: Record<string, string>;
    signatureId?: string;
    signatureContent?: string;
  };
  recipientCriteria: RecipientCriteria;
  scheduleEnabled: boolean;
  scheduledAt: Date | null;
  timezone: string;
}

export const CAMPAIGN_TEMPLATE_OPTIONS = [
  {
    value: "newsletter",
    label: "Newsletter",
    description: "Regular newsletter to subscribers",
  },
  {
    value: "promotion",
    label: "Promotion",
    description: "Promotional offer or discount",
  },
  {
    value: "announcement",
    label: "Announcement",
    description: "Important news or updates",
  },
  {
    value: "follow_up",
    label: "Follow Up",
    description: "Follow up with contacts",
  },
  {
    value: "welcome",
    label: "Welcome",
    description: "Welcome new customers",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Create from scratch",
  },
] as const;

export function createEmptyCampaignWizardFormData(): CampaignWizardFormData {
  return {
    name: "",
    description: "",
    templateType: "newsletter",
    templateData: {},
    recipientCriteria: {},
    scheduleEnabled: false,
    scheduledAt: null,
    timezone: getLocalTimezone(),
  };
}

export function createCampaignWizardFormData(
  initialCampaign?: Campaign
): CampaignWizardFormData {
  if (!initialCampaign) return createEmptyCampaignWizardFormData();

  return {
    name: initialCampaign.name,
    description: initialCampaign.description || "",
    templateType: initialCampaign.templateType,
    templateData: (initialCampaign.templateData || {}) as CampaignWizardFormData["templateData"],
    recipientCriteria: (initialCampaign.recipientCriteria || {}) as RecipientCriteria,
    scheduleEnabled: Boolean(initialCampaign.scheduledAt),
    scheduledAt: initialCampaign.scheduledAt || null,
    timezone: getLocalTimezone(),
  };
}

export function validateCampaignWizardStep(
  step: WizardStep,
  data: CampaignWizardFormData
): string[] {
  const errors: string[] = [];
  const usesStoredTemplate = Boolean(data.templateData.templateId);

  switch (step) {
    case "details":
      if (!data.name.trim()) {
        errors.push("Campaign name is required");
      }
      break;
    case "template":
      if (!data.templateType && !usesStoredTemplate) {
        errors.push("Template type is required");
      }
      if (data.templateType === "custom" && !usesStoredTemplate) {
        if (!data.templateData.subjectOverride?.trim()) {
          errors.push("Subject line is required for custom templates");
        }
        if (!data.templateData.bodyOverride?.trim()) {
          errors.push("Email body is required for custom templates");
        }
      }
      break;
    case "recipients":
    case "preview":
      break;
  }

  return errors;
}

interface CampaignWizardTemplateState {
  hasLoadedTemplates: boolean;
  hasSelectedTemplate: boolean;
}

export function hasInvalidCampaignWizardTemplate(
  data: CampaignWizardFormData,
  { hasLoadedTemplates, hasSelectedTemplate }: CampaignWizardTemplateState
): boolean {
  return Boolean(
    data.templateData.templateId && hasLoadedTemplates && !hasSelectedTemplate
  );
}

export function getCampaignWizardScheduledAt(
  data: CampaignWizardFormData
): Date | undefined {
  if (data.scheduleEnabled && data.scheduledAt) return data.scheduledAt;
  return undefined;
}
