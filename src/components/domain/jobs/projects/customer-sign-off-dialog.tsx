/**
 * Customer Sign-off Dialog Component
 *
 * Dialog for capturing customer sign-off, rating, and feedback
 * for completed site visits.
 *
 * Story 027: Customer Sign-off
 *
 * @path src/components/domain/jobs/projects/customer-sign-off-dialog.tsx
 */

import { useState } from "react";
import { CheckCircle, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomerSignOff } from "@/hooks/jobs";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  customerSignOffFormSchema,
  type CustomerSignOffFormData,
} from "@/lib/schemas/jobs/site-visits";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  TextField,
  CheckboxField,
  TextareaField,
  FormField,
  FormActions,
  extractFieldError,
} from "@/components/shared/forms";

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerSignOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteVisitId: string;
  visitNumber: string;
  /** Callback after successful sign-off */
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerSignOffDialog({
  open,
  onOpenChange,
  siteVisitId,
  visitNumber,
  onSuccess,
}: CustomerSignOffDialogProps) {
  const signOff = useCustomerSignOff();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const form = useTanStackForm<CustomerSignOffFormData>({
    schema: customerSignOffFormSchema,
    defaultValues: {
      customerName: "",
      confirmed: false,
      customerRating: undefined,
      customerFeedback: "",
    },
    onSubmit: async (values) => {
      try {
        await signOff.mutateAsync({
          siteVisitId,
          customerName: values.customerName,
          customerRating: values.customerRating,
          customerFeedback: values.customerFeedback,
        });

        toast.success("Customer sign-off recorded successfully");
        form.reset();
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to record sign-off: ${message}`);
      }
    },
  });

  const selectedRating = form.useWatch("customerRating");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Customer Sign-off
          </DialogTitle>
          <DialogDescription>
            Record customer confirmation for site visit {visitNumber}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <form.Field name="customerName">
            {(field) => (
              <TextField
                field={field}
                label="Customer Name"
                placeholder="Enter customer name"
                required
              />
            )}
          </form.Field>

          <form.Field name="confirmed">
            {(field) => (
              <CheckboxField
                field={field}
                label="Customer confirmed work completed satisfactorily"
                description="The customer has reviewed the work and confirms it meets their expectations."
                required
                className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
              />
            )}
          </form.Field>

          <form.Field name="customerRating">
            {(field) => {
              const error = extractFieldError(field);
              return (
                <FormField
                  label="Customer Rating (Optional)"
                  name={field.name}
                  error={error}
                  description="How would the customer rate the service?"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className={cn(
                          "p-1 transition-colors",
                          (hoveredRating !== null
                            ? rating <= hoveredRating
                            : rating <= (selectedRating || 0))
                            ? "text-yellow-400"
                            : "text-gray-300"
                        )}
                        onMouseEnter={() => setHoveredRating(rating)}
                        onMouseLeave={() => setHoveredRating(null)}
                        onClick={() => field.handleChange(rating)}
                      >
                        <Star className="h-8 w-8 fill-current" />
                      </button>
                    ))}
                  </div>
                </FormField>
              );
            }}
          </form.Field>

          <form.Field name="customerFeedback">
            {(field) => (
              <TextareaField
                field={field}
                label="Customer Feedback (Optional)"
                placeholder="Enter any additional feedback from the customer..."
                rows={5}
                className="min-h-[100px]"
              />
            )}
          </form.Field>

          <DialogFooter>
            <FormActions
              form={form}
              submitLabel="Record Sign-off"
              cancelLabel="Cancel"
              loadingLabel="Recording..."
              onCancel={() => onOpenChange(false)}
              submitDisabled={signOff.isPending}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
