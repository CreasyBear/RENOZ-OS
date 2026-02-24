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
  useCustomerEditSubmission,
  type CustomerEditFormValues,
} from '@/hooks/customers'
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
    (customer.contacts ?? []).map((c: CustomerDetailContact) => ({
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
    (customer.addresses ?? []).map((a: CustomerDetailAddress) => ({
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

  const { submitEdit, isLoading } = useCustomerEditSubmission({
    customerId,
    existingContacts: customer.contacts ?? [],
    existingAddresses: customer.addresses ?? [],
  })

  const handleSubmit = async (formData: CustomerEditFormValues) => {
    await submitEdit(formData, contacts, addresses)
    onSuccess()
  }

  const handleCancel = () => {
    navigate({ to: '/customers/$customerId', params: { customerId }, search: {} })
  }

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
