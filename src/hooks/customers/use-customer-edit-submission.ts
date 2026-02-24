import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useUpdateCustomer } from './use-customers'
import { useCreateContact, useDeleteContact, useUpdateContact } from './use-customer-contacts'
import { useCreateAddress, useDeleteAddress, useUpdateAddress } from './use-customer-addresses'
import type { CustomerDetailAddress, CustomerDetailContact } from '@/lib/schemas/customers'

export interface CustomerEditFormValues {
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
}

export interface EditableContact {
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
  influencer?: boolean
  isNew?: boolean
}

export interface EditableAddress {
  id: string
  type: 'billing' | 'shipping' | 'service' | 'headquarters'
  isPrimary: boolean
  street1: string
  street2?: string
  city: string
  state?: string
  postcode: string
  country: string
  isNew?: boolean
}

interface RelatedSyncFailure {
  scope: 'contact' | 'address'
  action: 'create' | 'update' | 'delete'
  label: string
  reason: string
}

interface UseCustomerEditSubmissionOptions {
  customerId: string
  existingContacts: CustomerDetailContact[]
  existingAddresses: CustomerDetailAddress[]
}

export function useCustomerEditSubmission({
  customerId,
  existingContacts,
  existingAddresses,
}: UseCustomerEditSubmissionOptions) {
  const updateCustomerMutation = useUpdateCustomer()
  const createContactMutation = useCreateContact()
  const updateContactMutation = useUpdateContact()
  const deleteContactMutation = useDeleteContact()
  const createAddressMutation = useCreateAddress()
  const updateAddressMutation = useUpdateAddress()
  const deleteAddressMutation = useDeleteAddress()

  const submitEdit = async (
    formData: CustomerEditFormValues,
    contacts: EditableContact[],
    addresses: EditableAddress[]
  ) => {
    try {
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
    } catch (error) {
      logger.error('Failed to update customer core fields', error as Error, { context: 'customers-edit' })
      toast.error('Failed to update customer')
      throw error
    }

    const failures: RelatedSyncFailure[] = []
    const recordFailure = (
      scope: RelatedSyncFailure['scope'],
      action: RelatedSyncFailure['action'],
      label: string,
      error: unknown
    ) => {
      failures.push({
        scope,
        action,
        label,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    const existingContactIds = existingContacts.map((c) => c.id)
    const currentContactIds = contacts.filter((c) => !c.isNew).map((c) => c.id)

    for (const id of existingContactIds) {
      if (!currentContactIds.includes(id)) {
        const existing = existingContacts.find((c) => c.id === id)
        const label = existing ? `${existing.firstName} ${existing.lastName}`.trim() || id : id
        try {
          await deleteContactMutation.mutateAsync(id)
        } catch (error) {
          recordFailure('contact', 'delete', label, error)
        }
      }
    }

    for (const contact of contacts) {
      const label = `${contact.firstName} ${contact.lastName}`.trim() || contact.id
      if (contact.isNew) {
        try {
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
        } catch (error) {
          recordFailure('contact', 'create', label, error)
        }
      } else {
        try {
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
        } catch (error) {
          recordFailure('contact', 'update', label, error)
        }
      }
    }

    const existingAddressIds = existingAddresses.map((a) => a.id)
    const currentAddressIds = addresses.filter((a) => !a.isNew).map((a) => a.id)

    for (const id of existingAddressIds) {
      if (!currentAddressIds.includes(id)) {
        const existing = existingAddresses.find((a) => a.id === id)
        const label = existing?.street1 ?? id
        try {
          await deleteAddressMutation.mutateAsync(id)
        } catch (error) {
          recordFailure('address', 'delete', label, error)
        }
      }
    }

    for (const address of addresses) {
      const label = address.street1 || address.id
      if (address.isNew) {
        try {
          await createAddressMutation.mutateAsync({
            customerId,
            type: address.type,
            isPrimary: address.isPrimary,
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            postcode: address.postcode,
            country: address.country,
          })
        } catch (error) {
          recordFailure('address', 'create', label, error)
        }
      } else {
        try {
          await updateAddressMutation.mutateAsync({
            id: address.id,
            type: address.type,
            isPrimary: address.isPrimary,
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            postcode: address.postcode,
            country: address.country,
          })
        } catch (error) {
          recordFailure('address', 'update', label, error)
        }
      }
    }

    if (failures.length > 0) {
      const preview = failures.slice(0, 3).map((f) => `${f.scope} ${f.action} "${f.label}"`).join(' • ')
      const remaining = failures.length - 3
      const detail = remaining > 0 ? `${preview} • +${remaining} more` : preview

      logger.warn('Customer updated with related entity sync failures', {
        context: 'customers-edit',
        customerId,
        failureCount: failures.length,
        failures,
      })

      toast.error('Customer saved, but related records had errors', {
        description: detail,
      })
      throw new Error(`Customer saved with related sync errors: ${detail}`)
    }

    toast.success('Customer updated successfully')
  }

  const isLoading =
    updateCustomerMutation.isPending ||
    createContactMutation.isPending ||
    updateContactMutation.isPending ||
    deleteContactMutation.isPending ||
    createAddressMutation.isPending ||
    updateAddressMutation.isPending ||
    deleteAddressMutation.isPending

  return { submitEdit, isLoading }
}
