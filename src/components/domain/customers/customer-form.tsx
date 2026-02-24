/**
 * CustomerForm Component
 *
 * Comprehensive customer information form with:
 * - Basic info section (name, type, status)
 * - Business details section (legal name, tax ID, industry)
 * - Contact info section (email, phone, website)
 * - Credit management section
 * - Tag assignment
 *
 * Uses TanStack Form with Zod validation.
 *
 * @source form state from useTanStackForm hook
 * @source validation from Zod schemas
 * @source customer data from props (for edit mode)
 */
import { z } from 'zod'
import {
  Building2,
  CreditCard,
  Mail,
  Tag,
  User,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form'
import {
  useFormDraft,
  getCreateDraftKey,
  getEditDraftKey,
} from '@/hooks/_shared/use-form-draft'
import {
  TextField,
  SelectField,
  NumberField,
  CheckboxField,
  FormActions,
  FormFieldDisplayProvider,
  DraftRestorePrompt,
  DraftSavingIndicator,
} from '@/components/shared/forms'
import {
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from '@/lib/schemas/customers'
import { phoneSchema } from '@/lib/schemas/_shared/patterns'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  legalName: z.string().max(255).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: phoneSchema,
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: z.enum(['prospect', 'active', 'inactive', 'suspended', 'blacklisted']),
  type: z.enum(['individual', 'business', 'government', 'non_profit']),
  size: z.enum(['micro', 'small', 'medium', 'large', 'enterprise']).optional(),
  industry: z.string().max(100).optional().or(z.literal('')),
  taxId: z.string().max(20).optional().or(z.literal('')),
  registrationNumber: z.string().max(50).optional().or(z.literal('')),
  parentId: z.string().uuid().optional(),
  creditLimit: z.number().nonnegative().optional(),
  creditHold: z.boolean(),
  creditHoldReason: z.string().max(500).optional().or(z.literal('')),
  tags: z.array(z.string().max(50)),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

interface CustomerFormProps {
  defaultValues?: Partial<CustomerFormValues>
  onSubmit: (data: CustomerFormValues) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  mode?: 'create' | 'edit'
  customerId?: string // Required for edit mode draft key
  availableTags?: Array<{ id: string; name: string; color: string }>
}

// ============================================================================
// HELPERS
// ============================================================================

const statusOptions = customerStatusValues.map((status) => ({
  value: status,
  label: {
    prospect: 'Prospect',
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    blacklisted: 'Blacklisted',
  }[status],
  description: {
    prospect: 'Potential customer being evaluated',
    active: 'Current customer with ongoing relationship',
    inactive: 'No recent activity or engagement',
    suspended: 'Temporarily restricted access',
    blacklisted: 'Permanently blocked from services',
  }[status],
}))

const typeOptions = customerTypeValues.map((type) => ({
  value: type,
  label: {
    individual: 'Individual',
    business: 'Business',
    government: 'Government',
    non_profit: 'Non-Profit',
  }[type],
}))

const sizeOptions = customerSizeValues.map((size) => ({
  value: size,
  label: {
    micro: 'Micro (1-9)',
    small: 'Small (10-49)',
    medium: 'Medium (50-249)',
    large: 'Large (250-999)',
    enterprise: 'Enterprise (1000+)',
  }[size],
}))

// ============================================================================
// FORM SECTIONS
// ============================================================================

interface SectionProps {
  form: ReturnType<typeof useTanStackForm<CustomerFormValues>>
}

function BasicInfoSection({ form }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Basic Information
        </CardTitle>
        <CardDescription>Customer name and classification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <TextField
              field={field}
              label="Customer Name"
              placeholder="e.g., Acme Corporation"
              required
            />
          )}
        </form.Field>

        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="type">
            {(field) => (
              <SelectField
                field={field}
                label="Customer Type"
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
                description={statusOptions.find(o => o.value === field.state.value)?.description}
              />
            )}
          </form.Field>
        </div>

        <form.Field name="size">
          {(field) => (
            <SelectField
              field={field}
              label="Company Size"
              options={sizeOptions}
              placeholder="Select size (optional)"
            />
          )}
        </form.Field>
      </CardContent>
    </Card>
  )
}

function BusinessDetailsSection({ form }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Business Details
        </CardTitle>
        <CardDescription>Legal and industry information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form.Field name="legalName">
          {(field) => (
            <TextField
              field={field}
              label="Legal Name"
              placeholder="e.g., Acme Corporation Pty Ltd…"
              description="Full legal entity name if different from display name"
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

        <form.Field name="industry">
          {(field) => (
            <TextField
              field={field}
              label="Industry"
              placeholder="e.g., Construction, Healthcare, Retail…"
            />
          )}
        </form.Field>
      </CardContent>
    </Card>
  )
}

function ContactInfoSection({ form }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Contact Information
        </CardTitle>
        <CardDescription>Primary contact details for the customer</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form.Field name="email">
          {(field) => (
            <TextField
              field={field}
              label="Email"
              type="email"
              placeholder="info@company.com"
              autocomplete="email"
            />
          )}
        </form.Field>

        <form.Field name="phone">
          {(field) => (
            <TextField
              field={field}
              label="Phone"
              type="tel"
              placeholder="+61 2 1234 5678"
              autocomplete="tel"
              inputMode="tel"
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
              autocomplete="url"
              inputMode="url"
            />
          )}
        </form.Field>
      </CardContent>
    </Card>
  )
}

