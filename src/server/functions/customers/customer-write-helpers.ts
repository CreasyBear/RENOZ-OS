import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox'
import { customersLogger } from '@/lib/logger'
import { db } from '@/lib/db'

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

function normalizeOptionalCustomerText(value: string | undefined | null) {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export function normalizeCustomerMutationInput<
  T extends {
    legalName?: string
    industry?: string
    taxId?: string
    registrationNumber?: string
    creditHoldReason?: string
    xeroContactId?: string | null
    parentId?: string
  },
>(data: T): T {
  const normalizedXeroContactId =
    'xeroContactId' in data
      ? normalizeOptionalCustomerText(data.xeroContactId ?? undefined) ?? null
      : undefined

  return {
    ...data,
    legalName: normalizeOptionalCustomerText(data.legalName),
    industry: normalizeOptionalCustomerText(data.industry),
    taxId: normalizeOptionalCustomerText(data.taxId),
    registrationNumber: normalizeOptionalCustomerText(data.registrationNumber),
    creditHoldReason: normalizeOptionalCustomerText(data.creditHoldReason),
    ...('xeroContactId' in data ? { xeroContactId: normalizedXeroContactId } : {}),
    parentId: normalizeOptionalCustomerText(data.parentId),
  }
}

export function normalizeContactMutationInput<
  T extends {
    title?: string
    department?: string
    notes?: string
  },
>(data: T): T {
  return {
    ...data,
    title: normalizeOptionalCustomerText(data.title),
    department: normalizeOptionalCustomerText(data.department),
    notes: normalizeOptionalCustomerText(data.notes),
  }
}

export function normalizeAddressMutationInput<
  T extends {
    street2?: string
    state?: string
    notes?: string
  },
>(data: T): T {
  return {
    ...data,
    street2: normalizeOptionalCustomerText(data.street2),
    state: normalizeOptionalCustomerText(data.state),
    notes: normalizeOptionalCustomerText(data.notes),
  }
}

export async function enqueueCustomerSearchOutbox(
  organizationId: string,
  customer: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
  },
  action: 'upsert' | 'delete',
  tx?: DbTx
) {
  if (tx) {
    await enqueueSearchIndexOutbox(
      {
        organizationId,
        entityType: 'customer',
        entityId: customer.id,
        action,
        payload:
          action === 'upsert'
            ? {
                title: customer.name,
                subtitle: customer.email ?? undefined,
                description: customer.phone ?? undefined,
              }
            : undefined,
      },
      tx
    )

    return
  }

  try {
    await enqueueSearchIndexOutbox({
      organizationId,
      entityType: 'customer',
      entityId: customer.id,
      action,
      payload:
        action === 'upsert'
          ? {
              title: customer.name,
              subtitle: customer.email ?? undefined,
              description: customer.phone ?? undefined,
            }
          : undefined,
    })
  } catch (error) {
    customersLogger.warn('Customer search outbox enqueue failed', {
      context: 'customers-search-outbox',
      customerId: customer.id,
      action,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
