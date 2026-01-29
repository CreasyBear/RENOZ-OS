/**
 * BasicInfoSection Component
 *
 * Core product details: SKU, name, type, status, category, description.
 */
import { Controller } from 'react-hook-form';
import { Package } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FormSection } from './form-section';
import type { BasicInfoSectionProps } from '../types';

export function BasicInfoSection({ control, errors, categories }: BasicInfoSectionProps) {
  return (
    <FormSection
      title="Basic Information"
      description="Core product details and identification"
      icon={Package}
    >
      <div className="grid gap-6">
        {/* SKU and Name row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sku">
              SKU <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="sku"
              control={control}
              render={({ field }) => (
                <Input
                  id="sku"
                  placeholder="e.g., PROD-001"
                  {...field}
                  className={errors.sku ? 'border-destructive' : ''}
                />
              )}
            />
            {errors.sku && <p className="text-destructive text-sm">{errors.sku.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  id="name"
                  placeholder="Enter product name"
                  {...field}
                  className={errors.name ? 'border-destructive' : ''}
                />
              )}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
        </div>

        {/* Type and Status row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Product Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? '__NONE__'} onValueChange={(v) => field.onChange(v !== '__NONE__' ? v : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">No Category</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                id="description"
                placeholder="Enter product description"
                rows={4}
                {...field}
              />
            )}
          />
        </div>
      </div>
    </FormSection>
  );
}
