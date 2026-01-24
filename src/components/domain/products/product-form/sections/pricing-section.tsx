/**
 * PricingSection Component
 *
 * Base price, cost price, and margin calculation.
 */
import { Controller } from 'react-hook-form';
import { DollarSign } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { FormSection } from './form-section';
import type { PricingSectionProps } from '../types';

export function PricingSection({ control, errors, watch }: PricingSectionProps) {
  const basePrice = watch('basePrice');
  const costPrice = watch('costPrice');
  const margin =
    costPrice && basePrice > 0 ? (((basePrice - costPrice) / basePrice) * 100).toFixed(1) : null;

  return (
    <FormSection title="Pricing" description="Set base and cost prices" icon={DollarSign}>
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="basePrice">
              Base Price <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                $
              </span>
              <Controller
                name="basePrice"
                control={control}
                render={({ field }) => (
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`pl-7 ${errors.basePrice ? 'border-destructive' : ''}`}
                    {...field}
                  />
                )}
              />
            </div>
            {errors.basePrice && (
              <p className="text-destructive text-sm">{errors.basePrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost Price</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                $
              </span>
              <Controller
                name="costPrice"
                control={control}
                render={({ field }) => (
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Margin</Label>
            <div className="flex h-10 items-center">
              {margin !== null ? (
                <Badge variant={Number(margin) > 0 ? 'default' : 'destructive'}>{margin}%</Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </FormSection>
  );
}
