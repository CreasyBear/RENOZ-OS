/**
 * Call Outcome Dialog
 *
 * Dialog for logging the outcome of a completed call.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Loader2,
  Phone,
  PhoneOff,
  Voicemail,
  PhoneMissed,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { completeCall } from "@/lib/server/scheduled-calls";
import { toast } from "sonner";

// ============================================================================
// SCHEMA
// ============================================================================

const callOutcomeSchema = z.object({
  outcome: z.enum([
    "answered",
    "no_answer",
    "voicemail",
    "busy",
    "wrong_number",
    "callback_requested",
    "completed_successfully",
  ]),
  outcomeNotes: z.string().optional(),
});

type CallOutcomeFormValues = z.infer<typeof callOutcomeSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface CallOutcomeDialogProps {
  callId: string;
  customerName?: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OUTCOME_OPTIONS = [
  {
    value: "completed_successfully",
    label: "Completed Successfully",
    icon: CheckCircle,
    description: "Call completed as planned",
  },
  {
    value: "answered",
    label: "Answered",
    icon: Phone,
    description: "Customer answered but call was brief",
  },
  {
    value: "callback_requested",
    label: "Callback Requested",
    icon: PhoneCall,
    description: "Customer requested a callback",
  },
  {
    value: "voicemail",
    label: "Left Voicemail",
    icon: Voicemail,
    description: "Left a voicemail message",
  },
  {
    value: "no_answer",
    label: "No Answer",
    icon: PhoneMissed,
    description: "Customer did not answer",
  },
  {
    value: "busy",
    label: "Busy",
    icon: PhoneOff,
    description: "Line was busy",
  },
  {
    value: "wrong_number",
    label: "Wrong Number",
    icon: AlertTriangle,
    description: "Number is incorrect or disconnected",
  },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function CallOutcomeDialog({
  callId,
  customerName,
  trigger,
  defaultOpen = false,
  onOpenChange,
  onSuccess,
}: CallOutcomeDialogProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const queryClient = useQueryClient();

  const form = useForm<CallOutcomeFormValues>({
    resolver: zodResolver(callOutcomeSchema),
    defaultValues: {
      outcome: "completed_successfully",
      outcomeNotes: "",
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (values: CallOutcomeFormValues) => {
      return completeCall({
        data: {
          id: callId,
          outcome: values.outcome,
          outcomeNotes: values.outcomeNotes,
        },
      });
    },
    onSuccess: () => {
      toast.success("Call outcome logged successfully");
      queryClient.invalidateQueries({ queryKey: ["scheduled-calls"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-calls"] });
      queryClient.invalidateQueries({ queryKey: ["customer-activities"] });
      handleOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to log call outcome"
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

  const onSubmit = (values: CallOutcomeFormValues) => {
    completeMutation.mutate(values);
  };

  const selectedOutcome = form.watch("outcome");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        className="sm:max-w-[500px]"
        aria-labelledby="outcome-dialog-title"
        aria-describedby="outcome-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="outcome-dialog-title">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Log Call Outcome
            </div>
          </DialogTitle>
          <DialogDescription id="outcome-dialog-description">
            {customerName
              ? `Record the outcome of your call with ${customerName}.`
              : "Record the outcome of this call."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="outcome-dialog"
          >
            {/* Outcome Selection */}
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call Outcome</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 gap-2"
                    >
                      {OUTCOME_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = selectedOutcome === option.value;

                        return (
                          <Label
                            key={option.value}
                            htmlFor={option.value}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              className="sr-only"
                            />
                            <Icon
                              className={cn(
                                "h-5 w-5 flex-shrink-0",
                                isSelected
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                            <div className="flex-1">
                              <div
                                className={cn(
                                  "font-medium",
                                  isSelected && "text-primary"
                                )}
                              >
                                {option.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="outcomeNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about the call..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={completeMutation.isPending}
                className="gap-2"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Log Outcome
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
