/**
 * Edit Customer Route
 *
 * Form for editing existing customer information.
 * Uses the CustomerForm component with pre-populated data.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { FormSkeleton } from '@/components/skeletons/shared/form-skeleton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomerForm } from '@/components/domain/customers/customer-form'
import { ContactManager, type ManagedContact } from '@/components/domain/customers/contact-manager'
import { AddressManager, type ManagedAddress } from '@/components/domain/customers/address-manager'
import { useCustomer, useCustomerTags, useUpdateCustomer } from '@/hooks/customers'
import {
  createContact,
  updateContact,
  deleteContact,
  createAddress,
  updateAddress,
  deleteAddress,
} from '@/server/customers'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/$customerId_/edit')({
  component: EditCustomerPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
      <PageLayout.Header title="Edit Customer" />
      <PageLayout.Content>
        <FormSkeleton sections={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function EditCustomerPage() {
  const { customerId } = Route.useParams()
  const navigate = useNavigate()

  // Local state for contacts and addresses
  const [contacts, setContacts] = useState<ManagedContact[]>([])
  const [addresses, setAddresses] = useState<ManagedAddress[]>([])
  const [hasInitialized, setHasInitialized] = useState(false)

  // Fetch customer data using centralized hook
  const { data: customer, isLoading: isLoadingCustomer, error } = useCustomer({ id: customerId })

  // Fetch available tags using centralized hook
  const { data: tagsData } = useCustomerTags()

  const availableTags = tagsData?.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  })) ?? []

  // Initialize contacts and addresses from customer data
  useEffect(() => {
    if (customer && !hasInitialized) {
      setContacts(
        customer.contacts.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email ?? undefined,
          phone: c.phone ?? undefined,
          mobile: c.mobile ?? undefined,
          title: c.title ?? undefined,
          department: c.department ?? undefined,
          isPrimary: c.isPrimary,
          decisionMaker: c.decisionMaker,
          influencer: c.influencer ?? false,
        }))
      )
      setAddresses(
        customer.addresses.map((a) => ({
          id: a.id,
          type: a.type as 'billing' | 'shipping' | 'service' | 'headquarters',
          isPrimary: a.isPrimary,
          street1: a.street1,
          street2: a.street2 ?? undefined,
          city: a.city,
          state: a.state ?? undefined,
          postcode: a.postcode,
          country: a.country,
        }))
      )
      setHasInitialized(true)
    }
  }, [customer, hasInitialized])

  // Update customer using centralized hook (handles cache invalidation)
  const updateCustomerMutation = useUpdateCustomer()

  // Contact mutations
  const createContactMutation = useMutation({
    mutationFn: (data: Parameters<typeof createContact>[0]['data']) => createContact({ data }),
  })
  const updateContactMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateContact>[0]['data']) => updateContact({ data }),
  })
  const deleteContactMutation = useMutation({
    mutationFn: (data: Parameters<typeof deleteContact>[0]['data']) => deleteContact({ data }),
  })

  // Address mutations
  const createAddressMutation = useMutation({
    mutationFn: (data: Parameters<typeof createAddress>[0]['data']) => createAddress({ data }),
  })
  const updateAddressMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateAddress>[0]['data']) => updateAddress({ data }),
  })
  const deleteAddressMutation = useMutation({
    mutationFn: (data: Parameters<typeof deleteAddress>[0]['data']) => deleteAddress({ data }),
  })

  const handleSubmit = async (formData: {
    name: string
    status: string
    type: string
    creditHold: boolean
    tags: string[]
    legalName?: string
    email?: string
    phone?: string
    website?: string
    size?: string
    industry?: string
    taxId?: string
    registrationNumber?: string
    creditLimit?: number
    creditHoldReason?: string
  }) => {
    if (!customer) return

    try {
      // Update customer
      await updateCustomerMutation.mutateAsync({
        id: customerId,
        name: formData.name,
        status: formData.status as 'prospect' | 'active' | 'inactive' | 'suspended' | 'blacklisted',
        type: formData.type as 'individual' | 'business' | 'government' | 'non_profit',
        creditHold: formData.creditHold,
        tags: formData.tags,
        legalName: formData.legalName,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        size: formData.size as 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | undefined,
        industry: formData.industry,
        taxId: formData.taxId,
        registrationNumber: formData.registrationNumber,
        creditLimit: formData.creditLimit,
        creditHoldReason: formData.creditHoldReason,
      })

      // Handle contacts - sync with server
      const existingContactIds = customer.contacts.map((c) => c.id)
      const currentContactIds = contacts.filter((c) => !c.isNew).map((c) => c.id)

      // Delete removed contacts
      for (const id of existingContactIds) {
        if (!currentContactIds.includes(id)) {
          await deleteContactMutation.mutateAsync({ id })
        }
      }

      // Create or update contacts
      for (const contact of contacts) {
        if (contact.isNew) {
          await createContactMutation.mutateAsync({
            customerId,
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
        } else {
          await updateContactMutation.mutateAsync({
            id: contact.id,
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
        }
      }

      // Handle addresses - sync with server
      const existingAddressIds = customer.addresses.map((a) => a.id)
      const currentAddressIds = addresses.filter((a) => !a.isNew).map((a) => a.id)

      // Delete removed addresses
      for (const id of existingAddressIds) {
        if (!currentAddressIds.includes(id)) {
          await deleteAddressMutation.mutateAsync({ id })
        }
      }

      // Create or update addresses
      for (const address of addresses) {
        if (address.isNew) {
          await createAddressMutation.mutateAsync({
            customerId,
            type: address.type as 'billing' | 'shipping' | 'service' | 'headquarters',
            isPrimary: address.isPrimary,
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            postcode: address.postcode,
            country: address.country,
          })
        } else {
          await updateAddressMutation.mutateAsync({
            id: address.id,
            type: address.type as 'billing' | 'shipping' | 'service' | 'headquarters',
            isPrimary: address.isPrimary,
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            postcode: address.postcode,
            country: address.country,
          })
        }
      }

      // Note: useUpdateCustomer hook handles cache invalidation
      toast.success('Customer updated successfully')
      navigate({ to: '/customers/$customerId', params: { customerId } })
    } catch (error) {
      console.error('Failed to update customer:', error)
      toast.error('Failed to update customer')
    }
  }

  const handleCancel = () => {
    navigate({ to: '/customers/$customerId', params: { customerId } })
  }

  const isLoading =
    updateCustomerMutation.isPending ||
    createContactMutation.isPending ||
    updateContactMutation.isPending ||
    deleteContactMutation.isPending ||
    createAddressMutation.isPending ||
    updateAddressMutation.isPending ||
    deleteAddressMutation.isPending

  // Loading state
  if (isLoadingCustomer) {
    return (
      <PageLayout variant="container">
        <PageLayout.Header title="Loading..." />
        <PageLayout.Content>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  // Error state
  if (error || !customer) {
    return (
      <PageLayout variant="container">
        <PageLayout.Header title="Customer Not Found" />
        <PageLayout.Content>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              The customer you're trying to edit doesn't exist or you don't have access.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: '/customers' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customers
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={`Edit ${customer.name}`}
        description={`${customer.customerCode} · ${customer.type}`}
        actions={
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customer
          </Button>
        }
      />
      <PageLayout.Content>
        <div className="space-y-6">
          <CustomerForm
            mode="edit"
            defaultValues={{
              name: customer.name,
              legalName: customer.legalName ?? undefined,
              email: customer.email ?? undefined,
              phone: customer.phone ?? undefined,
              website: customer.website ?? undefined,
              status: customer.status as 'prospect' | 'active' | 'inactive' | 'suspended' | 'blacklisted',
              type: customer.type as 'individual' | 'business' | 'government' | 'non_profit',
              size: (customer.size ?? undefined) as 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | undefined,
              industry: customer.industry ?? undefined,
              taxId: customer.taxId ?? undefined,
              registrationNumber: customer.registrationNumber ?? undefined,
              creditLimit: customer.creditLimit ? Number(customer.creditLimit) : undefined,
              creditHold: customer.creditHold,
              creditHoldReason: customer.creditHoldReason ?? undefined,
              tags: customer.tags ?? [],
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
            availableTags={availableTags}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ContactManager
              contacts={contacts}
              onChange={setContacts}
              disabled={isLoading}
            />
            <AddressManager
              addresses={addresses}
              onChange={setAddresses}
              disabled={isLoading}
            />
          </div>
        </div>
      </PageLayout.Content>
    </PageLayout>
  )
}
