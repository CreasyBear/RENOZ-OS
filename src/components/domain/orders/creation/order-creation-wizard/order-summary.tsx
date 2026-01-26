/**
 * OrderSummary Component
 *
 * Real-time order summary with calculation display.
 * Shows subtotal, discounts, GST, shipping, and total amounts.
 *
 * Features:
 * - Real-time calculation updates
 * - GST compliance display
 * - Breakdown of all cost components
 * - Order validation status
 *
 * @see src/lib/order-calculations.ts for calculation logic
 */

'use client';

import { useMemo } from 'react';
import { Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrderForm } from './order-form-context';
import { validateOrderBusinessRules } from '@/lib/order-calculations';

export interface OrderSummaryProps {
  className?: string;
  showValidation?: boolean;
}

export function OrderSummary({ className, showValidation = true }: OrderSummaryProps) {
  const { calculations, formData, template } = useOrderForm();

  // Business rule validation
  const businessValidation = useMemo(() => {
    return validateOrderBusinessRules(calculations);
  }, [calculations]);

  // Format currency consistently
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate GST amount
  const gstRate = template.includeGst ? 0.1 : 0;
  const gstAmount = template.includeGst
    ? (calculations.subtotal - calculations.discountAmount + calculations.shippingAmount) * gstRate
    : 0;

  // Final total
  const finalTotal =
    calculations.subtotal - calculations.discountAmount + calculations.shippingAmount + gstAmount;

  // Order health check
  const orderHealth = useMemo(() => {
    const issues = [];

    if (calculations.subtotal === 0) {
      issues.push('No items added to order');
    }

    if (!formData.customerId) {
      issues.push('No customer selected');
    }

    if (!businessValidation.isValid) {
      issues.push(...businessValidation.warnings);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }, [calculations.subtotal, formData.customerId, businessValidation]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Health Status */}
        {showValidation && (
          <div className="flex items-center gap-2">
            {orderHealth.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <span className="text-sm font-medium">
              {orderHealth.isValid ? 'Order Ready' : 'Order Needs Attention'}
            </span>
          </div>
        )}

        {/* Validation Issues */}
        {showValidation && orderHealth.issues.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-inside list-disc space-y-1">
                {orderHealth.issues.map((issue, index) => (
                  <li key={index} className="text-sm">
                    {issue}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Calculation Breakdown */}
        <div className="space-y-3">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Subtotal</span>
            <span className="font-mono text-sm">{formatCurrency(calculations.subtotal)}</span>
          </div>

          {/* Order-level Discount */}
          {template.includeDiscounts &&
            ((formData.discountPercent ?? 0) > 0 || (formData.discountAmount ?? 0) > 0) && (
              <div className="text-muted-foreground flex items-center justify-between">
                <span className="text-sm">
                  Discount
                  {(formData.discountPercent ?? 0) > 0 && ` (${formData.discountPercent}%)`}
                </span>
                <span className="font-mono text-sm">
                  -{formatCurrency(calculations.discountAmount)}
                </span>
              </div>
            )}

          {/* Subtotal after discount */}
          {template.includeDiscounts && calculations.discountAmount > 0 && (
            <>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Subtotal (after discount)</span>
                <span className="font-mono text-sm font-medium">
                  {formatCurrency(calculations.subtotal - calculations.discountAmount)}
                </span>
              </div>
            </>
          )}

          {/* Shipping */}
          {template.includeShipping && calculations.shippingAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Shipping</span>
              <span className="font-mono text-sm">
                {formatCurrency(calculations.shippingAmount)}
              </span>
            </div>
          )}

          <Separator />

          {/* Amount subject to GST */}
          {template.includeGst && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Amount subject to GST</span>
              <span className="font-mono text-sm">
                {formatCurrency(
                  calculations.subtotal - calculations.discountAmount + calculations.shippingAmount
                )}
              </span>
            </div>
          )}

          {/* GST */}
          {template.includeGst && gstAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                GST (10%)
                <Badge variant="outline" className="ml-2 text-xs">
                  Included
                </Badge>
              </span>
              <span className="font-mono text-sm font-medium">{formatCurrency(gstAmount)}</span>
            </div>
          )}

          {/* No GST notice */}
          {template.includeGst && gstAmount === 0 && gstRate === 0 && (
            <div className="text-muted-foreground flex items-center justify-between">
              <span className="text-sm">GST (Export/Exempt)</span>
              <span className="font-mono text-sm">$0.00</span>
            </div>
          )}

          <Separator />

          {/* Final Total */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-primary font-mono text-lg font-bold">
              {formatCurrency(finalTotal)}
            </span>
          </div>
        </div>

        {/* Business Rules Warnings */}
        {showValidation && !businessValidation.isValid && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {businessValidation.warnings.map((warning, index) => (
                  <div key={index} className="text-sm">
                    {warning}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* GST Compliance Notice */}
        {template.includeGst && (
          <div className="text-muted-foreground mt-4 border-t pt-3 text-xs">
            <p>
              <strong>GST Compliance:</strong> All prices shown include GST at 10%. GST is
              calculated on the total amount subject to GST.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
