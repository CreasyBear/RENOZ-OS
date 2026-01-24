/**
 * ShippingStep Component
 *
 * Step 4: Configure shipping address and costs.
 */

import { memo } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StepProps } from '../types';

export const ShippingStep = memo(function ShippingStep({ state, setState }: StepProps) {
  const customerAddress = state.customer?.shippingAddress || state.customer?.billingAddress;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Shipping Details</h3>
        <p className="text-muted-foreground text-sm">Configure shipping address and costs</p>
      </div>

      {/* Shipping Cost */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipping Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="shipping-amount">Shipping Amount</Label>
            <div className="relative w-48">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                $
              </span>
              <Input
                id="shipping-amount"
                type="number"
                min={0}
                step={1}
                value={state.shippingAmount ? state.shippingAmount / 100 : ''}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    shippingAmount: Math.round(Number(e.target.value) * 100) || 0,
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipping Address</CardTitle>
          <CardDescription>
            {customerAddress
              ? "Use customer's address or enter a different one"
              : 'Enter the shipping address'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerAddress && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-customer-address"
                checked={state.useBillingAsShipping}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    useBillingAsShipping: e.target.checked,
                    shippingAddress: e.target.checked
                      ? {
                          street1: customerAddress.street1 || '',
                          city: customerAddress.city || '',
                          state: customerAddress.state || '',
                          postcode: customerAddress.postcode || '',
                          country: customerAddress.country || 'AU',
                        }
                      : s.shippingAddress,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="use-customer-address" className="font-normal">
                Use customer&apos;s address
              </Label>
            </div>
          )}

          {state.useBillingAsShipping && customerAddress ? (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p>{customerAddress.street1}</p>
              <p>
                {customerAddress.city}, {customerAddress.state} {customerAddress.postcode}
              </p>
              <p>{customerAddress.country}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="street1">Street Address</Label>
                <Input
                  id="street1"
                  value={state.shippingAddress.street1}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      shippingAddress: {
                        ...s.shippingAddress,
                        street1: e.target.value,
                      },
                    }))
                  }
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={state.shippingAddress.city}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          city: e.target.value,
                        },
                      }))
                    }
                    placeholder="Sydney"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={state.shippingAddress.state}
                    onValueChange={(value) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          state: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={state.shippingAddress.postcode}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          postcode: e.target.value,
                        },
                      }))
                    }
                    placeholder="2000"
                    maxLength={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={state.shippingAddress.country}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          country: e.target.value,
                        },
                      }))
                    }
                    placeholder="AU"
                    disabled
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Due Date */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={state.dueDate ? format(state.dueDate, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  dueDate: e.target.value ? new Date(e.target.value) : null,
                }))
              }
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
