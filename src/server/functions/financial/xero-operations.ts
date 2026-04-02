import { createServerFn } from '@tanstack/react-start';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customers, oauthConnections, xeroPaymentEvents } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  createXeroContact,
  getXeroContactById,
  getXeroSyncReadiness,
  searchXeroContacts,
  type XeroContactSummary,
} from './xero-adapter';
import type {
  SearchXeroContactResult,
  XeroPaymentEventRecord,
  XeroCustomerMappingStatus,
  XeroIntegrationStatus,
} from '@/lib/schemas/settings/xero-sync';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { safeNumber } from '@/lib/numeric';
import { z } from 'zod';

const customerIdSchema = z.object({
  customerId: z.string().uuid(),
});

const searchXeroContactsSchema = customerIdSchema.extend({
  query: z.string().trim().min(1).max(255),
});

const linkXeroContactSchema = customerIdSchema.extend({
  xeroContactId: z.string().min(1).max(255),
});

const createXeroContactForCustomerSchema = customerIdSchema;

const listXeroPaymentEventsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const getXeroIntegrationStatus = createServerFn({ method: 'GET' })
  .handler(async (): Promise<XeroIntegrationStatus> => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });
    const readiness = await getXeroSyncReadiness(ctx.organizationId);

    const [connection] = await db
      .select({
        id: oauthConnections.id,
        externalAccountId: oauthConnections.externalAccountId,
        isActive: oauthConnections.isActive,
        updatedAt: oauthConnections.updatedAt,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.provider, 'xero'),
          eq(oauthConnections.serviceType, 'accounting')
        )
      )
      .orderBy(desc(oauthConnections.updatedAt))
      .limit(1);

    if (!readiness.available) {
      const message = connection
        ? 'The stored Xero accounting connection needs to be reconnected before invoices and journals can sync.'
        : readiness.message ?? 'Xero integration unavailable';

      return {
        available: false,
        provider: 'xero',
        connectionId: connection?.id ?? null,
        tenantId: connection?.externalAccountId ?? null,
        tenantLabel: connection?.externalAccountId ?? null,
        isActive: Boolean(connection?.isActive),
        status: connection ? 'reconnect_required' : 'not_connected',
        message,
        nextAction: connection ? 'reconnect_xero' : 'connect_xero',
        nextActionLabel: connection ? 'Reconnect Xero' : 'Connect Xero',
      };
    }

    return {
      available: true,
      provider: 'xero',
      connectionId: connection?.id ?? readiness.connectionId ?? null,
      tenantId: connection?.externalAccountId ?? null,
      tenantLabel: connection?.externalAccountId ?? null,
      isActive: Boolean(connection?.isActive),
      status: 'connected',
      message: connection?.externalAccountId
        ? `Connected to tenant ${connection.externalAccountId}`
        : 'Connected to Xero',
      nextAction: null,
      nextActionLabel: null,
    };
  });

export const getCustomerXeroMappingStatus = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(customerIdSchema))
  .handler(async ({ data }): Promise<XeroCustomerMappingStatus> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const [customer] = await db
      .select({
        id: customers.id,
        xeroContactId: customers.xeroContactId,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    if (!customer.xeroContactId) {
      return {
        customerId: customer.id,
        xeroContactId: null,
        mappedContact: null,
      };
    }

    try {
      const mappedContact = await getXeroContactById(ctx.organizationId, customer.xeroContactId);
      return {
        customerId: customer.id,
        xeroContactId: customer.xeroContactId,
        mappedContact: mappedContact
          ? {
              id: mappedContact.id,
              name: mappedContact.name,
              email: mappedContact.email,
              phones: mappedContact.phones,
            }
          : null,
      };
    } catch {
      return {
        customerId: customer.id,
        xeroContactId: customer.xeroContactId,
        mappedContact: null,
      };
    }
  });

export const searchCustomerXeroContacts = createServerFn({ method: 'POST' })
  .inputValidator(searchXeroContactsSchema)
  .handler(async ({ data }): Promise<SearchXeroContactResult[]> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    await assertCustomerAccess(ctx.organizationId, data.customerId);
    const contacts = await searchXeroContacts(ctx.organizationId, data.query);
    return rankContactMatches(contacts, data.query);
  });

export const createCustomerXeroContact = createServerFn({ method: 'POST' })
  .inputValidator(createXeroContactForCustomerSchema)
  .handler(async ({ data }): Promise<XeroCustomerMappingStatus> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const customer = await getCustomerForMapping(ctx.organizationId, data.customerId);

    if (!customer.name?.trim()) {
      throw new ValidationError('Customer name is required before creating a Xero contact');
    }

    const createdContact = await createXeroContact(ctx.organizationId, {
      name: customer.name,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      legalName: customer.legalName ?? null,
    });

    await persistCustomerXeroContact(ctx.organizationId, data.customerId, createdContact.id, ctx.user.id);

    return {
      customerId: data.customerId,
      xeroContactId: createdContact.id,
      mappedContact: {
        id: createdContact.id,
        name: createdContact.name,
        email: createdContact.email,
        phones: createdContact.phones,
      },
    };
  });

