import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderLineItems, jobAssignments, quotes, quoteVersions } from 'drizzle/schema';
import { getActivePortalIdentity } from './_shared';
import {
  portalListSchema,
  portalOrderParamsSchema,
  portalQuoteParamsSchema,
} from '@/lib/schemas/portal';
import {
  sanitizeJobAssignmentForPortal,
  sanitizeOrderForPortal,
  sanitizeOrderLineItemForPortal,
  sanitizeQuoteForPortal,
  sanitizeQuoteVersionForPortal,
} from '@/lib/portal/field-suppression';

// ============================================================================
// LIST PORTAL ORDERS
// ============================================================================

export const listPortalOrders = createServerFn({ method: 'GET' })
  .inputValidator(portalListSchema)
  .handler(async ({ data }) => {
    const identity = await getActivePortalIdentity();
    const offset = (data.page - 1) * data.pageSize;

    let orderIds: string[] | null = null;
    if (identity.scope === 'subcontractor' && identity.jobAssignmentId) {
      const [job] = await db
        .select({ orderId: jobAssignments.orderId })
        .from(jobAssignments)
        .where(eq(jobAssignments.id, identity.jobAssignmentId))
        .limit(1);
      orderIds = job?.orderId ? [job.orderId] : [];
    }

    const conditions = [
      eq(orders.organizationId, identity.organizationId),
      identity.scope === 'customer' && identity.customerId
        ? eq(orders.customerId, identity.customerId)
        : sql`true`,
      orderIds ? inArray(orders.id, orderIds) : sql`true`,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(data.pageSize)
      .offset(offset);

    return rows.map((order) => sanitizeOrderForPortal(order));
  });

// ============================================================================
// GET PORTAL ORDER + LINE ITEMS
// ============================================================================

export const getPortalOrder = createServerFn({ method: 'GET' })
  .inputValidator(portalOrderParamsSchema)
  .handler(async ({ data }) => {
    const identity = await getActivePortalIdentity();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, identity.organizationId),
          identity.scope === 'customer' && identity.customerId
            ? eq(orders.customerId, identity.customerId)
            : sql`true`
        )
      )
      .limit(1);

    if (!order) {
      return null;
    }

    if (identity.scope === 'subcontractor' && identity.jobAssignmentId) {
      const [job] = await db
        .select({ orderId: jobAssignments.orderId })
        .from(jobAssignments)
        .where(eq(jobAssignments.id, identity.jobAssignmentId))
        .limit(1);
      if (!job?.orderId || job.orderId !== order.id) {
        return null;
      }
    }

    const lineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, order.id))
      .orderBy(orderLineItems.lineNumber);

    return {
      order: sanitizeOrderForPortal(order),
      lineItems: lineItems.map((lineItem) => sanitizeOrderLineItemForPortal(lineItem)),
    };
  });

// ============================================================================
// LIST PORTAL JOB ASSIGNMENTS
// ============================================================================

export const listPortalJobs = createServerFn({ method: 'GET' })
  .inputValidator(portalListSchema)
  .handler(async ({ data }) => {
    const identity = await getActivePortalIdentity();
    const offset = (data.page - 1) * data.pageSize;

    const conditions = [
      eq(jobAssignments.organizationId, identity.organizationId),
      identity.scope === 'customer' && identity.customerId
        ? eq(jobAssignments.customerId, identity.customerId)
        : sql`true`,
      identity.scope === 'subcontractor' && identity.jobAssignmentId
        ? eq(jobAssignments.id, identity.jobAssignmentId)
        : sql`true`,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(jobAssignments)
      .where(and(...conditions))
      .orderBy(desc(jobAssignments.createdAt))
      .limit(data.pageSize)
      .offset(offset);

    return rows.map((job) => sanitizeJobAssignmentForPortal(job));
  });

// ============================================================================
// LIST PORTAL QUOTES
// ============================================================================

export const listPortalQuotes = createServerFn({ method: 'GET' })
  .inputValidator(portalListSchema)
  .handler(async ({ data }) => {
    const identity = await getActivePortalIdentity();
    const offset = (data.page - 1) * data.pageSize;

    if (identity.scope !== 'customer' || !identity.customerId) {
      return [];
    }

    const rows = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.organizationId, identity.organizationId),
          eq(quotes.customerId, identity.customerId)
        )
      )
      .orderBy(desc(quotes.createdAt))
      .limit(data.pageSize)
      .offset(offset);

    return rows.map((quote) => sanitizeQuoteForPortal(quote));
  });

// ============================================================================
// LIST QUOTE VERSIONS (BY QUOTE)
// ============================================================================

export const listPortalQuoteVersions = createServerFn({ method: 'GET' })
  .inputValidator(portalQuoteParamsSchema)
  .handler(async ({ data }) => {
    const identity = await getActivePortalIdentity();

    if (identity.scope !== 'customer' || !identity.customerId) {
      return [];
    }

    const [quote] = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.id, data.id),
          eq(quotes.organizationId, identity.organizationId),
          eq(quotes.customerId, identity.customerId)
        )
      )
      .limit(1);

    if (!quote?.opportunityId) {
      return [];
    }

    const rows = await db
      .select()
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.organizationId, identity.organizationId),
          eq(quoteVersions.opportunityId, quote.opportunityId)
        )
      )
      .orderBy(desc(quoteVersions.versionNumber));

    return rows.map((version) => sanitizeQuoteVersionForPortal(version));
  });
