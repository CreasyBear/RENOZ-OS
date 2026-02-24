/**
 * New Customer Route
 *
 * Multi-step wizard for creating new customers with contacts and addresses.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { FormSkeleton } from '@/components/skeletons/shared/form-skeleton'
import { Button } from '@/components/ui/button'
import { CustomerWizard } from '@/components/domain/customers/customer-wizard'
import {
  useCustomerTags,
  useCreateCustomer,
  useCreateContact,
  useCreateAddress,
} from '@/hooks/customers'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

interface RelatedCreateFailure {
  scope: 'contact' | 'address'
  label: string
  reason: string
}

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/new')({
  component: NewCustomerPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="New Customer" />
      <PageLayout.Content>
        <FormSkeleton sections={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function NewCustomerPage() {
  const navigate = useNavigate()

  // Fetch available tags using centralized hook
  const { data: tagsData } = useCustomerTags()

  const availableTags = tagsData?.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  })) ?? []

  // Create customer using centralized hook (handles cache invalidation)
  const createCustomerMutation = useCreateCustomer()

  // Create contact using centralized hook
  const createContactMutation = useCreateContact()

  // Create address using centralized hook
  const createAddressMutation = useCreateAddress()

  const handleSubmit = async (wizardData: {
    customer: {
      name: string
      status: string
      type: string
      creditHold: boolean
      creditHoldReason?: string
      tags: string[]
      legalName?: string
      email?: string
      phone?: string
      website?: string
      size?: string
      industry?: string
      taxId?: string
      registrationNumber?: string
    }
    contacts: Array<{
      id: string
      firstName: string
      lastName: string
      email?: string
      phone?: string
      mobile?: string
      title?: string
      department?: string
      isPrimary: boolean
      decisionMaker: boolean
      influencer: boolean
    }>
    addresses: Array<{
      id: string
      type: string
      isPrimary: boolean
      street1: string
      street2?: string
      city: string
      state?: string
      postcode: string
      country: string
    }>
  }) => {
    let createdCustomerId: string | null = null
    const failures: RelatedCreateFailure[] = []

    const recordFailure = (
      scope: RelatedCreateFailure['scope'],
      label: string,
      error: unknown
    ) => {
      failures.push({
        scope,
        label,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    try {
      // Create customer first
      const customer = await createCustomerMutation.mutateAsync({
        name: wizardData.customer.name,
        status: wizardData.customer.status as 'prospect' | 'active' | 'inactive' | 'suspended' | 'blacklisted',
        type: wizardData.customer.type as 'individual' | 'business' | 'government' | 'non_profit',
        creditHold: wizardData.customer.creditHold,
        creditHoldReason: wizardData.customer.creditHoldReason,
        tags: wizardData.customer.tags,
        legalName: wizardData.customer.legalName,
        email: wizardData.customer.email,
        phone: wizardData.customer.phone,
        website: wizardData.customer.website,
        size: wizardData.customer.size as 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | undefined,
        industry: wizardData.customer.industry,
        taxId: wizardData.customer.taxId,
        registrationNumber: wizardData.customer.registrationNumber,
        warrantyExpiryAlertOptOut: false,
      })
      createdCustomerId = customer.id

      // Create contacts
      for (const contact of wizardData.contacts) {
        const label = `${contact.firstName} ${contact.lastName}`.trim() || contact.id
        try {
          await createContactMutation.mutateAsync({
            customerId: customer.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            mobile: contact.mobile,
            title: contact.title,
            department: contact.department,
            isPrimary: contact.isPrimary,
            decisionMaker: contact.decisionMaker,
            influencer: contact.influencer,
          })
        } catch (error) {
          recordFailure('contact', label, error)
        }
      }

      // Create addresses
      for (const address of wizardData.addresses) {
        const label = address.street1 || address.id
        try {
          await createAddressMutation.mutateAsync({
            customerId: customer.id,
            type: address.type as 'billing' | 'shipping' | 'service' | 'headquarters',
            isPrimary: address.isPrimary,
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            postcode: address.postcode,
            country: address.country,
          })
        } catch (error) {
          recordFailure('address', label, error)
        }
      }

      if (failures.length > 0) {
        const preview = failures
          .slice(0, 3)
          .map((f) => `${f.scope} "${f.label}"`)
          .join(' • ')
        const remaining = failures.length - 3
        logger.warn('Customer created with related creation failures', {
          context: 'customers-new',
          customerId: customer.id,
          failureCount: failures.length,
          failures,
        })
        toast.error('Customer created, but some related records failed', {
          description: remaining > 0 ? `${preview} • +${remaining} more` : preview,
        })
        navigate({ to: '/customers/$customerId/edit', params: { customerId: customer.id }, search: {} })
        return
      }

      toast.success('Customer created successfully')
      navigate({ to: '/customers/$customerId', params: { customerId: customer.id }, search: {} })
    } catch (error) {
      logger.error('Failed to create customer', error as Error, { context: 'customers-new' })
      if (createdCustomerId) {
        throw error
      }
      toast.error('Failed to create customer')
      throw error
    }
  }

  const handleCancel = () => {
    navigate({ to: '/customers' })
  }

  const isLoading =
    createCustomerMutation.isPending ||
    createContactMutation.isPending ||
    createAddressMutation.isPending

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="New Customer"
        description="Create a new customer with contacts and addresses"
        actions={
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        }
      />
      <PageLayout.Content>
        <CustomerWizard
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          availableTags={availableTags}
        />
      </PageLayout.Content>
    </PageLayout>
  )
}