export const linkCustomerXeroContact = createServerFn({ method: 'POST' })
  .inputValidator(linkXeroContactSchema)
  .handler(async ({ data }): Promise<XeroCustomerMappingStatus> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    await assertCustomerAccess(ctx.organizationId, data.customerId);
    const contact = await getXeroContactById(ctx.organizationId, data.xeroContactId);

    if (!contact) {
      throw new ValidationError('Selected Xero contact could not be found');
    }

    await persistCustomerXeroContact(ctx.organizationId, data.customerId, contact.id, ctx.user.id);

    return {
      customerId: data.customerId,
      xeroContactId: contact.id,
      mappedContact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phones: contact.phones,
      },
    };
  });

export const unlinkCustomerXeroContact = createServerFn({ method: 'POST' })
  .inputValidator(customerIdSchema)
  .handler(async ({ data }): Promise<XeroCustomerMappingStatus> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    await assertCustomerAccess(ctx.organizationId, data.customerId);

    await db
      .update(customers)
      .set({
        xeroContactId: null,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      );

    return {
      customerId: data.customerId,
      xeroContactId: null,
      mappedContact: null,
    };
  });

export const listRecentXeroPaymentEvents = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(listXeroPaymentEventsSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });
    const offset = (data.page - 1) * data.pageSize;

    const [countResult, items] = await Promise.all([
      db
        .select({ count: count() })
        .from(xeroPaymentEvents)
        .where(eq(xeroPaymentEvents.organizationId, ctx.organizationId)),
      db
        .select({
          id: xeroPaymentEvents.id,
          orderId: xeroPaymentEvents.orderId,
          dedupeKey: xeroPaymentEvents.dedupeKey,
          xeroInvoiceId: xeroPaymentEvents.xeroInvoiceId,
          paymentId: xeroPaymentEvents.paymentId,
          amount: xeroPaymentEvents.amount,
          paymentDate: xeroPaymentEvents.paymentDate,
          reference: xeroPaymentEvents.reference,
          resultState: xeroPaymentEvents.resultState,
          processedAt: xeroPaymentEvents.processedAt,
          payload: xeroPaymentEvents.payload,
        })
        .from(xeroPaymentEvents)
        .where(eq(xeroPaymentEvents.organizationId, ctx.organizationId))
        .orderBy(desc(xeroPaymentEvents.processedAt))
        .limit(data.pageSize)
        .offset(offset),
    ]);

    const normalizedItems: XeroPaymentEventRecord[] = items.map((item) => ({
        ...item,
        amount: safeNumber(item.amount),
        processedAt: item.processedAt.toISOString(),
        resultState: (item.resultState as XeroPaymentEventRecord['resultState']) ?? 'processing',
        payloadSummary: {
          payload:
            typeof item.payload === 'object' && item.payload
            ? (item.payload as Record<string, object>)
              : {},
          invoice: { id: item.xeroInvoiceId },
          payment: {
            id: item.paymentId ?? '',
            date: item.paymentDate,
            reference: item.reference ?? '',
          },
        },
        outcomeTitle:
          item.resultState === 'duplicate'
            ? 'Duplicate replay'
            : item.resultState === 'applied'
              ? 'Payment applied'
              : item.resultState === 'unknown_invoice'
                ? 'Invoice not found'
                : item.resultState === 'rejected'
                  ? 'Payment rejected'
                  : 'Payment processing',
        outcomeMessage:
          item.resultState === 'duplicate'
            ? 'This webhook event was already processed. No payment was applied twice.'
            : item.resultState === 'applied'
              ? 'The payment was recorded on the linked order.'
              : item.resultState === 'unknown_invoice'
                ? 'No local order matched this Xero invoice ID.'
                : item.resultState === 'rejected'
                  ? 'The webhook was accepted but the payment could not be safely applied.'
                  : 'This payment event is still being processed.',
      }));

    return {
      total: Number(countResult[0]?.count ?? 0),
      items: normalizedItems,
    };
  });

async function assertCustomerAccess(organizationId: string, customerId: string) {
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
      )
    )
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found', 'customer');
  }
}

async function getCustomerForMapping(organizationId: string, customerId: string) {
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      legalName: customers.legalName,
      email: customers.email,
      phone: customers.phone,
    })
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
      )
    )
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found', 'customer');
  }

  return customer;
}

async function persistCustomerXeroContact(
  organizationId: string,
  customerId: string,
  xeroContactId: string,
  userId: string
) {
  await db
    .update(customers)
    .set({
      xeroContactId,
      updatedBy: userId,
    })
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
      )
    );
}

function rankContactMatches(
  contacts: XeroContactSummary[],
  query: string
): SearchXeroContactResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  type MatchReason = SearchXeroContactResult['matchReason'];

  return contacts
    .map((contact) => {
      const name = contact.name.toLowerCase();
      const email = contact.email?.toLowerCase() ?? '';
      const contactNumber = contact.contactNumber?.toLowerCase() ?? '';
      const matchReason: MatchReason =
        email && email === normalizedQuery
          ? 'exact_email'
          : name.includes(normalizedQuery)
            ? 'name_match'
            : contactNumber.includes(normalizedQuery)
              ? 'contact_number'
              : 'fallback';

      return {
        ...contact,
        matchReason,
      };
    })
    .sort((a, b) => {
      const rank = {
        exact_email: 0,
        name_match: 1,
        contact_number: 2,
        fallback: 3,
      } as const;

      const diff =
        rank[a.matchReason as keyof typeof rank] - rank[b.matchReason as keyof typeof rank];
      if (diff !== 0) {
        return diff;
      }

      return a.name.localeCompare(b.name);
    });
}
