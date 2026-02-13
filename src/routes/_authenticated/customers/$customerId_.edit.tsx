/**
 * Edit Customer Route
 *
 * Form for editing existing customer information.
 * Uses the CustomerForm component with pre-populated data.
 *
 * LAYOUT: container (form view)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { FormSkeleton } from '@/components/skeletons/shared/form-skeleton'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/domain/customers/customer-form'
import { ContactManager, type ManagedContact } from '@/components/domain/customers/contact-manager'
import { AddressManager, type ManagedAddress } from '@/components/domain/customers/address-manager'
import {
  useCustomer,
  useCustomerTags,
  useUpdateCustomer,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from '@/hooks/customers'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { useState } from 'react'
import type {
  CustomerWithRelations,
  CustomerDetailContact,
  CustomerDetailAddress,
} from '@/lib/schemas/customers'

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/$customerId_/edit')({
  component: EditCustomerPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Edit Customer" />
      <PageLayout.Content>
        <FormSkeleton sections={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
})

// ============================================================================
// EDIT FORM (keyed by customer.id so state resets when customer changes)
// ============================================================================

function EditCustomerFormContent({
  customer,
  customerId,
  availableTags,
  onSuccess,
}: {
  customer: CustomerWithRelations
  customerId: string
  availableTags: { id: string; name: string; color: string }[]
  onSuccess: () => void
}) {
  const navigate = useNavigate()

  const [contacts, setContacts] = useState<ManagedContact[]>(() =>
    customer.contacts.map((c: CustomerDetailContact) => ({
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
  const [addresses, setAddresses] = useState<ManagedAddress[]>(() =>
    customer.addresses.map((a: CustomerDetailAddress) => ({
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

  // Update customer using centralized hook (handles cache invalidation)
  const updateCustomerMutation = useUpdateCustomer()

  // Contact mutations using centralized hooks
  const createContactMutation = useCreateContact()
  const updateContactMutation = useUpdateContact()
  const deleteContactMutation = useDeleteContact()

  // Address mutations using centralized hooks
  const createAddressMutation = useCreateAddress()
  const updateAddressMutation = useUpdateAddress()
  const deleteAddressMutation = useDeleteAddress()

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
      const existingContactIds = customer.contacts.map((c: CustomerDetailContact) => c.id)
      const currentContactIds = contacts.filter((c) => !c.isNew).map((c) => c.id)

      // Delete removed contacts
      for (const id of existingContactIds) {
        if (!currentContactIds.includes(id)) {
          await deleteContactMutation.mutateAsync(id)
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
      const existingAddressIds = customer.addresses.map((a: CustomerDetailAddress) => a.id)
      const currentAddressIds = addresses.filter((a) => !a.isNew).map((a) => a.id)

      // Delete removed addresses
      for (const id of existingAddressIds) {
        if (!currentAddressIds.includes(id)) {
          await deleteAddressMutation.mutateAsync(id)
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

      toast.success('Customer updated successfully')
      onSuccess()
    } catch (error) {
      logger.error('Failed to update customer', error as Error, { context: 'customers-edit' })
      toast.error('Failed to update customer')
    }
  }

  const handleCancel = () => {
    navigate({ to: '/customers/$customerId', params: { customerId }, search: {} })
  }

  const isLoading =
    updateCustomerMutation.isPending ||
    createContactMutation.isPending ||
    updateContactMutation.isPending ||
    deleteContactMutation.isPending ||
    createAddressMutation.isPending ||
    updateAddressMutation.isPending ||
    deleteAddressMutation.isPending

  return (
    <div className="space-y-6">
      <CustomerForm
              mode="edit"
              customerId={customerId}
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
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function EditCustomerPage() {
  const { customerId } = Route.useParams()
  const navigate = useNavigate()

  const { data: customer, isLoading: isLoadingCustomer, error } = useCustomer({ id: customerId })
  const { data: tagsData } = useCustomerTags()

  const availableTags = tagsData?.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  })) ?? []

  const title = isLoadingCustomer
    ? 'Loading...'
    : error || !customer
      ? 'Customer Not Found'
      : `Edit ${customer.name}`

  const description = !isLoadingCustomer && !error && customer
    ? `${customer.customerCode} · ${customer.type}`
    : undefined

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={title}
        description={description}
        actions={
          !isLoadingCustomer && !error && customer ? (
            <Button variant="ghost" onClick={() => navigate({ to: '/customers/$customerId', params: { customerId }, search: {} })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customer
            </Button>
          ) : undefined
        }
      />
      <PageLayout.Content>
        {isLoadingCustomer ? (
          <FormSkeleton sections={3} />
        ) : error || !customer ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              The customer you&apos;re trying to edit doesn&apos;t exist or you don&apos;t have access.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: '/customers' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customers
            </Button>
          </div>
        ) : (
          <EditCustomerFormContent
            key={customer.id}
            customer={{
              ...customer,
              tags: customer.tags ?? [],
              legalName: customer.legalName ?? undefined,
              email: customer.email ?? undefined,
              phone: customer.phone ?? undefined,
              website: customer.website ?? undefined,
              size: customer.size ?? undefined,
              industry: customer.industry ?? undefined,
              taxId: customer.taxId ?? undefined,
              registrationNumber: customer.registrationNumber ?? undefined,
              parentId: customer.parentId ?? undefined,
              creditLimit: customer.creditLimit ?? undefined,
              creditHoldReason: customer.creditHoldReason ?? undefined,
              customFields: (customer.customFields ?? undefined) as Record<string, string | number | boolean | null> | undefined,
            }}
            customerId={customerId}
            availableTags={availableTags}
            onSuccess={() => navigate({ to: '/customers/$customerId', params: { customerId }, search: {} })}
          />
        )}
      </PageLayout.Content>
    </PageLayout>
  )
}
