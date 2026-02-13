/**
 * Supplier Form Presenter
 *
 * Pure UI component for creating/editing suppliers.
 * No data fetching - receives all data via props.
 *
 * @see STANDARDS.md - Container/Presenter Pattern
 */


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  supplierStatusSchema,
  supplierTypeSchema,
  paymentTermsSchema,
  type SupplierStatus,
  type SupplierType,
  type PaymentTerms,
} from '@/lib/schemas/suppliers';

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierFormData {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  website: string;
  status: SupplierStatus;
  supplierType: SupplierType | undefined;
  taxId: string;
  registrationNumber: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  paymentTerms: PaymentTerms | undefined;
  currency: string;
  leadTimeDays: number | undefined;
  minimumOrderValue: number | undefined;
  maximumOrderValue: number | undefined;
  notes: string;
}

export interface SupplierFormErrors {
  name?: string;
  email?: string;
  website?: string;
  primaryContactEmail?: string;
}

export interface SupplierFormProps {
  /** Form data - controlled component */
  data: SupplierFormData;
  /** Field errors */
  errors?: SupplierFormErrors;
  /** Loading state */
  isLoading?: boolean;
  /** Submit loading state */
  isSubmitting?: boolean;

  /** Submit button text */
  submitLabel: string;
  /** Change handler */
  onChange: (field: keyof SupplierFormData, value: unknown) => void;
  /** Submit handler */
  onSubmit: () => void;
  /** Cancel handler */
  onCancel: () => void;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export function SupplierForm({
  data,
  errors = {},
  isSubmitting = false,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: SupplierFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="Enter supplier name"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                value={data.legalName}
                onChange={(e) => onChange('legalName', e.target.value)}
                placeholder="Enter legal business name"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierType">Supplier Type</Label>
              <Select
                value={data.supplierType || ''}
                onValueChange={(value) => {
                  const parsed = supplierTypeSchema.safeParse(value);
                  if (parsed.success) onChange('supplierType', parsed.data);
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={data.status}
                onValueChange={(value) => {
                  const parsed = supplierStatusSchema.safeParse(value);
                  if (parsed.success) onChange('status', parsed.data);
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
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => onChange('email', e.target.value)}
                placeholder="supplier@example.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={data.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                placeholder="+1 234 567 890"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={data.website}
                onChange={(e) => onChange('website', e.target.value)}
                placeholder="https://www.example.com"
                disabled={isSubmitting}
              />
              {errors.website && (
                <p className="text-destructive text-sm">{errors.website}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primaryContactName">Name</Label>
              <Input
                id="primaryContactName"
                value={data.primaryContactName}
                onChange={(e) => onChange('primaryContactName', e.target.value)}
                placeholder="Contact person name"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryContactEmail">Email</Label>
              <Input
                id="primaryContactEmail"
                type="email"
                value={data.primaryContactEmail}
                onChange={(e) => onChange('primaryContactEmail', e.target.value)}
                placeholder="contact@example.com"
                disabled={isSubmitting}
              />
              {errors.primaryContactEmail && (
                <p className="text-destructive text-sm">{errors.primaryContactEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryContactPhone">Phone</Label>
              <Input
                id="primaryContactPhone"
                value={data.primaryContactPhone}
                onChange={(e) => onChange('primaryContactPhone', e.target.value)}
                placeholder="+1 234 567 890"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                value={data.taxId}
                onChange={(e) => onChange('taxId', e.target.value)}
                placeholder="Tax identification number"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                value={data.registrationNumber}
                onChange={(e) => onChange('registrationNumber', e.target.value)}
                placeholder="Business registration number"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                value={data.paymentTerms || ''}
                onValueChange={(value) => {
                  const parsed = paymentTermsSchema.safeParse(value);
                  if (parsed.success) onChange('paymentTerms', parsed.data);
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

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={data.currency}
                onChange={(e) => onChange('currency', e.target.value)}
                placeholder="AUD"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min={0}
                value={data.leadTimeDays || ''}
                onChange={(e) => onChange('leadTimeDays', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Average lead time in days"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumOrderValue">Minimum Order Value</Label>
              <Input
                id="minimumOrderValue"
                type="number"
                min={0}
                step="0.01"
                value={data.minimumOrderValue || ''}
                onChange={(e) => onChange('minimumOrderValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              id="notes"
              value={data.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Additional notes about this supplier..."
              disabled={isSubmitting}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </CardContent>
        </Card>

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
    </>
  );
}
