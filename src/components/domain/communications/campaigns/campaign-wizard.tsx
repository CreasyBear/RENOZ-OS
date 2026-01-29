/**
 * CampaignWizard Component
 *
 * Multi-step wizard for creating email campaigns.
 * Steps: Details → Template → Recipients → Preview → Send
 *
 * @see DOM-COMMS-003d
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  Mail,
  Users,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  useCreateCampaign,
  usePopulateCampaignRecipients,
} from "@/hooks/communications/use-campaigns";
import { RecipientFilterBuilder, type RecipientCriteria } from "./recipient-filter-builder";
import { CampaignPreviewPanel } from "./campaign-preview-panel";
import { DateTimePicker } from "../date-time-picker";
import { TimezoneSelect, getLocalTimezone } from "../timezone-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (campaignId: string) => void;
}

type WizardStep = "details" | "template" | "recipients" | "preview";

interface CampaignFormData {
  name: string;
  description: string;
  templateType: string;
  templateData: {
    subjectOverride?: string;
    bodyOverride?: string;
    variables?: Record<string, string>;
  };
  recipientCriteria: RecipientCriteria;
  scheduleEnabled: boolean;
  scheduledAt: Date | null;
  timezone: string;
}

// ============================================================================
// STEP CONFIG
// ============================================================================

const STEPS: { id: WizardStep; label: string; icon: typeof FileText }[] = [
  { id: "details", label: "Details", icon: FileText },
  { id: "template", label: "Template", icon: Mail },
  { id: "recipients", label: "Recipients", icon: Users },
  { id: "preview", label: "Preview", icon: Eye },
];

// ============================================================================
// TEMPLATE OPTIONS
// ============================================================================

const TEMPLATE_OPTIONS = [
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
];

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialFormData: CampaignFormData = {
  name: "",
  description: "",
  templateType: "newsletter",
  templateData: {},
  recipientCriteria: {},
  scheduleEnabled: false,
  scheduledAt: null,
  timezone: getLocalTimezone(),
};

// ============================================================================
// STEP VALIDATION
// ============================================================================

function validateStep(step: WizardStep, data: CampaignFormData): string[] {
  const errors: string[] = [];

  switch (step) {
    case "details":
      if (!data.name.trim()) {
        errors.push("Campaign name is required");
      }
      break;
    case "template":
      if (!data.templateType) {
        errors.push("Template type is required");
      }
      if (data.templateType === "custom") {
        if (!data.templateData.subjectOverride?.trim()) {
          errors.push("Subject line is required for custom templates");
        }
        if (!data.templateData.bodyOverride?.trim()) {
          errors.push("Email body is required for custom templates");
        }
      }
      break;
    case "recipients":
      // Recipients are optional - will include all contacts if no filters
      break;
    case "preview":
      // Validation handled by preview panel
      break;
  }

  return errors;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignWizard({
  open,
  onOpenChange,
  onSuccess,
}: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("details");
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const createCampaignMutation = useCreateCampaign();
  const populateRecipientsMutation = usePopulateCampaignRecipients();

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep("details");
      setFormData(initialFormData);
      setErrors([]);
      setIsSubmitting(false);
      setRecipientCount(0);
    }
  }, [open]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const updateFormData = useCallback(
    <K extends keyof CampaignFormData>(field: K, value: CampaignFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors([]);
    },
    []
  );

  const handleNext = () => {
    const stepErrors = validateStep(currentStep, formData);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (isLastStep) {
      // Show confirmation dialog before sending
      setConfirmDialogOpen(true);
    } else {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
      setErrors([]);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
      setErrors([]);
    }
  };

  const handleSubmit = async () => {
    setConfirmDialogOpen(false);
    setIsSubmitting(true);

    try {
      // Calculate scheduledAt with timezone
      let scheduledAt: Date | undefined;
      if (formData.scheduleEnabled && formData.scheduledAt) {
        scheduledAt = formData.scheduledAt;
      }

      // Create the campaign
      const campaign = (await createCampaignMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        templateType: formData.templateType as "newsletter",
        templateData: formData.templateData,
        recipientCriteria: formData.recipientCriteria,
        scheduledAt,
      })) as { id: string };

      // Populate recipients
      await populateRecipientsMutation.mutateAsync({
        campaignId: campaign.id,
      });

      // If not scheduled, trigger send immediately via event
      // For now we just create the campaign - actual sending is triggered separately

      // Call success callback
      onSuccess?.(campaign.id);
      onOpenChange(false);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Failed to create campaign"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepClick = (stepId: WizardStep) => {
    const targetIndex = STEPS.findIndex((s) => s.id === stepId);
    // Can only go back, or to current step
    if (targetIndex <= currentStepIndex) {
      setCurrentStep(stepId);
      setErrors([]);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          aria-label="Create campaign wizard"
        >
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Set up your campaign in {STEPS.length} easy steps
            </DialogDescription>
          </DialogHeader>

          {/* Step Tabs */}
          <Tabs
            value={currentStep}
            onValueChange={(v) => handleStepClick(v as WizardStep)}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="w-full justify-start">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStepIndex;
                return (
                  <TabsTrigger
                    key={step.id}
                    value={step.id}
                    disabled={index > currentStepIndex}
                    className={cn(
                      "gap-2",
                      isCompleted && "text-green-600 dark:text-green-400"
                    )}
                    aria-label={`Step ${index + 1}: ${step.label}`}
                  >
                    <span className="flex items-center justify-center w-5 h-5 text-xs rounded-full border">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 hidden sm:inline" />
                    <span className="hidden sm:inline">{step.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* Details Step */}
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name *</Label>
                  <Input
                    id="campaign-name"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    placeholder="e.g., January Newsletter"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-description">Description (optional)</Label>
                  <Textarea
                    id="campaign-description"
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    placeholder="Brief description of this campaign..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Template Step */}
              <TabsContent value="template" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Template Type *</Label>
                  <Select
                    value={formData.templateType}
                    onValueChange={(v) => updateFormData("templateType", v)}
                  >
                    <SelectTrigger aria-label="Select template type">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Template Fields */}
                {formData.templateType === "custom" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subject-line">Subject Line *</Label>
                      <Input
                        id="subject-line"
                        value={formData.templateData.subjectOverride || ""}
                        onChange={(e) =>
                          updateFormData("templateData", {
                            ...formData.templateData,
                            subjectOverride: e.target.value,
                          })
                        }
                        placeholder="e.g., Don't miss our latest news!"
                        aria-required="true"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {"{{first_name}}"} for personalization
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-body">Email Body *</Label>
                      <Textarea
                        id="email-body"
                        value={formData.templateData.bodyOverride || ""}
                        onChange={(e) =>
                          updateFormData("templateData", {
                            ...formData.templateData,
                            bodyOverride: e.target.value,
                          })
                        }
                        placeholder="Write your email content here..."
                        rows={8}
                        aria-required="true"
                      />
                      <p className="text-xs text-muted-foreground">
                        HTML is supported. Use {"{{first_name}}"}, {"{{email}}"} for personalization.
                      </p>
                    </div>
                  </>
                )}

                {/* Subject override for other templates */}
                {formData.templateType !== "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="subject-override">Custom Subject (optional)</Label>
                    <Input
                      id="subject-override"
                      value={formData.templateData.subjectOverride || ""}
                      onChange={(e) =>
                        updateFormData("templateData", {
                          ...formData.templateData,
                          subjectOverride: e.target.value,
                        })
                      }
                      placeholder="Leave blank to use template default"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Recipients Step */}
              <TabsContent value="recipients" className="space-y-4 mt-0">
                <RecipientFilterBuilder
                  value={formData.recipientCriteria}
                  onChange={(criteria) => updateFormData("recipientCriteria", criteria)}
                />
              </TabsContent>

              {/* Preview Step */}
              <TabsContent value="preview" className="space-y-4 mt-0">
                <CampaignPreviewPanel
                  name={formData.name}
                  templateType={formData.templateType}
                  templateData={formData.templateData}
                  recipientCriteria={formData.recipientCriteria}
                  scheduledAt={formData.scheduleEnabled ? formData.scheduledAt : null}
                  onRecipientCountChange={setRecipientCount}
                />

                {/* Scheduling Options */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="schedule-toggle" className="text-base font-medium">
                        Schedule for later
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Choose when to send this campaign
                      </p>
                    </div>
                    <Switch
                      id="schedule-toggle"
                      checked={formData.scheduleEnabled}
                      onCheckedChange={(checked) => updateFormData("scheduleEnabled", checked)}
                    />
                  </div>

                  {formData.scheduleEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date & Time</Label>
                        <DateTimePicker
                          value={formData.scheduledAt ?? undefined}
                          onChange={(date) => updateFormData("scheduledAt", date ?? null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <TimezoneSelect
                          value={formData.timezone}
                          onChange={(tz) => updateFormData("timezone", tz)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div
                className="bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-4"
                role="alert"
              >
                <ul className="text-sm text-destructive list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep || isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {STEPS.length}
              </div>

              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting || (isLastStep && recipientCount === 0)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : isLastStep ? (
                  <>
                    {formData.scheduleEnabled ? (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Campaign
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {formData.scheduleEnabled ? "Schedule Campaign?" : "Create Campaign?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {formData.scheduleEnabled ? (
                <>
                  This will schedule "<strong>{formData.name}</strong>" to be sent to{" "}
                  <strong>{recipientCount.toLocaleString()}</strong> recipients on{" "}
                  <strong>
                    {formData.scheduledAt?.toLocaleDateString()} at{" "}
                    {formData.scheduledAt?.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                  .
                </>
              ) : (
                <>
                  This will create "<strong>{formData.name}</strong>" with{" "}
                  <strong>{recipientCount.toLocaleString()}</strong> recipients. You can
                  then send it from the campaigns list.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              {formData.scheduleEnabled ? "Schedule" : "Create"} Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
