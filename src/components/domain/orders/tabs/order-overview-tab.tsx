/**
 * Order Overview Tab
 *
 * Displays financial summary, addresses, and notes for an order.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderOverviewTabProps {
  order: OrderWithCustomer;
  paymentPercent: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderOverviewTab = memo(function OrderOverviewTab({
  order,
  paymentPercent,
}: OrderOverviewTabProps) {
  const balanceDue = Number(order.balanceDue || 0);

  return (
    <div className="space-y-8 pt-6">
      {/* Financial Summary */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-4">Financial Summary</h3>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Pricing */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                <FormatAmount amount={Number(order.subtotal)} />
              </span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Discount {order.discountPercent && `(${order.discountPercent}%)`}
                </span>
                <span className="tabular-nums text-destructive">
                  -<FormatAmount amount={Number(order.discountAmount)} />
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (GST)</span>
              <span className="tabular-nums">
                <FormatAmount amount={Number(order.taxAmount)} />
              </span>
            </div>
            {Number(order.shippingAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="tabular-nums">
                  <FormatAmount amount={Number(order.shippingAmount)} />
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="tabular-nums">
                <FormatAmount amount={Number(order.total)} />
              </span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span className="tabular-nums text-green-600">
                <FormatAmount amount={Number(order.paidAmount || 0)} />
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance Due</span>
              <span
                className={cn(
                  'tabular-nums font-medium',
                  order.paymentStatus === 'overdue' && 'text-destructive'
                )}
              >
                <FormatAmount amount={balanceDue} />
              </span>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="text-muted-foreground">{paymentPercent}%</span>
              </div>
              <Progress value={paymentPercent} className="h-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Addresses */}
      {(order.billingAddress || order.shippingAddress) && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4">Addresses</h3>
          <div className="grid md:grid-cols-2 gap-8">
            {order.billingAddress && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Billing</p>
                <div className="text-sm space-y-0.5">
                  {order.billingAddress.contactName && (
                    <p className="font-medium">{order.billingAddress.contactName}</p>
                  )}
                  <p>{order.billingAddress.street1}</p>
                  {order.billingAddress.street2 && <p>{order.billingAddress.street2}</p>}
                  <p>
                    {order.billingAddress.city}, {order.billingAddress.state}{' '}
                    {order.billingAddress.postalCode}
                  </p>
                </div>
              </div>
            )}
            {order.shippingAddress && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Shipping</p>
                <div className="text-sm space-y-0.5">
                  {order.shippingAddress.contactName && (
                    <p className="font-medium">{order.shippingAddress.contactName}</p>
                  )}
                  <p>{order.shippingAddress.street1}</p>
                  {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Notes */}
      {(order.customerNotes || order.internalNotes) && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4">Notes</h3>
          <div className="grid md:grid-cols-2 gap-8">
            {order.customerNotes && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Customer Notes</p>
                <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                  {order.customerNotes}
                </p>
              </div>
            )}
            {order.internalNotes && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Internal Notes</p>
                <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                  {order.internalNotes}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
});

export default OrderOverviewTab;
