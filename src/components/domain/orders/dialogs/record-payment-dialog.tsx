/**
 * Record Payment Dialog
 *
 * Dialog for recording new payments against an order.
 * Uses TanStack Form for form handling per FORM-STANDARDS.md.
 *
 * @see docs/design-system/FORM-STANDARDS.md
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json
 */

import { useState, useMemo, useEffect } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  FormDialog,
  NumberField,
  SelectField,
  TextField,
  TextareaField,
  DateStringField,
} from "@/components/shared/forms";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormatAmount } from "@/components/shared/format";
import { CreditCard } from "lucide-react";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  createRecordPaymentFormSchema,
  type PaymentMethod,
  type RecordPaymentFormValues,
} from "@/lib/schemas/orders/order-payments";

// ============================================================================
// TYPES
// ============================================================================

export interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  balanceDue: number;
  currency?: string;
  onSubmit: (data: {
    orderId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    reference: string | null;
    notes: string | null;
    isRefund: boolean;
    relatedPaymentId: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RecordPaymentDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  balanceDue,
  onSubmit,
  isSubmitting = false,
}: RecordPaymentDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isFullPayment, setIsFullPayment] = useState(balanceDue > 0);

  // Get today's date in YYYY-MM-DD format
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const paymentFormSchema = useMemo(
    () => createRecordPaymentFormSchema(balanceDue),
    [balanceDue]
  );

  const form = useTanStackForm<RecordPaymentFormValues>({
    schema: paymentFormSchema,
    defaultValues: {
      amount: balanceDue > 0 ? balanceDue : 0,
      paymentMethod: "bank_transfer" as PaymentMethod,
      paymentDate: today,
      reference: "",
      notes: "",
    },
    onSubmit: async (values) => {
      try {
        setError(null);

        await onSubmit({
          orderId,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          paymentDate: values.paymentDate,
          reference: values.reference || null,
          notes: values.notes || null,
          isRefund: false,
          relatedPaymentId: null,
        });

        form.reset();
        onOpenChange(false);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to record payment");
        }
      }
    },
    onSubmitInvalid: () => {
      setError("Please fix the errors below and try again");
    },
  });

  useEffect(() => {
    if (open && balanceDue > 0 && isFullPayment) {
      form.setFieldValue("amount", balanceDue);
    }
  }, [balanceDue, form, isFullPayment, open]);

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    form.reset();
    onOpenChange(false);
  };

  const amount = form.state.values.amount ?? 0;
  const remainingAfterPayment = Math.max(0, balanceDue - amount);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (isSubmitting) return;
      handleClose();
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Record Payment
        </span>
      }
      description={`Record a payment for order ${orderNumber}`}
      form={form}
      submitLabel="Record Payment"
      submitError={error}
      submitDisabled={isSubmitting}
      size="md"
      className="sm:max-w-[500px]"
      resetOnClose={false}
    >
      {/* Balance Info */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance Due</span>
            <span className="font-semibold">
              <FormatAmount amount={balanceDue} />
            </span>
          </div>
          {amount > 0 && (
            <>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-muted-foreground">This Payment</span>
                <span className="text-green-600 font-medium">
                  -<FormatAmount amount={amount} />
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  Remaining After
                </span>
                <span
                  className={`font-semibold ${
                    remainingAfterPayment === 0 ? "text-green-600" : ""
                  }`}
                >
                  <FormatAmount amount={remainingAfterPayment} />
                </span>
              </div>
            </>
          )}
        </div>

      {/* Pay full balance */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="full-payment"
          checked={isFullPayment}
          onCheckedChange={(checked) => {
            const next = checked === true;
            setIsFullPayment(next);
            if (next) {
              form.setFieldValue("amount", balanceDue);
            }
          }}
          disabled={isSubmitting}
        />
        <Label htmlFor="full-payment">Pay full balance</Label>
      </div>

      {/* Amount Field */}
      <form.Field
        name="amount"
        validators={{
          onChange: ({ value }) => {
            if (value <= 0) return "Amount must be greater than 0";
            if (value > balanceDue) {
              return `Amount cannot exceed balance due ($${balanceDue.toFixed(2)})`;
            }
            return undefined;
          },
        }}
      >
        {(field) => (
          <NumberField
            field={field}
            label="Payment Amount"
            min={0.01}
            max={balanceDue}
            step={0.01}
            prefix="$"
            required
            disabled={isSubmitting || isFullPayment}
          />
        )}
      </form.Field>

      {/* Payment Method Field */}
      <form.Field
        name="paymentMethod"
        validators={{
          onChange: ({ value }) =>
            value ? undefined : "Payment method is required",
        }}
      >
        {(field) => (
          <SelectField
            field={field}
            label="Payment Method"
            placeholder="Select payment method..."
            options={PAYMENT_METHODS.map((method) => ({
              value: method,
              label: PAYMENT_METHOD_LABELS[method],
            }))}
            required
            disabled={isSubmitting}
          />
        )}
      </form.Field>

      {/* Payment Date Field */}
      <form.Field
        name="paymentDate"
        validators={{
          onChange: ({ value }) =>
            value ? undefined : "Payment date is required",
        }}
      >
        {(field) => (
          <DateStringField
            field={field}
            label="Payment Date"
            required
            disabled={isSubmitting}
          />
        )}
      </form.Field>

      {/* Reference Field */}
      <form.Field name="reference">
        {(field) => (
          <TextField
            field={field}
            label="Reference (Optional)"
            placeholder="e.g., Bank transfer reference, cheque number"
            description="Transaction ID, cheque number, or other reference"
            disabled={isSubmitting}
          />
        )}
      </form.Field>

      {/* Notes Field */}
      <form.Field name="notes">
        {(field) => (
          <TextareaField
            field={field}
            label="Notes (Optional)"
            placeholder="Additional notes about this payment..."
            rows={3}
            disabled={isSubmitting}
          />
        )}
      </form.Field>
    </FormDialog>
  );
}

export default RecordPaymentDialog;
