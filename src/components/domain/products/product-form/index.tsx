/**
 * ProductForm Component
 *
 * Comprehensive product creation/editing form with multi-section layout,
 * validation, and support for dynamic attributes.
 */
import { Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  BasicInfoSection,
  PricingSection,
  SettingsSection,
  SpecificationsSection,
  SEOSection,
} from './sections';
import type { ProductFormProps, ProductFormValues } from './types';

export type { ProductFormValues };
export function ProductForm({ categories, onCancel, isEdit = false, form }: ProductFormProps) {
  const { control, handleSubmit, watch, errors, isDirty, isSubmitting, onFormSubmit } = form;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <BasicInfoSection control={control} errors={errors} categories={categories} />
      <PricingSection control={control} errors={errors} watch={watch} />
      <SettingsSection control={control} watch={watch} />
      <SpecificationsSection control={control} watch={watch} />
      <SEOSection control={control} />

      {/* Form actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <div>
          {isDirty && <p className="text-muted-foreground text-sm">You have unsaved changes</p>}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </div>
    </form>
  );
}
