/**
 * Record Payment Dialog
 *
 * Dialog for recording new payments against an order.
 * Uses TanStack Form for form handling per FORM-STANDARDS.md.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json
 */

import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { FormatAmount } from "@/components/shared/format";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
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
// VALIDATION SCHEMA
// ============================================================================

const paymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

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

  const form = useForm({
    defaultValues: {
      amount: balanceDue > 0 ? balanceDue : 0,
      paymentMethod: "bank_transfer" as PaymentMethod,
      paymentDate: today,
      reference: "",
      notes: "",
    } as PaymentFormValues,
    onSubmit: async ({ value }) => {
      try {
        setError(null);

        // Validate
        await paymentSchema.parseAsync(value);

        // Additional validation
        if (value.amount > balanceDue) {
          setError(
            `Payment amount cannot exceed balance due (${balanceDue.toFixed(2)})`
          );
          return;
        }

        await onSubmit({
          orderId,
          amount: value.amount,
          paymentMethod: value.paymentMethod,
          paymentDate: value.paymentDate,
          reference: value.reference || null,
          notes: value.notes || null,
          isRefund: false,
          relatedPaymentId: null,
        });

        // Reset and close on success
        form.reset();
        onOpenChange(false);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.issues[0]?.message ?? "Validation failed");
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to record payment");
        }
      }
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

  const amount = form.getFieldValue("amount") ?? 0;
  const remainingAfterPayment = Math.max(0, balanceDue - amount);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for order {orderNumber}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-5"
        >
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
              <div className="space-y-2">
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
                <Label htmlFor="amount">
                  Payment Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min={0.01}
                    max={balanceDue}
                    className="pl-7"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(parseFloat(e.target.value) || 0)
                    }
                    onBlur={field.handleBlur}
                    disabled={isSubmitting || isFullPayment}
                    aria-invalid={field.state.meta.errors.length > 0}
                    aria-describedby={field.state.meta.errors.length > 0 ? "amount-error" : undefined}
                  />
                </div>
                {field.state.meta.errors.length > 0 && (
                  <p id="amount-error" className="text-xs text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as PaymentMethod)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="paymentMethod"
                    aria-invalid={field.state.meta.errors.length > 0}
                    aria-describedby={field.state.meta.errors.length > 0 ? "paymentMethod-error" : undefined}
                  >
                    <SelectValue placeholder="Select payment method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p id="paymentMethod-error" className="text-xs text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="paymentDate">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isSubmitting}
                  aria-invalid={field.state.meta.errors.length > 0}
                  aria-describedby={field.state.meta.errors.length > 0 ? "paymentDate-error" : undefined}
                />
                {field.state.meta.errors.length > 0 && (
                  <p id="paymentDate-error" className="text-xs text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Reference Field */}
          <form.Field name="reference">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  placeholder="e.g., Bank transfer reference, cheque number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isSubmitting}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Transaction ID, cheque number, or other reference
                </p>
              </div>
            )}
          </form.Field>

          {/* Notes Field */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this payment..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isSubmitting}
                  rows={3}
                  maxLength={1000}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                amount <= 0 ||
                amount > balanceDue
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;
