/**
 * Add Suppression Dialog Component
 *
 * Dialog for manually adding emails to the suppression list.
 *
 * @see INT-RES-005
 */

import { memo } from "react";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import { useAddSuppression } from "@/hooks/communications/use-email-suppression";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  TextField,
  SelectField,
  TextareaField,
  FormDialog,
} from "@/components/shared/forms";

// ============================================================================
// SCHEMA
// ============================================================================

import {
  addSuppressionFormSchema,
  type AddSuppressionDialogProps,
  type AddSuppressionFormValues,
} from "@/lib/schemas/communications";

type FormValues = AddSuppressionFormValues;

const REASON_OPTIONS = [
  { value: "manual", label: "Manual Suppression" },
  { value: "bounce", label: "Bounce" },
  { value: "complaint", label: "Complaint" },
  { value: "unsubscribe", label: "Unsubscribe" },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export const AddSuppressionDialog = memo(function AddSuppressionDialog({
  open,
  onOpenChange,
}: AddSuppressionDialogProps) {
  const addMutation = useAddSuppression();

  const form = useTanStackForm<FormValues>({
    schema: addSuppressionFormSchema,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    defaultValues: {
      email: "",
      reason: "manual",
      notes: "",
    },
    onSubmit: async (values) => {
      try {
        await addMutation.mutateAsync({
          email: values.email,
          reason: values.reason,
          source: "manual",
          metadata: values.notes ? { notes: values.notes } : undefined,
        });
        toast.success("Email added to suppression list");
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error("Failed to add to suppression list", {
          description: getUserFriendlyMessage(error as Error),
        });
      }
    },
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add to Suppression List"
      description="Manually add an email address to prevent sending emails to it."
      form={form}
      submitLabel="Add to List"
      submitError={addMutation.error?.message ?? null}
      size="md"
      className="sm:max-w-[425px]"
    >
      <form.Field name="email">
        {(field) => (
          <TextField
            field={field}
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            required
          />
        )}
      </form.Field>

      <form.Field name="reason">
        {(field) => (
          <SelectField
            field={field}
            label="Reason"
            options={REASON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select reason"
            required
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <TextareaField
            field={field}
            label="Notes (optional)"
            placeholder="Reason for suppression..."
            rows={3}
          />
        )}
      </form.Field>
    </FormDialog>
  );
});
