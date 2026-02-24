/**
 * Schedule Call Dialog
 *
 * Dialog for scheduling follow-up calls with customers.
 * Supports setting date/time, assignee, purpose, and notes.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import { DateTimePicker } from "../date-time-picker";

import { useScheduleCall } from "@/hooks/communications/use-scheduled-calls";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import {
  scheduleCallFormSchema,
  type ScheduleCallDialogProps,
  type ScheduleCallFormValues,
} from "@/lib/schemas/communications";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  SelectField,
  TextareaField,
  SwitchField,
  FormField,
  FormDialog,
  extractFieldError,
} from "@/components/shared/forms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// CONSTANTS
// ============================================================================

const PURPOSE_OPTIONS = [
  { value: "quote_follow_up", label: "Quote Follow-up" },
  { value: "installation", label: "Installation Coordination" },
  { value: "technical_support", label: "Technical Support" },
  { value: "sales", label: "Sales Call" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
] as const;

const REMINDER_OPTIONS = [
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleCallDialog({
  customerId,
  customerName,
  assigneeId,
  trigger,
  defaultOpen = false,
  onOpenChange,
  onSuccess,
}: ScheduleCallDialogProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const scheduleMutation = useScheduleCall();

  const form = useTanStackForm<ScheduleCallFormValues>({
    schema: scheduleCallFormSchema,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    defaultValues: {
      scheduledAt: new Date(),
      purpose: "general",
      notes: "",
      enableReminder: true,
      reminderMinutes: 15,
    },
    onSubmit: async (values) => {
      const reminderAt = values.enableReminder
        ? new Date(
            values.scheduledAt.getTime() -
              values.reminderMinutes * 60 * 1000
          )
        : undefined;

      scheduleMutation.mutate(
        {
          customerId,
          assigneeId,
          scheduledAt: values.scheduledAt,
          reminderAt,
          purpose: values.purpose,
          notes: values.notes,
        },
        {
          onSuccess: (data) => {
            toast.success("Call scheduled successfully");
            handleOpenChange(false);
            onSuccess?.(data.id);
          },
          onError: (error) => {
            toast.error("Failed to schedule call", {
              description: getUserFriendlyMessage(error as Error),
            });
          },
        }
      );
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const enableReminder = form.useWatch("enableReminder");

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Schedule Call
        </div>
      }
      description={
        customerName
          ? (
              <>
                Schedule a follow-up call with{" "}
                <Link
                  to="/customers/$customerId"
                  params={{ customerId }}
                  search={{}}
                  className="font-medium hover:underline text-primary"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {customerName}
                </Link>
                .
              </>
            )
          : "Schedule a follow-up call with this customer."
      }
      form={form}
      submitLabel="Schedule Call"
      cancelLabel="Cancel"
      loadingLabel="Scheduling..."
      submitError={scheduleMutation.error?.message ?? null}
      submitDisabled={scheduleMutation.isPending}
      className="sm:max-w-[500px]"
    >
      <form.Field name="scheduledAt">
            {(field) => {
              const error = extractFieldError(field);
              return (
                <FormField
                  label="Date & Time"
                  name={field.name}
                  error={error}
                  required
                >
                  <DateTimePicker
                    value={field.state.value ?? undefined}
                    onChange={(date) =>
                      field.handleChange(date ?? field.state.value ?? new Date())
                    }
                    aria-label="schedule-call-datetime"
                  />
                </FormField>
              );
            }}
          </form.Field>

          <form.Field name="purpose">
            {(field) => (
              <SelectField
                field={field}
                label="Call Purpose"
                options={PURPOSE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                placeholder="Select purpose"
                required
              />
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <TextareaField
                field={field}
                label="Notes (Optional)"
                placeholder="Add any notes or context for this call..."
                rows={4}
                className="min-h-[80px] resize-none"
              />
            )}
          </form.Field>

          <form.Field name="enableReminder">
            {(field) => (
              <SwitchField
                field={field}
                label="Reminder"
                description="Get notified before the scheduled call"
                className="flex flex-row items-center justify-between rounded-lg border p-3"
              />
            )}
          </form.Field>

          {enableReminder && (
            <form.Field name="reminderMinutes">
              {(field) => {
                const error = extractFieldError(field);
                return (
                  <FormField
                    label="Reminder Time"
                    name={field.name}
                    error={error}
                  >
                    <Select
                      value={String(field.state.value ?? 15)}
                      onValueChange={(v) => field.handleChange(parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reminder time" />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                );
              }}
            </form.Field>
          )}
    </FormDialog>
  );
}
