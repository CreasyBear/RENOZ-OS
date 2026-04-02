import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useUpdateCustomerBundle } from './use-customers'
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

interface UseCustomerEditSubmissionOptions {
  customerId: string
  existingContacts: CustomerDetailContact[]
  existingAddresses: CustomerDetailAddress[]
}

export function useCustomerEditSubmission({
  customerId,
  existingContacts,
  existingAddresses: _existingAddresses,
}: UseCustomerEditSubmissionOptions) {
  const updateCustomerMutation = useUpdateCustomerBundle()

  const submitEdit = async (
    formData: CustomerEditFormValues,
    contacts: EditableContact[],
    addresses: EditableAddress[]
  ) => {
    try {
      await updateCustomerMutation.mutateAsync({
        id: customerId,
        customer: {
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
        },
        contacts: contacts.map((contact) => ({
          ...(contact.isNew
            ? { emailOptIn: true, smsOptIn: false }
            : (() => {
                const existing = existingContacts.find((item) => item.id === contact.id)
                return {
                  emailOptIn: existing?.emailOptIn ?? true,
                  smsOptIn: existing?.smsOptIn ?? false,
                }
              })()),
          id: contact.isNew ? undefined : contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          mobile: contact.mobile,
          title: contact.title,
          department: contact.department,
          isPrimary: contact.isPrimary,
          decisionMaker: contact.decisionMaker,
          influencer: contact.influencer ?? false,
        })),
        addresses: addresses.map((address) => ({
          id: address.isNew ? undefined : address.id,
          type: address.type,
          isPrimary: address.isPrimary,
          street1: address.street1,
          street2: address.street2,
          city: address.city,
          state: address.state,
          postcode: address.postcode,
          country: address.country,
        })),
      })
      toast.success('Customer updated successfully')
    } catch (error) {
      logger.error('Failed to update customer bundle', error as Error, { context: 'customers-edit' })
      toast.error('Failed to update customer')
      throw error
    }
  }

  const isLoading = updateCustomerMutation.isPending

  return { submitEdit, isLoading }
}
