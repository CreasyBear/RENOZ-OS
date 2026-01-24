/**
 * PricingStep Component
 *
 * Step 3: Configure pricing and discounts.
 */

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StepProps } from '../types';
import { formatPrice } from '../types';

export const PricingStep = memo(function PricingStep({ state, setState }: StepProps) {
  // Calculate subtotal before discounts
  const subtotal = state.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  // Calculate discount
  const discountFromPercent = Math.round(subtotal * (state.discountPercent / 100));
  const totalDiscount = discountFromPercent + state.discountAmount;
  const afterDiscount = subtotal - totalDiscount;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configure Pricing</h3>
        <p className="text-muted-foreground text-sm">
          Apply discounts and review line item pricing
        </p>
      </div>

      {/* Line Items Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.lineItems.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.sku && <p className="text-muted-foreground text-xs">SKU: {item.sku}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.quantity * item.unitPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discounts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Discounts</CardTitle>
          <CardDescription>Apply order-level discounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-percent">Discount %</Label>
              <div className="relative">
                <Input
                  id="discount-percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={state.discountPercent || ''}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      discountPercent: Number(e.target.value) || 0,
                    }))
                  }
                  className="pr-8"
                />
                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                  %
                </span>
              </div>
              {state.discountPercent > 0 && (
                <p className="text-muted-foreground text-xs">
                  Saves {formatPrice(discountFromPercent)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-amount">Fixed Discount ($)</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                  $
                </span>
                <Input
                  id="discount-amount"
                  type="number"
                  min={0}
                  step={1}
                  value={state.discountAmount ? state.discountAmount / 100 : ''}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      discountAmount: Math.round(Number(e.target.value) * 100) || 0,
                    }))
                  }
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-2">
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
            <div className="flex justify-between font-medium">
              <span>After Discount</span>
              <span>{formatPrice(afterDiscount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
