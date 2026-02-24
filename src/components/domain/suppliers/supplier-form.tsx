/**
 * Supplier Form
 *
 * Form for creating/editing suppliers. Uses TanStack Form with Zod validation.
 *
 * @see STANDARDS.md - Form patterns
 * @see src/lib/schemas/suppliers/supplier-form.ts
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { FormFieldDisplayProvider } from '@/components/shared/forms';
import {
  supplierStatusSchema,
  supplierTypeSchema,
  paymentTermsSchema,
} from '@/lib/schemas/suppliers';
import type { SupplierFormValues } from '@/lib/schemas/suppliers/supplier-form';
import type { TanStackFormApi } from '@/hooks/_shared/use-tanstack-form';

// ============================================================================
// TYPES
// ============================================================================

export type { SupplierFormValues };

export interface SupplierFormProps {
  /** TanStack Form instance */
  form: TanStackFormApi<SupplierFormValues>;
  /** Submit button label */
  submitLabel: string;
  /** Cancel handler */
  onCancel: () => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierForm({
  form,
  submitLabel,
  onCancel,
  isSubmitting = false,
}: SupplierFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="max-w-4xl space-y-6"
    >
      <FormFieldDisplayProvider form={form}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">
                    Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter supplier name"
                    disabled={isSubmitting}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="legalName">
              {(field) => (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter legal business name"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="supplierType">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="supplierType">Supplier Type</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(value) => {
                      const parsed = supplierTypeSchema.safeParse(value);
                      if (parsed.success) field.handleChange(parsed.data);
                      else field.handleChange(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="supplierType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="retailer">Retailer</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="raw_materials">Raw Materials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={field.state.value ?? 'active'}
                    onValueChange={(value) => {
                      const parsed = supplierStatusSchema.safeParse(value);
                      if (parsed.success) field.handleChange(parsed.data);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="supplier@example.com"
                    disabled={isSubmitting}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="phone">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="+1 234 567 890"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="website">
              {(field) => (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="https://www.example.com"
                    disabled={isSubmitting}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <form.Field name="primaryContactName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="primaryContactName">Name</Label>
                  <Input
                    id="primaryContactName"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Contact person name"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="primaryContactEmail">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="primaryContactEmail">Email</Label>
                  <Input
                    id="primaryContactEmail"
                    type="email"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="contact@example.com"
                    disabled={isSubmitting}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="primaryContactPhone">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="primaryContactPhone">Phone</Label>
                  <Input
                    id="primaryContactPhone"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="+1 234 567 890"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <form.Field name="taxId">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Tax identification number"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="registrationNumber">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Business registration number"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="paymentTerms">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(value) => {
                      const parsed = paymentTermsSchema.safeParse(value);
                      if (parsed.success) field.handleChange(parsed.data);
                      else field.handleChange(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="paymentTerms">
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                      <SelectItem value="net_45">Net 45</SelectItem>
                      <SelectItem value="net_60">Net 60</SelectItem>
                      <SelectItem value="cod">COD</SelectItem>
                      <SelectItem value="prepaid">Prepaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="currency">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="AUD"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="leadTimeDays">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                  <Input
                    id="leadTimeDays"
                    type="number"
                    min={0}
                    value={field.state.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.handleChange(v === "" ? undefined : Number(v));
                    }}
                    onBlur={field.handleBlur}
                    placeholder="Average lead time in days"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="minimumOrderValue">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="minimumOrderValue">Minimum Order Value</Label>
                  <Input
                    id="minimumOrderValue"
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.state.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.handleChange(v === "" ? undefined : Number(v));
                    }}
                    onBlur={field.handleBlur}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="maximumOrderValue">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="maximumOrderValue">Maximum Order Value</Label>
                  <Input
                    id="maximumOrderValue"
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.state.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.handleChange(v === "" ? undefined : Number(v));
                    }}
                    onBlur={field.handleBlur}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </form.Field>
          </CardContent>
        </Card>

        {/* Notes */}
        <form.Field name="notes">
          {(field) => (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="notes"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Additional notes about this supplier..."
                  disabled={isSubmitting}
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          )}
        </form.Field>
      </FormFieldDisplayProvider>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