function CreditManagementSection({ form }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Credit Management
        </CardTitle>
        <CardDescription>Credit limits and holds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form.Field name="creditLimit">
          {(field) => (
            <NumberField
              field={field}
              label="Credit Limit (AUD)"
              placeholder="e.g., 10000"
              min={0}
              description="Maximum credit amount for this customer"
            />
          )}
        </form.Field>

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
            />
          )}
        </form.Field>
      </CardContent>
    </Card>
  )
}

interface TagsSectionProps extends SectionProps {
  availableTags?: Array<{ id: string; name: string; color: string }>
}

function TagsSection({ form, availableTags }: TagsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-5 w-5" />
          Tags
        </CardTitle>
        <CardDescription>Categorize and organize this customer</CardDescription>
      </CardHeader>
      <CardContent>
        <form.Field name="tags">
          {(field) => {
            const tags = field.state.value ?? []

            const handleAddTag = (tagName: string) => {
              if (!tags.includes(tagName)) {
                field.handleChange([...tags, tagName])
              }
            }

            const handleRemoveTag = (tagName: string) => {
              field.handleChange(tags.filter((t) => t !== tagName))
            }

            return (
              <div className="space-y-3">
                <label className="text-sm font-medium">Assigned Tags</label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
                  {tags.length > 0 ? (
                    tags.map((tag) => {
                      const tagInfo = availableTags?.find((t) => t.name === tag)
                      return (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          style={tagInfo ? { backgroundColor: tagInfo.color + '20', color: tagInfo.color } : undefined}
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      )
                    })
                  ) : (
                    <span className="text-muted-foreground text-sm">No tags assigned</span>
                  )}
                </div>
                {availableTags && availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground mr-2">Available:</span>
                    {availableTags
                      .filter((t) => !tags.includes(t.name))
                      .map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="cursor-pointer text-xs"
                          style={{ borderColor: tag.color, color: tag.color }}
                          onClick={() => handleAddTag(tag.name)}
                        >
                          + {tag.name}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            )
          }}
        </form.Field>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAFT_VERSION = 1 // Increment when form schema changes

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
  customerId,
  availableTags = [],
}: CustomerFormProps) {
  const formDefaults = {
    name: '',
    legalName: '',
    email: '',
    phone: '',
    website: '',
    status: 'prospect' as const,
    type: 'business' as const,
    size: undefined,
    industry: '',
    taxId: '',
    registrationNumber: '',
    creditLimit: undefined,
    creditHold: false,
    creditHoldReason: '',
    tags: [],
    ...defaultValues,
  }

  const form = useTanStackForm({
    schema: customerFormSchema,
    defaultValues: formDefaults,
    onSubmit: async (values) => {
      await onSubmit(values)
      draft.clear() // Clear draft on successful submit
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.')
    },
  })

  // Auto-save draft functionality
  const draftKey =
    mode === 'edit' && customerId
      ? getEditDraftKey('customer', customerId)
      : getCreateDraftKey('customer')

  const draft = useFormDraft({
    key: draftKey,
    version: DRAFT_VERSION,
    form,
    enabled: true,
    excludeFields: [], // No sensitive fields to exclude
    onClear: () => {
      // Draft cleared callback
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-6"
    >
      <FormFieldDisplayProvider form={form}>
      {/* Draft restore prompt */}
      <DraftRestorePrompt
        hasDraft={draft.hasDraft}
        savedAt={draft.savedAt}
        onRestore={draft.restore}
        onDiscard={draft.clear}
        variant="banner"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <BasicInfoSection form={form} />
          <BusinessDetailsSection form={form} />
        </div>
        <div className="space-y-6">
          <ContactInfoSection form={form} />
          <CreditManagementSection form={form} />
          <TagsSection form={form} availableTags={availableTags} />
        </div>
      </div>

      {/* Draft saving indicator */}
      <div className="flex items-center justify-end">
        <DraftSavingIndicator isSaving={draft.isSaving} savedAt={draft.savedAt} />
      </div>

      <FormActions
        form={form}
        submitLabel={mode === 'create' ? 'Create Customer' : 'Save Changes'}
        onCancel={onCancel}
        align="right"
        submitDisabled={isLoading}
      />
      </FormFieldDisplayProvider>
    </form>
  )
}
