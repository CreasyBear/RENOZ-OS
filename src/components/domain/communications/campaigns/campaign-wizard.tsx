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
  useUpdateCampaign,
  usePopulateCampaignRecipients,
  useSendCampaign,
} from "@/hooks/communications/use-campaigns";
import { useTemplates } from "@/hooks/communications/use-templates";
import { RecipientFilterBuilder } from "./recipient-filter-builder";
import { CampaignPreviewPanel } from "./campaign-preview-panel";
import {
  CAMPAIGN_TEMPLATE_OPTIONS,
  createCampaignWizardFormData,
  createEmptyCampaignWizardFormData,
  hasInvalidCampaignWizardTemplate,
  validateCampaignWizardStep,
  type CampaignWizardFormData,
} from "./campaign-wizard-model";
import {
  submitCampaignWizard,
  type CampaignWizardFeedback,
} from "./campaign-wizard-submit";
import { DateTimePicker } from "../date-time-picker";
import { TimezoneSelect } from "../timezone-select";
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
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { CommunicationsErrorBoundary } from "../communications-error-boundary";
import { SignatureSelector } from "../signatures/signature-selector";

// ============================================================================
// TYPES
// ============================================================================

import type {
  CampaignWizardProps,
  WizardStep,
} from "@/lib/schemas/communications";

// ============================================================================
// STEP CONFIG
// ============================================================================

const STEPS: { id: WizardStep; label: string; icon: typeof FileText }[] = [
  { id: "details", label: "Details", icon: FileText },
  { id: "template", label: "Template", icon: Mail },
  { id: "recipients", label: "Recipients", icon: Users },
  { id: "preview", label: "Preview", icon: Eye },
];

