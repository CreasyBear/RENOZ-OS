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
 * Uses react-hook-form with Zod validation.
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Building2,
  CreditCard,
  Globe,
  Mail,
  Phone,
  Tag,
  User,
  AlertCircle,
} from 'lucide-react'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from '@/lib/schemas/customers'

// ============================================================================
// TYPES
// ============================================================================

// Form schema without .default() to avoid react-hook-form type issues
const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  legalName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: z.enum(['prospect', 'active', 'inactive', 'suspended', 'blacklisted']),
  type: z.enum(['individual', 'business', 'government', 'non_profit']),
  size: z.enum(['micro', 'small', 'medium', 'large', 'enterprise']).optional(),
  industry: z.string().max(100).optional(),
  taxId: z.string().max(20).optional(),
  registrationNumber: z.string().max(50).optional(),
  parentId: z.string().uuid().optional(),
  creditLimit: z.number().nonnegative().optional(),
  creditHold: z.boolean(),
  creditHoldReason: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

interface CustomerFormProps {
  defaultValues?: Partial<CustomerFormValues>
  onSubmit: (data: CustomerFormValues) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  mode?: 'create' | 'edit'
  availableTags?: Array<{ id: string; name: string; color: string }>
}

// ============================================================================
// HELPERS
// ============================================================================

const statusLabels: Record<string, { label: string; description: string }> = {
  prospect: { label: 'Prospect', description: 'Potential customer being evaluated' },
  active: { label: 'Active', description: 'Current customer with ongoing relationship' },
  inactive: { label: 'Inactive', description: 'No recent activity or engagement' },
  suspended: { label: 'Suspended', description: 'Temporarily restricted access' },
  blacklisted: { label: 'Blacklisted', description: 'Permanently blocked from services' },
}

const typeLabels: Record<string, string> = {
  individual: 'Individual',
  business: 'Business',
  government: 'Government',
  non_profit: 'Non-Profit',
}

const sizeLabels: Record<string, string> = {
  micro: 'Micro (1-9)',
  small: 'Small (10-49)',
  medium: 'Medium (50-249)',
  large: 'Large (250-999)',
  enterprise: 'Enterprise (1000+)',
}

// ============================================================================
// FORM SECTIONS
// ============================================================================

function BasicInfoSection() {
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
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Acme Corporation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customerTypeValues.map((type) => (
                      <SelectItem key={type} value={type}>
                        {typeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customerStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div>
                          <span>{statusLabels[status].label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {field.value && statusLabels[field.value]?.description}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Size</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customerSizeValues.map((size) => (
                    <SelectItem key={size} value={size}>
                      {sizeLabels[size]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

function BusinessDetailsSection() {
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
        <FormField
          name="legalName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legal Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Acme Corporation Pty Ltd" {...field} />
              </FormControl>
              <FormDescription>
                Full legal entity name if different from display name
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ABN / Tax ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 12 345 678 901" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="registrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., ACN 123 456 789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Construction, Healthcare, Retail" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

function ContactInfoSection() {
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
        <FormField
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="info@company.com" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="+61 2 1234 5678" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="https://www.company.com" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

function CreditManagementSection() {
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
        <FormField
          name="creditLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit Limit (AUD)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g., 10000"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Maximum credit amount for this customer
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="creditHold"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Credit Hold
                </FormLabel>
                <FormDescription>
                  Prevent new orders until credit issues are resolved
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          name="creditHoldReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit Hold Reason</FormLabel>
              <FormControl>
                <Input placeholder="Reason for credit hold" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

function TagsSection({ availableTags }: { availableTags?: Array<{ id: string; name: string; color: string }> }) {
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
        <FormField
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Tags</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
                  {field.value?.length > 0 ? (
                    field.value.map((tag: string) => {
                      const tagInfo = availableTags?.find((t) => t.name === tag)
                      return (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          style={tagInfo ? { backgroundColor: tagInfo.color + '20', color: tagInfo.color } : undefined}
                          onClick={() => {
                            field.onChange(field.value.filter((t: string) => t !== tag))
                          }}
                        >
                          {tag} ×
                        </Badge>
                      )
                    })
                  ) : (
                    <span className="text-muted-foreground text-sm">No tags assigned</span>
                  )}
                </div>
              </FormControl>
              {availableTags && availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground mr-2">Available:</span>
                  {availableTags
                    .filter((t) => !field.value?.includes(t.name))
                    .map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer text-xs"
                        style={{ borderColor: tag.color, color: tag.color }}
                        onClick={() => {
                          field.onChange([...(field.value || []), tag.name])
                        }}
                      >
                        + {tag.name}
                      </Badge>
                    ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
  availableTags = [],
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      status: 'prospect',
      type: 'business',
      creditHold: false,
      tags: [],
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: CustomerFormValues) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <BasicInfoSection />
            <BusinessDetailsSection />
          </div>
          <div className="space-y-6">
            <ContactInfoSection />
            <CreditManagementSection />
            <TagsSection availableTags={availableTags} />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Customer' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
