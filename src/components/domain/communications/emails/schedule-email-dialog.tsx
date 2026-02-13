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
  defaultRecipient,
  defaultCustomerId,
  defaultTemplate,
  onCreateSignature,
  onSuccess,
}: ScheduleEmailDialogProps) {
  const scheduleEmailMutation = useScheduleEmail();
  const updateEmailMutation = useUpdateScheduledEmail();
  const isEditing = !!initialData?.id;

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
  const [signatureContent, setSignatureContent] = useState<string>(
    initialData?.templateData?.signatureContent ?? ""
  );

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
        setSignatureId(initialData?.templateData?.signatureId);
        setSignatureContent(initialData?.templateData?.signatureContent ?? "");
      });
    }
  }, [open, initialData, defaultRecipient, defaultTemplate]);

  const submitScheduledEmail = useCallback(() => {
    if (!scheduledAt) {
      throw new Error("Please select a date and time");
    }

    const templateData: Record<string, unknown> = {};
    if (templateType === "custom" && bodyOverride) {
      templateData.bodyOverride = bodyOverride;
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
      updateEmailMutation.mutate(
        {
          id: initialData.id,
          ...payload,
        },
        {
          onSuccess: () => {
            toast.success("Email updated", {
              description: "The scheduled email has been updated.",
            });
            onOpenChange(false);
            onSuccess?.();
          },
          onError: (error) => {
            toast.error("Failed to update email", {
              description: getUserFriendlyMessage(error as Error),
            });
          },
        }
      );
      return;
    }

    scheduleEmailMutation.mutate(
      payload,
      {
        onSuccess: () => {
          toast.success("Email scheduled", {
            description: "Your email has been scheduled for delivery.",
          });
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Failed to schedule email", {
            description: getUserFriendlyMessage(error as Error),
          });
        },
      }
    );
  }, [
    scheduledAt,
    templateType,
    bodyOverride,
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
    onOpenChange,
    onSuccess,
    updateEmailMutation,
    scheduleEmailMutation,
  ]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

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

      try {
        submitScheduledEmail();
      } catch (error) {
        toast.error(isEditing ? "Failed to update email" : "Failed to schedule email", {
          description: getUserFriendlyMessage(error as Error),
        });
      }
    },
    [
      recipientEmail,
      subject,
      scheduledAt,
      submitScheduledEmail,
      isEditing,
    ]
  );

  const isSubmitting =
    scheduleEmailMutation.isPending || updateEmailMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>

            <Separator />

            {/* Email Content */}
            <div className="grid gap-2">
              <Label htmlFor="template-type">Template</Label>
              <Select
                value={templateType}
                onValueChange={(v) => setTemplateType(v as TemplateType)}
                disabled={isSubmitting}
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={isSubmitting}
                aria-required="true"
              />
            </div>

            {templateType === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  placeholder="Write your email content here..."
                  value={bodyOverride}
                  onChange={(e) => setBodyOverride(e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                />
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
            <Button type="submit" disabled={isSubmitting}>
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
