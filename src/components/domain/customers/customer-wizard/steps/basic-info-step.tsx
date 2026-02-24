/**
 * BasicInfoStep Component
 *
 * First wizard step for entering customer details:
 * - Name and legal name
 * - Type, status, and size
 * - Industry and registration info
 * - Contact information (email, phone, website)
 * - Credit management (credit hold)
 * - Tags
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TextField,
  EmailField,
  PhoneField,
  SelectField,
  CheckboxField,
  MultiComboboxField,
} from '@/components/shared/forms';
import {
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from '@/lib/schemas/customers';
import { type BasicInfoStepProps, statusLabels, typeLabels, sizeLabels } from '../types';

const typeOptions = customerTypeValues.map((type) => ({
  value: type,
  label: typeLabels[type],
}));

const statusOptions = customerStatusValues.map((status) => ({
  value: status,
  label: statusLabels[status],
}));

const sizeOptions = customerSizeValues.map((size) => ({
  value: size,
  label: sizeLabels[size],
}));

export function BasicInfoStep({ form, availableTags }: BasicInfoStepProps) {
  const tagOptions = (availableTags ?? []).map((t) => ({ value: t.name, label: t.name }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
          <CardDescription>Enter the basic information for this customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Customer Name"
                placeholder="e.g., Acme Corporation…"
                required
              />
            )}
          </form.Field>

          <form.Field name="legalName">
            {(field) => (
              <TextField
                field={field}
                label="Legal Name"
                placeholder="e.g., Acme Corporation Pty Ltd…"
                description="Full legal entity name if different"
              />
            )}
          </form.Field>

          <div className="grid gap-4 md:grid-cols-3">
            <form.Field name="type">
              {(field) => (
                <SelectField
                  field={field}
                  label="Type"
                  options={typeOptions}
                  placeholder="Select type"
                />
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <SelectField
                  field={field}
                  label="Status"
                  options={statusOptions}
                  placeholder="Select status"
                />
              )}
            </form.Field>

            <form.Field name="size">
              {(field) => (
                <SelectField
                  field={field}
                  label="Size"
                  options={sizeOptions}
                  placeholder="Select size"
                />
              )}
            </form.Field>
          </div>

          <form.Field name="industry">
            {(field) => (
              <TextField
                field={field}
                label="Industry"
                placeholder="e.g., Construction, Healthcare…"
              />
            )}
          </form.Field>

          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="taxId">
              {(field) => (
                <TextField
                  field={field}
                  label="ABN / Tax ID"
                  placeholder="e.g., 12 345 678 901…"
                />
              )}
            </form.Field>

            <form.Field name="registrationNumber">
              {(field) => (
                <TextField
                  field={field}
                  label="Registration Number"
                  placeholder="e.g., ACN 123 456 789…"
                />
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Primary contact details for the company</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form.Field name="email">
            {(field) => (
              <EmailField
                field={field}
                label="Email"
                placeholder="info@company.com"
              />
            )}
          </form.Field>

          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="phone">
              {(field) => (
                <PhoneField
                  field={field}
                  label="Phone"
                  placeholder="+61 2 1234 5678"
                />
              )}
            </form.Field>

            <form.Field name="website">
              {(field) => (
                <TextField
                  field={field}
                  label="Website"
                  type="url"
                  placeholder="https://www.company.com"
                />
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit Management</CardTitle>
          <CardDescription>Credit holds and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form.Field name="creditHold">
            {(field) => (
              <CheckboxField
                field={field}
                label="Credit Hold"
                description="Prevent new orders until credit issues are resolved"
              />
            )}
          </form.Field>

          <form.Field name="creditHoldReason">
            {(field) => (
              <TextField
                field={field}
                label="Credit Hold Reason"
                placeholder="Reason for credit hold…"
                description="Required when credit hold is enabled"
              />
            )}
          </form.Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>Categorize this customer (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <form.Field name="tags">
            {(field) => (
              <MultiComboboxField
                field={field}
                label="Tags"
                options={tagOptions}
                searchPlaceholder="Search tags…"
                showSelectedTags
                maxSelections={50}
                placeholder={tagOptions.length > 0 ? "Select tags…" : "No tags available"}
              />
            )}
          </form.Field>
        </CardContent>
      </Card>
    </div>
  );
}
