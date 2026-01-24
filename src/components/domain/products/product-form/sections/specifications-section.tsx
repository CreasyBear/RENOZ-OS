/**
 * SpecificationsSection Component
 *
 * Physical attributes: barcode, weight, dimensions.
 */
import { Controller } from 'react-hook-form';
import { FileText } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { FormSection } from './form-section';
import type { SpecificationsSectionProps } from '../types';

export function SpecificationsSection({ control, watch }: SpecificationsSectionProps) {
  const productType = watch('type');
  const showPhysical = productType === 'physical' || productType === 'bundle';

  return (
    <FormSection
      title="Specifications"
      description="Physical attributes and details"
      icon={FileText}
      defaultOpen={false}
    >
      <div className="grid gap-6">
        {/* Barcode */}
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode / UPC</Label>
          <Controller
            name="barcode"
            control={control}
            render={({ field }) => (
              <Input
                id="barcode"
                placeholder="Enter barcode"
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </div>

        {/* Physical dimensions */}
        {showPhysical && (
          <>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Controller
                name="weight"
                control={control}
                render={({ field }) => (
                  <Input
                    id="weight"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Length (cm)</Label>
                <Controller
                  name="dimensions.length"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Width (cm)</Label>
                <Controller
                  name="dimensions.width"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Controller
                  name="dimensions.height"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  )}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </FormSection>
  );
}
