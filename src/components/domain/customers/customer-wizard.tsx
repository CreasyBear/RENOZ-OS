/**
 * CustomerWizard Component
 *
 * Multi-step wizard for creating new customers with:
 * 1. Basic Information - Name, type, status, business details
 * 2. Contacts - Add key contacts for the customer
 * 3. Addresses - Add billing/shipping addresses
 * 4. Review - Review all information before submission
 *
 * Features:
 * - Step navigation with validation
 * - Progress indicator
 * - Data persistence across steps
 * - Summary review before submission
 */
import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Building2,
  User,
  MapPin,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ContactManager, type ManagedContact } from './contact-manager'
import { AddressManager, type ManagedAddress } from './address-manager'
import {
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from '@/lib/schemas/customers'

// ============================================================================
// TYPES
// ============================================================================

const wizardSteps = ['basic', 'contacts', 'addresses', 'review'] as const
type WizardStep = typeof wizardSteps[number]

// Form schema without .default() to avoid react-hook-form type issues
const customerWizardSchema = z.object({
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
  creditHold: z.boolean(),
  tags: z.array(z.string().max(50)),
})

type CustomerWizardValues = z.infer<typeof customerWizardSchema>

interface CustomerWizardData {
  customer: CustomerWizardValues
  contacts: ManagedContact[]
  addresses: ManagedAddress[]
}

interface CustomerWizardProps {
  onSubmit: (data: CustomerWizardData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  availableTags?: Array<{ id: string; name: string; color: string }>
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

interface StepIndicatorProps {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
}

const stepConfig: Record<WizardStep, { label: string; icon: typeof Building2 }> = {
  basic: { label: 'Basic Info', icon: Building2 },
  contacts: { label: 'Contacts', icon: User },
  addresses: { label: 'Addresses', icon: MapPin },
  review: { label: 'Review', icon: CheckCircle },
}

function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      {wizardSteps.map((step, index) => {
        const config = stepConfig[step]
        const Icon = config.icon
        const isActive = step === currentStep
        const isCompleted = completedSteps.has(step)
        const stepIndex = wizardSteps.indexOf(currentStep)
        const isPast = index < stepIndex

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isPast && !isCompleted && 'border-muted-foreground bg-muted',
                  !isActive && !isCompleted && !isPast && 'border-muted bg-background'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  isActive && 'text-primary',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {config.label}
              </span>
            </div>
            {index < wizardSteps.length - 1 && (
              <div
                className={cn(
                  'mx-4 h-0.5 w-16',
                  isPast || isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// STEP: BASIC INFO
// ============================================================================

interface BasicInfoStepProps {
  form: ReturnType<typeof useForm<CustomerWizardValues>>
  availableTags?: Array<{ id: string; name: string; color: string }>
}

const statusLabels: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  blacklisted: 'Blacklisted',
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

function BasicInfoStep({ form, availableTags }: BasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
          <CardDescription>Enter the basic information for this customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
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

          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Acme Corporation Pty Ltd" {...field} />
                </FormControl>
                <FormDescription>Full legal entity name if different</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
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
              control={form.control}
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
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
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
          </div>

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Construction, Healthcare" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
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
              control={form.control}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Primary contact details for the company</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="info@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+61 2 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>Categorize this customer (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
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
                    <span className="text-muted-foreground text-sm">No tags selected</span>
                  )}
                </div>
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
    </div>
  )
}

// ============================================================================
// STEP: REVIEW
// ============================================================================

interface ReviewStepProps {
  data: CustomerWizardData
}

function ReviewStep({ data }: ReviewStepProps) {
  const { customer, contacts, addresses } = data

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium">{customer.name}</dd>
            </div>
            {customer.legalName && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Legal Name</dt>
                <dd className="mt-1">{customer.legalName}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Type</dt>
              <dd className="mt-1">
                <Badge variant="outline">{typeLabels[customer.type || 'business']}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <Badge variant="secondary">{statusLabels[customer.status || 'prospect']}</Badge>
              </dd>
            </div>
            {customer.industry && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Industry</dt>
                <dd className="mt-1">{customer.industry}</dd>
              </div>
            )}
            {customer.email && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd className="mt-1">{customer.email}</dd>
              </div>
            )}
            {customer.phone && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                <dd className="mt-1">{customer.phone}</dd>
              </div>
            )}
          </dl>

          {customer.tags && customer.tags.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-2">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </dd>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts added</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                      {contact.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                    </div>
                    {contact.email && (
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Addresses ({addresses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No addresses added</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{address.type}</span>
                      {address.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {address.street1}, {address.city} {address.state} {address.postcode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerWizard({
  onSubmit,
  onCancel,
  isLoading = false,
  availableTags = [],
}: CustomerWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
  const [contacts, setContacts] = useState<ManagedContact[]>([])
  const [addresses, setAddresses] = useState<ManagedAddress[]>([])

  const form = useForm<CustomerWizardValues>({
    resolver: zodResolver(customerWizardSchema),
    defaultValues: {
      name: '',
      status: 'prospect',
      type: 'business',
      creditHold: false,
      tags: [],
    },
  })

  const currentStepIndex = wizardSteps.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === wizardSteps.length - 1

  const goToNextStep = useCallback(async () => {
    // Validate basic info step before proceeding
    if (currentStep === 'basic') {
      const isValid = await form.trigger(['name'])
      if (!isValid) return
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep]))
    setCurrentStep(wizardSteps[currentStepIndex + 1])
  }, [currentStep, currentStepIndex, form])

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(wizardSteps[currentStepIndex - 1])
  }, [currentStepIndex])

  const handleSubmit = async () => {
    const customerData = form.getValues()
    await onSubmit({
      customer: customerData,
      contacts,
      addresses,
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {currentStep === 'basic' && (
            <BasicInfoStep form={form} availableTags={availableTags} />
          )}

          {currentStep === 'contacts' && (
            <ContactManager contacts={contacts} onChange={setContacts} />
          )}

          {currentStep === 'addresses' && (
            <AddressManager addresses={addresses} onChange={setAddresses} />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              data={{
                customer: form.getValues(),
                contacts,
                addresses,
              }}
            />
          )}

          <div className="flex justify-between mt-8 pt-4 border-t">
            <div>
              {!isFirstStep && (
                <Button type="button" variant="outline" onClick={goToPreviousStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>

              {!isLastStep ? (
                <Button type="button" onClick={goToNextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Create Customer
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
