/**
 * ReviewStep Component
 *
 * Step 5: Review all details before creating the order.
 */

import { memo } from 'react';
import { format } from 'date-fns';
import { User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WizardState } from '../types';
import { GST_RATE, formatPrice } from '../types';

interface ReviewStepProps {
  state: WizardState;
}

export const ReviewStep = memo(function ReviewStep({ state }: ReviewStepProps) {
  // Calculate totals
  const subtotal = state.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountFromPercent = Math.round(subtotal * (state.discountPercent / 100));
  const totalDiscount = discountFromPercent + state.discountAmount;
  const afterDiscount = subtotal - totalDiscount;
  const gstAmount = Math.round(afterDiscount * GST_RATE);
  const total = afterDiscount + gstAmount + state.shippingAmount;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Order</h3>
        <p className="text-muted-foreground text-sm">
          Review all details before creating the order
        </p>
      </div>

      {/* Customer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          {state.customer && (
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                <User className="text-muted-foreground h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{state.customer.name}</p>
                <p className="text-muted-foreground text-sm">
                  {state.customer.email || state.customer.phone}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Items ({state.lineItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.lineItems.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.quantity * item.unitPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p>{state.shippingAddress.street1}</p>
            <p>
              {state.shippingAddress.city}, {state.shippingAddress.state}{' '}
              {state.shippingAddress.postcode}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>GST (10%)</span>
            <span>{formatPrice(gstAmount)}</span>
          </div>
          {state.shippingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{formatPrice(state.shippingAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {state.dueDate && (
            <p className="text-muted-foreground pt-2 text-xs">
              Due: {format(state.dueDate, 'dd/MM/yyyy')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {(state.internalNotes || state.customerNotes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.internalNotes && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">Internal Notes</p>
                <p className="text-sm">{state.internalNotes}</p>
              </div>
            )}
            {state.customerNotes && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">Customer Notes</p>
                <p className="text-sm">{state.customerNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes Input */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="internal-notes">Internal Notes</Label>
            <Textarea
              id="internal-notes"
              placeholder="Notes visible only to staff..."
              value={state.internalNotes}
              onChange={() => {}}
              disabled
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-notes">Customer Notes</Label>
            <Textarea
              id="customer-notes"
              placeholder="Notes visible to customer..."
              value={state.customerNotes}
              onChange={() => {}}
              disabled
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
