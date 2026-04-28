/**
 * ScheduleEmailDialog Component
 *
 * Dialog for scheduling or editing a scheduled email.
 * Includes email composition, datetime picker, and timezone selection.
 *
 * @see DOM-COMMS-002c
 */

import { useState, useCallback, useEffect, startTransition } from "react";
import {
  useScheduleEmail,
  useUpdateScheduledEmail,
} from "@/hooks/communications/use-scheduled-emails";
import { useTemplates } from "@/hooks/communications/use-templates";
import { addHours } from "date-fns";
import { Send, Calendar, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import { DateTimePicker } from "../date-time-picker";
import { TimezoneSelect, getLocalTimezone } from "../timezone-select";
import { SignatureSelector } from "../signatures/signature-selector";

// ============================================================================
// TYPES
// ============================================================================

import type {
  ScheduleEmailDialogProps,
  TemplateType,
} from "@/lib/schemas/communications";
import type { JsonValue } from "@/lib/schemas/_shared/patterns";

// Re-export for backward compatibility
export type { TemplateType, ScheduleEmailDialogProps };

const TEMPLATE_OPTIONS: { value: TemplateType; label: string }[] = [
  { value: "custom", label: "Custom Email" },
  { value: "welcome", label: "Welcome" },
  { value: "follow_up", label: "Follow Up" },
  { value: "quote", label: "Quote" },
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "shipping_notification", label: "Shipping Notification" },
  { value: "reminder", label: "Reminder" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleEmailDialog({
  open,
  onOpenChange,
  initialData,
  isLoadingInitialData,
  initialDataError,
  defaultRecipient,
  defaultCustomerId,
  defaultTemplate,
  onCreateSignature,
  onSuccess,
}: ScheduleEmailDialogProps) {
  const scheduleEmailMutation = useScheduleEmail();
  const updateEmailMutation = useUpdateScheduledEmail();
  const isEditing = !!initialData?.id;
  const { data: templatesData } = useTemplates({ activeOnly: true });
  const templates = templatesData ?? [];

  // Form state
  const [recipientEmail, setRecipientEmail] = useState(
    initialData?.recipientEmail ?? defaultRecipient?.email ?? ""
  );
  const [recipientName, setRecipientName] = useState(
    initialData?.recipientName ?? defaultRecipient?.name ?? ""
  );
  const [subject, setSubject] = useState(initialData?.subject ?? "");
  const [templateType, setTemplateType] = useState<TemplateType>(
    initialData?.templateType ?? "custom"
  );
  const [bodyOverride, setBodyOverride] = useState(
    initialData?.templateData?.bodyOverride ?? ""
  );
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(
    initialData?.scheduledAt ?? addHours(new Date(), 1)
  );
  const [timezone, setTimezone] = useState(
    initialData?.timezone ?? getLocalTimezone()
  );
  const [signatureId, setSignatureId] = useState<string | undefined>(
    initialData?.templateData?.signatureId
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    initialData?.templateData?.templateId ?? defaultTemplate?.templateId
  );
  const [signatureContent, setSignatureContent] = useState<string>(
    initialData?.templateData?.signatureContent ?? ""
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const hasLoadedTemplates = templatesData !== undefined;
  const hasInvalidTemplate = Boolean(selectedTemplateId && hasLoadedTemplates && !selectedTemplate);

  // Handle signature selection
  const handleSignatureChange = useCallback(
    (newSignatureId: string | null, content: string) => {
      setSignatureId(newSignatureId ?? undefined);
      setSignatureContent(content);
    },
    []
  );

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      startTransition(() => {
        setSubmitError(null);
        setRecipientEmail(initialData?.recipientEmail ?? defaultRecipient?.email ?? "");
        setRecipientName(initialData?.recipientName ?? defaultRecipient?.name ?? "");
        setSubject(initialData?.subject ?? defaultTemplate?.subject ?? "");
        setTemplateType(
          initialData?.templateType ??
            defaultTemplate?.templateType ??
            "custom"
        );
        setBodyOverride(
          initialData?.templateData?.bodyOverride ??
            defaultTemplate?.body ??
            ""
        );
        setScheduledAt(initialData?.scheduledAt ?? addHours(new Date(), 1));
        setTimezone(initialData?.timezone ?? getLocalTimezone());
        setSelectedTemplateId(
          initialData?.templateData?.templateId ?? defaultTemplate?.templateId
        );
        setSignatureId(initialData?.templateData?.signatureId);
        setSignatureContent(initialData?.templateData?.signatureContent ?? "");
      });
    }
  }, [open, initialData, defaultRecipient, defaultTemplate]);

  const submitScheduledEmail = useCallback(() => {
    if (!scheduledAt) {
      throw new Error("Please select a date and time");
    }
    if (hasInvalidTemplate) {
      throw new Error("The selected saved template is no longer available. Choose another template or detach it before saving.");
    }

    const templateData: Record<string, unknown> = {};
    if (selectedTemplateId) {
      templateData.templateId = selectedTemplateId;
      if (selectedTemplate?.version) {
        templateData.templateVersion = selectedTemplate.version;
      }
    }
    if (templateType === "custom" && bodyOverride) {
      templateData.bodyOverride = bodyOverride;
    }
    if (selectedTemplate) {
      templateData.previewText = `Saved template: ${selectedTemplate.name}`;
    } else if (bodyOverride) {
      templateData.previewText = bodyOverride.replace(/<[^>]+>/g, "").trim().slice(0, 160);
    }
    if (signatureId) {
      templateData.signatureId = signatureId;
      templateData.signatureContent = signatureContent;
    }

    const payload = {
      recipientEmail,
      recipientName: recipientName || undefined,
      customerId: defaultRecipient?.customerId ?? defaultCustomerId,
      subject,
      templateType,
      templateData: Object.keys(templateData).length > 0 ? (templateData as Record<string, JsonValue>) : undefined,
      scheduledAt,
      timezone,
    };

    if (isEditing && initialData?.id) {
      return updateEmailMutation.mutateAsync({
        id: initialData.id,
        ...payload,
      });
    }

    return scheduleEmailMutation.mutateAsync(payload);
  }, [
    scheduledAt,
    templateType,
    bodyOverride,
    selectedTemplateId,
    selectedTemplate,
    hasInvalidTemplate,
    signatureId,
    signatureContent,
    recipientEmail,
    recipientName,
    subject,
    timezone,
    defaultRecipient?.customerId,
    defaultCustomerId,
    isEditing,
    initialData,
    updateEmailMutation,
    scheduleEmailMutation,
  ]);

  const isInitialDataBlocked = Boolean(isLoadingInitialData || initialDataError);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (isInitialDataBlocked) {
        return;
      }

      // Basic validation
      if (!recipientEmail.trim()) {
        toast.error("Recipient email is required");
        return;
      }
      if (!subject.trim()) {
        toast.error("Subject is required");
        return;
      }
      if (!scheduledAt) {
        toast.error("Please select a date and time");
        return;
      }
      if (scheduledAt <= new Date()) {
        toast.error("Scheduled time must be in the future");
        return;
      }

      setSubmitError(null);
      try {
        Promise.resolve(submitScheduledEmail())
          .then(() => {
            toast.success(isEditing ? "Email updated" : "Email scheduled", {
              description: isEditing
                ? "The scheduled email has been updated."
                : "Your email has been scheduled for delivery.",
            });
            onOpenChange(false);
            onSuccess?.();
          })
          .catch((error) => {
            setSubmitError(getUserFriendlyMessage(error as Error));
          });
      } catch (error) {
        setSubmitError(getUserFriendlyMessage(error as Error));
      }
    },
    [
      recipientEmail,
      subject,
      scheduledAt,
      isInitialDataBlocked,
      submitScheduledEmail,
      isEditing,
      onOpenChange,
      onSuccess,
    ]
  );

  const isSubmitting =
    scheduleEmailMutation.isPending || updateEmailMutation.isPending;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isSubmitting);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isSubmitting, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-[600px]"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isEditing ? "Edit Scheduled Email" : "Schedule Email"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the scheduled email details."
                : "Schedule an email to be sent at a specific time."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {isLoadingInitialData ? (
              <Alert>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                <AlertDescription className="inline">
                  Loading scheduled email details...
                </AlertDescription>
              </Alert>
            ) : null}

            {initialDataError ? (
              <Alert variant="destructive">
                <AlertDescription>{getUserFriendlyMessage(initialDataError)}</AlertDescription>
              </Alert>
            ) : null}

            {/* Recipient */}
            <div className="grid gap-2">
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="email@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                disabled={isSubmitting || isInitialDataBlocked}
                aria-required="true"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="recipient-name">Recipient Name (optional)</Label>
              <Input
                id="recipient-name"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={isSubmitting || isInitialDataBlocked}
              />
            </div>

            <Separator />

            {/* Email Content */}
            <div className="grid gap-2">
              <Label htmlFor="template-type">Fallback Template</Label>
              <Select
                value={templateType}
                onValueChange={(v) => setTemplateType(v as TemplateType)}
                disabled={isSubmitting || isInitialDataBlocked}
              >
                <SelectTrigger id="template-type">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used when no saved template is attached.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="saved-template">Saved Template</Label>
              <Select
                value={selectedTemplateId ?? "__none__"}
                onValueChange={(value) => {
                  const nextTemplateId = value === "__none__" ? undefined : value;
                  const nextTemplate = templates.find((template) => template.id === nextTemplateId);
                  setSubmitError(null);
                  setSelectedTemplateId(nextTemplateId);
                  if (nextTemplate) {
                    setSubject(nextTemplate.subject);
                    setBodyOverride("");
                  } else if (templateType === "custom") {
                    setBodyOverride("");
                  }
                }}
                disabled={isSubmitting || isInitialDataBlocked}
              >
                <SelectTrigger id="saved-template">
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
                Saved templates render through the shared outbound pipeline and stay consistent with preview and delivery.
              </p>
            </div>

            {hasInvalidTemplate && (
              <Alert variant="destructive">
                <AlertDescription>
                  This saved template is no longer available. Choose another template or detach it before saving.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={isSubmitting || isInitialDataBlocked}
                aria-required="true"
              />
            </div>

            {templateType === "custom" && !selectedTemplateId && (
              <div className="grid gap-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  placeholder="Write your email content here..."
                  value={bodyOverride}
                  onChange={(e) => setBodyOverride(e.target.value)}
                  rows={4}
                  disabled={isSubmitting || isInitialDataBlocked}
                />
              </div>
            )}

            {selectedTemplateId && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div>
                  Template source: <span className="font-medium">{selectedTemplate?.name ?? "Unavailable saved template"}</span>
                </div>
                <div>
                  Subject source: <span className="font-medium">{subject || selectedTemplate?.subject || "Unset"}</span>
                </div>
                <div>
                  Signature: <span className="font-medium">{signatureId ? "Attached" : "None"}</span>
                </div>
              </div>
            )}

            {/* Signature Selection */}
            <div className="grid gap-2">
              <Label>Email Signature</Label>
              <SignatureSelector
                value={signatureId}
                onChange={handleSignatureChange}
                onCreateNew={onCreateSignature}
              />
            </div>

            <Separator />

            {/* Schedule */}
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Schedule Send</Label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="schedule-date" className="text-sm text-muted-foreground">
                    Date & Time
                  </Label>
                  <DateTimePicker
                    id="schedule-date"
                    value={scheduledAt}
                    onChange={setScheduledAt}
                    minDate={new Date()}
                    disabled={isSubmitting || isInitialDataBlocked}
                    aria-label="Select send date and time"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timezone" className="text-sm text-muted-foreground">
                    Timezone
                  </Label>
                  <TimezoneSelect
                    id="timezone"
                    value={timezone}
                    onChange={setTimezone}
                    disabled={isSubmitting || isInitialDataBlocked}
                    aria-label="Select timezone"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isInitialDataBlocked}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Scheduling..."}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Email" : "Schedule Email"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
