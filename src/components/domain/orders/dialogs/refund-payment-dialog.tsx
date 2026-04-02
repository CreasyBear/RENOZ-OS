import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { FormDialog, NumberField, TextareaField } from "@/components/shared/forms";
import { FormatAmount } from "@/components/shared/format";
import {
  createRefundPaymentFormSchema,
  type RefundPaymentFormValues,
} from "@/lib/schemas/orders/order-payments";

export interface RefundPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  originalPaymentAmount: number;
  refundableAmount: number;
  onSubmit: (data: { amount: number; notes: string | null }) => Promise<void>;
  isSubmitting?: boolean;
}

export function RefundPaymentDialog({
  open,
  onOpenChange,
  orderNumber,
  originalPaymentAmount,
  refundableAmount,
  onSubmit,
  isSubmitting = false,
}: RefundPaymentDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const refundFormSchema = useMemo(
    () => createRefundPaymentFormSchema(refundableAmount),
    [refundableAmount]
  );

  const form = useTanStackForm<RefundPaymentFormValues>({
    schema: refundFormSchema,
    defaultValues: {
      amount: refundableAmount > 0 ? refundableAmount : 0,
      notes: "",
    },
    onSubmit: async (values) => {
      try {
        setError(null);
        await onSubmit({
          amount: values.amount,
          notes: values.notes || null,
        });
        form.reset();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record refund");
      }
    },
    onSubmitInvalid: () => {
      setError("Please fix the errors below and try again");
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isSubmitting) return;
      setError(null);
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Record Refund
        </span>
      }
      description={`Record a refund for order ${orderNumber}`}
      form={form}
      submitLabel="Record Refund"
      submitError={error}
      submitDisabled={isSubmitting || refundableAmount <= 0}
      size="md"
      className="sm:max-w-[500px]"
      resetOnClose={false}
    >
      <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Original Payment</span>
          <span className="font-medium">
            <FormatAmount amount={originalPaymentAmount} />
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Refundable Balance</span>
          <span className="font-semibold text-destructive">
            <FormatAmount amount={refundableAmount} />
          </span>
        </div>
      </div>

      <form.Field name="amount">
        {(field) => (
          <NumberField
            field={field}
            label="Refund Amount"
            placeholder="0.00"
            min={0}
            step={0.01}
            required
            disabled={isSubmitting || refundableAmount <= 0}
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <TextareaField
            field={field}
            label="Notes"
            placeholder="Optional refund notes"
            rows={4}
            disabled={isSubmitting}
          />
        )}
      </form.Field>
    </FormDialog>
  );
}

export default RefundPaymentDialog;
