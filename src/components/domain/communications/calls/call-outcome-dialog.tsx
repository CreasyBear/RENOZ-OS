/**
 * Call Outcome Dialog
 *
 * Dialog for logging the outcome of a completed call.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle,
  Phone,
  PhoneOff,
  Voicemail,
  PhoneMissed,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { useCompleteCall } from "@/hooks/communications/use-scheduled-calls";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import {
  callOutcomeFormSchema,
  type CallOutcomeDialogProps,
  type CallOutcomeFormValues,
} from "@/lib/schemas/communications";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  TextareaField,
  FormField,
  FormDialog,
  extractFieldError,
} from "@/components/shared/forms";

// Export type for consumers (backward compatibility)
export type CallOutcomeFormData = CallOutcomeFormValues;

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
  customerId,
  customerName,
  trigger,
  defaultOpen = false,
  onOpenChange,
  onSuccess,
}: CallOutcomeDialogProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const completeMutation = useCompleteCall();

  const form = useTanStackForm<CallOutcomeFormValues>({
    schema: callOutcomeFormSchema,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    defaultValues: {
      outcome: "completed_successfully",
      outcomeNotes: "",
    },
    onSubmit: async (values) => {
      completeMutation.mutate(
        {
          id: callId,
          outcome: values.outcome,
          outcomeNotes: values.outcomeNotes,
        },
        {
          onSuccess: () => {
            toast.success("Call outcome logged successfully");
            handleOpenChange(false);
            onSuccess?.();
          },
          onError: (error) => {
            toast.error("Failed to log call outcome", {
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

  const selectedOutcome = form.useWatch("outcome");

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Log Call Outcome
        </div>
      }
      description={
        customerName
          ? (
              <>
                Record the outcome of your call with{" "}
                {customerId ? (
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId }}
                    search={{}}
                    className="font-medium hover:underline text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {customerName}
                  </Link>
                ) : (
                  customerName
                )}
                .
              </>
            )
          : "Record the outcome of this call."
      }
      form={form}
      submitLabel="Log Outcome"
      cancelLabel="Cancel"
      loadingLabel="Saving..."
      submitError={completeMutation.error?.message ?? null}
      submitDisabled={completeMutation.isPending}
      className="sm:max-w-[500px]"
    >
      <form.Field name="outcome">
            {(field) => {
              const error = extractFieldError(field);
              return (
                <FormField
                  label="Call Outcome"
                  name={field.name}
                  error={error}
                  required
                >
                  <RadioGroup
                    value={field.state.value ?? ""}
                    onValueChange={(v) =>
                      form.setFieldValue("outcome", v as CallOutcomeFormValues["outcome"])
                    }
                    onBlur={field.handleBlur}
                    className="grid grid-cols-1 gap-2"
                    aria-invalid={!!error}
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
                </FormField>
              );
            }}
          </form.Field>

          <form.Field name="outcomeNotes">
            {(field) => (
              <TextareaField
                field={field}
                label="Notes (Optional)"
                placeholder="Add any notes about the call..."
                rows={4}
                className="min-h-[80px] resize-none"
              />
            )}
          </form.Field>
    </FormDialog>
  );
}
