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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Loader2, CalendarClock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DateTimePicker } from "../date-time-picker";

import { useScheduleCall } from "@/hooks/communications/use-scheduled-calls";
import { toast } from "sonner";

// ============================================================================
// SCHEMA
// ============================================================================

const scheduleCallFormSchema = z.object({
  scheduledAt: z.date({ message: "Please select a date and time" }),
  purpose: z.enum([
    "quote_follow_up",
    "installation",
    "technical_support",
    "sales",
    "general",
    "other",
  ]),
  notes: z.string().optional(),
  enableReminder: z.boolean(),
  reminderMinutes: z.number(),
});

type ScheduleCallFormValues = z.infer<typeof scheduleCallFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleCallDialogProps {
  customerId: string;
  customerName?: string;
  assigneeId?: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (callId: string) => void;
}

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

  const form = useForm<ScheduleCallFormValues>({
    resolver: zodResolver(scheduleCallFormSchema),
    defaultValues: {
      purpose: "general",
      notes: "",
      enableReminder: true,
      reminderMinutes: 15,
    },
  });

  const handleSchedule = (values: ScheduleCallFormValues) => {
    const reminderAt = values.enableReminder
      ? new Date(values.scheduledAt.getTime() - values.reminderMinutes * 60 * 1000)
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
          form.reset();
          const callData = data as { id: string };
          onSuccess?.(callData.id);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to schedule call"
          );
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const onSubmit = (values: ScheduleCallFormValues) => {
    handleSchedule(values);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        className="sm:max-w-[500px]"
        aria-labelledby="schedule-call-title"
        aria-describedby="schedule-call-description"
      >
        <DialogHeader>
          <DialogTitle id="schedule-call-title">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Schedule Call
            </div>
          </DialogTitle>
          <DialogDescription id="schedule-call-description">
            {customerName
              ? `Schedule a follow-up call with ${customerName}.`
              : "Schedule a follow-up call with this customer."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="call-form"
          >
            {/* Date/Time */}
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value ?? undefined}
                      onChange={(date) => field.onChange(date ?? null)}
                      aria-label="schedule-call-datetime"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Purpose */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call Purpose</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes or context for this call..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reminder Toggle */}
            <FormField
              control={form.control}
              name="enableReminder"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Reminder</FormLabel>
                    <FormDescription>
                      Get notified before the scheduled call
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Enable reminder"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Reminder Time */}
            {form.watch("enableReminder") && (
              <FormField
                control={form.control}
                name="reminderMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Time</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reminder time" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                className="gap-2"
              >
                {scheduleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Schedule Call
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