function showCampaignWizardFeedback(feedback: CampaignWizardFeedback[]) {
  for (const item of feedback) {
    const options = item.description ? { description: item.description } : undefined;
    if (item.type === "success") toast.success(item.title, options);
    if (item.type === "warning") toast.warning(item.title, options);
    if (item.type === "error") toast.error(item.title, options);
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignWizard({
  open,
  onOpenChange,
  onSuccess,
  initialCampaign,
}: CampaignWizardProps) {
  return (
    <CommunicationsErrorBoundary
      title="Campaign Wizard Error"
      description="We encountered an error in the campaign wizard. Please try again or contact support if the issue persists."
    >
      <CampaignWizardContent
        open={open}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        initialCampaign={initialCampaign}
      />
    </CommunicationsErrorBoundary>
  );
}

function CampaignWizardContent({
  open,
  onOpenChange,
  onSuccess,
  initialCampaign,
}: CampaignWizardProps) {
  const isEditMode = !!initialCampaign;
  const [currentStep, setCurrentStep] = useState<WizardStep>("details");

  const [formData, setFormData] = useState<CampaignWizardFormData>(() =>
    createCampaignWizardFormData(initialCampaign)
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const createCampaignMutation = useCreateCampaign();
  const updateCampaignMutation = useUpdateCampaign();
  const populateRecipientsMutation = usePopulateCampaignRecipients();
  const sendCampaignMutation = useSendCampaign();
  const { data: templatesData } = useTemplates({ activeOnly: true });
  const templates = templatesData ?? [];
  const selectedTemplate = templates.find(
    (template) => template.id === formData.templateData.templateId
  );
  const hasLoadedTemplates = templatesData !== undefined;
  const hasInvalidTemplate = hasInvalidCampaignWizardTemplate(formData, {
    hasLoadedTemplates,
    hasSelectedTemplate: Boolean(selectedTemplate),
  });

  // Reset form when dialog closes or initialize from initialCampaign
  useEffect(() => {
    if (!open) {
      setCurrentStep("details");
      setFormData(createEmptyCampaignWizardFormData());
      setErrors([]);
      setSubmitError(null);
      setIsSubmitting(false);
      setRecipientCount(0);
    } else if (initialCampaign) {
      setFormData(createCampaignWizardFormData(initialCampaign));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCampaign?.id]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const updateFormData = useCallback(
    <K extends keyof CampaignWizardFormData>(
      field: K,
      value: CampaignWizardFormData[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors([]);
    },
    []
  );

  const handleNext = () => {
    if (currentStep === "template" && hasInvalidTemplate) {
      setSubmitError("The selected saved template is no longer available. Choose another template or detach it before continuing.");
      return;
    }
    const stepErrors = validateCampaignWizardStep(currentStep, formData);
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
      setSubmitError(null);
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
    setSubmitError(null);

    try {
      const result = await submitCampaignWizard({
        formData,
        hasInvalidTemplate,
        initialCampaign,
        mutations: {
          createCampaign: (input) => createCampaignMutation.mutateAsync(input),
          updateCampaign: (input) => updateCampaignMutation.mutateAsync(input),
          populateRecipients: (input) =>
            populateRecipientsMutation.mutateAsync(input),
          sendCampaign: (input) => sendCampaignMutation.mutateAsync(input),
        },
      });

      if (result.status === "submitError") {
        setSubmitError(result.message);
        return;
      }

      showCampaignWizardFeedback(result.feedback);

      if (result.status === "success") {
        onSuccess?.(result.campaignId);
        onOpenChange(false);
      }
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

  const isPending =
    isSubmitting ||
    populateRecipientsMutation.isPending ||
    sendCampaignMutation.isPending;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          aria-label={isEditMode ? "Edit campaign wizard" : "Create campaign wizard"}
          onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
          onInteractOutside={pendingInteractionGuards.onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Email Campaign" : "Create Email Campaign"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update your email campaign settings and recipients."
                : `Set up your campaign in ${STEPS.length} easy steps`}
            </DialogDescription>
          </DialogHeader>

          {/* Step Tabs */}
          <Tabs
            value={currentStep}
            onValueChange={(v) => {
              if (v === "details" || v === "template" || v === "recipients" || v === "preview") {
                handleStepClick(v);
              }
            }}
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
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Fallback Template Type *</Label>
                  <Select
                    value={formData.templateType}
                    onValueChange={(v) => updateFormData("templateType", v)}
                  >
                    <SelectTrigger aria-label="Select template type">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TEMPLATE_OPTIONS.map((option) => (
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
                  <p className="text-xs text-muted-foreground">
                    Used when no saved template is attached to the campaign.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Saved Template</Label>
                  <Select
                    value={formData.templateData.templateId ?? "__none__"}
                    onValueChange={(value) => {
                      const templateId = value === "__none__" ? undefined : value;
                      const template = templates.find((item) => item.id === templateId);
                      setSubmitError(null);
                      updateFormData("templateData", {
                        ...formData.templateData,
                        templateId,
                        templateVersion: template?.version,
                        subjectOverride: undefined,
                        bodyOverride: undefined,
                      });
                    }}
                  >
                    <SelectTrigger aria-label="Select saved template">
                      <SelectValue placeholder="No saved template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No saved template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Saved templates route preview, test send, scheduling, and delivery through the same renderer.
                  </p>
                </div>

                {hasInvalidTemplate && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      This saved template is no longer available. Choose another template or detach it before sending.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Custom Template Fields */}
                {formData.templateType === "custom" && !formData.templateData.templateId && (
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
                {(formData.templateType !== "custom" || formData.templateData.templateId) && (
                  <div className="space-y-2">
                    <Label htmlFor="subject-override">
                      {formData.templateData.templateId ? "Subject Override (optional)" : "Custom Subject (optional)"}
                    </Label>
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
                      aria-describedby={selectedTemplate ? "saved-template-subject-help" : undefined}
                    />
                    {selectedTemplate && (
                      <p id="saved-template-subject-help" className="text-xs text-muted-foreground">
                        Default subject: {selectedTemplate.subject}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Email Signature</Label>
                  <SignatureSelector
                    value={formData.templateData.signatureId}
                    onChange={(signatureId, signatureContent) =>
                      updateFormData("templateData", {
                        ...formData.templateData,
                        signatureId: signatureId ?? undefined,
                        signatureContent: signatureContent || undefined,
                      })
                    }
                  />
                </div>

                {formData.templateData.templateId && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div>
                      Template source: <span className="font-medium">{selectedTemplate?.name ?? "Unavailable saved template"}</span>
                    </div>
                    <div>
                      Subject source: <span className="font-medium">{formData.templateData.subjectOverride || selectedTemplate?.subject || "Unset"}</span>
                    </div>
                    <div>
                      Signature: <span className="font-medium">{formData.templateData.signatureId ? "Attached" : "None"}</span>
                    </div>
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
            {submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

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
                {(isSubmitting || populateRecipientsMutation.isPending || sendCampaignMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {populateRecipientsMutation.isPending 
                      ? "Populating recipients..." 
                      : sendCampaignMutation.isPending 
                      ? "Starting send..." 
                      : "Creating..."}
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
                        Create & Send
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
              {isEditMode
                ? formData.scheduleEnabled
                  ? "Update and Schedule Campaign?"
                  : "Update Campaign?"
                : formData.scheduleEnabled
                  ? "Schedule Campaign?"
                  : "Send Campaign Now?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {formData.scheduleEnabled ? (
                <>
                  This will schedule &quot;<strong>{formData.name}</strong>&quot; to be sent to{" "}
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
                  This will create &quot;<strong>{formData.name}</strong>&quot; and send it to{" "}
                  <strong>{recipientCount.toLocaleString()}</strong> recipients immediately.
                  {recipientCount === 0 && (
                    <span className="block mt-2 text-destructive font-medium">
                      ⚠️ No recipients found. Please adjust your recipient filters.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit} 
              disabled={isSubmitting || populateRecipientsMutation.isPending || sendCampaignMutation.isPending || recipientCount === 0}
            >
              {(isSubmitting || populateRecipientsMutation.isPending || sendCampaignMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {populateRecipientsMutation.isPending 
                    ? "Populating recipients..." 
                    : sendCampaignMutation.isPending 
                    ? "Starting send..." 
                    : "Creating..."}
                </>
              ) : formData.scheduleEnabled ? (
                "Schedule"
              ) : (
                "Create & Send"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
