import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ServerError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { opportunityParamsSchema } from '@/lib/schemas';
import type { QuoteLineItem } from '@/lib/schemas/pipeline';
import type { CreateOrder } from '@/lib/schemas/orders';
import { createOrder } from '@/server/functions/orders/orders';
import { opportunities, opportunityActivities, quoteVersions } from 'drizzle/schema';

type ConversionOrderEvidence = {
  id: string;
  orderNumber: string;
};

type OpportunityMetadataPersistence = NonNullable<typeof opportunities.$inferInsert.metadata>;

function buildConversionOpportunityWhere(id: string, organizationId: string) {
  return and(
    eq(opportunities.id, id),
    eq(opportunities.organizationId, organizationId),
    isNull(opportunities.deletedAt)
  );
}

/**
 * Map quote line items to CreateOrder line items.
 * Uses latest quote version. Generates lineNumber as "1", "2", ...
 */
function quoteToOrderPayload(
  opportunity: { id: string; customerId: string | null },
  quoteVersionId: string,
  items: QuoteLineItem[]
): CreateOrder {
  if (!opportunity.customerId) {
    throw new ValidationError('Opportunity must have a customer to convert to order');
  }
  if (items.length === 0) {
    throw new ValidationError('Quote must have at least one line item to convert');
  }

  const lineItems = items.map((item, index) => {
    if (!item.description || item.quantity == null || item.unitPrice == null) {
      throw new ValidationError(
        `Quote line item ${index + 1} missing required fields (description, quantity, unitPrice)`
      );
    }
    return {
      lineNumber: (index + 1).toString(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      productId: item.productId,
      sku: item.sku,
      discountPercent: item.discountPercent,
      taxType: 'gst' as const,
    };
  });

  return {
    clientRequestId: `opportunity-convert:${opportunity.id}:${quoteVersionId}`,
    customerId: opportunity.customerId,
    status: 'draft',
    paymentStatus: 'pending',
    shippingAmount: 0,
    metadata: { externalRef: `opportunity:${opportunity.id}` },
    lineItems,
  };
}

async function recordOpportunityOrderConversion(params: {
  organizationId: string;
  opportunityId: string;
  quoteVersionId: string;
  existingMetadata: unknown;
  order: ConversionOrderEvidence;
  createdBy: string;
}): Promise<void> {
  const {
    organizationId,
    opportunityId,
    quoteVersionId,
    existingMetadata,
    order,
    createdBy,
  } = params;
  const currentMetadata =
    existingMetadata && typeof existingMetadata === 'object'
      ? (existingMetadata as Record<string, unknown>)
      : {};
  const sameConvertedOrder = currentMetadata.convertedOrderId === order.id;
  const convertedAt =
    sameConvertedOrder && typeof currentMetadata.convertedAt === 'string'
      ? currentMetadata.convertedAt
      : new Date().toISOString();
  const conversionOutcome = `order:${order.id}`;
  const conversionMetadata = {
    ...currentMetadata,
    convertedOrderId: order.id,
    convertedOrderNumber: order.orderNumber,
    convertedQuoteVersionId: quoteVersionId,
    convertedAt,
  } as Record<string, unknown> as OpportunityMetadataPersistence;

  await db.transaction(async (tx) => {
    const [updatedOpportunity] = await tx
      .update(opportunities)
      .set({
        metadata: conversionMetadata,
        updatedBy: createdBy,
        version: sql`${opportunities.version} + 1`,
      })
      .where(buildConversionOpportunityWhere(opportunityId, organizationId))
      .returning({ id: opportunities.id });

    if (!updatedOpportunity) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const [existingConversionActivity] = await tx
      .select({ id: opportunityActivities.id })
      .from(opportunityActivities)
      .where(
        and(
          eq(opportunityActivities.organizationId, organizationId),
          eq(opportunityActivities.opportunityId, opportunityId),
          eq(opportunityActivities.type, 'note'),
          eq(opportunityActivities.outcome, conversionOutcome)
        )
      )
      .limit(1);

    if (existingConversionActivity) {
      return;
    }

    const [conversionActivity] = await tx
      .insert(opportunityActivities)
      .values({
        organizationId,
        opportunityId,
        type: 'note',
        description: `Converted to order ${order.orderNumber}`,
        outcome: conversionOutcome,
        completedAt: new Date(),
        createdBy,
      })
      .returning({ id: opportunityActivities.id });

    if (!conversionActivity) {
      throw new ServerError(
        'Unable to record opportunity conversion',
        500,
        'PIPELINE_OPPORTUNITY_CONVERSION_ACTIVITY_FAILED'
      );
    }
  });
}

/**
 * Convert a won opportunity to an order.
 *
 * Uses latest quote version. Maps quote line items to order line items.
 */
export const convertToOrder = createServerFn({ method: 'POST' })
  .inputValidator(opportunityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity.update,
    });

    const { id } = data;

    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(buildConversionOpportunityWhere(id, ctx.organizationId))
      .limit(1);

    if (!opportunity) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    if (opportunity.stage !== 'won') {
      throw new ValidationError('Only won opportunities can be converted to orders');
    }

    if (opportunity.quoteExpiresAt && new Date(opportunity.quoteExpiresAt) < new Date()) {
      throw new ValidationError(
        'Quote has expired. Please extend validity or create a new quote before converting.'
      );
    }

    const [latestQuote] = await db
      .select({
        id: quoteVersions.id,
        items: quoteVersions.items,
      })
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.opportunityId, id),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(quoteVersions.versionNumber))
      .limit(1);

    if (!latestQuote || !latestQuote.items || latestQuote.items.length === 0) {
      throw new ValidationError(
        'No quote with line items found. Create and approve a quote before converting.'
      );
    }

    const payload = quoteToOrderPayload(
      { id: opportunity.id, customerId: opportunity.customerId },
      latestQuote.id,
      latestQuote.items as QuoteLineItem[]
    );

    const order = await createOrder({ data: payload });

    await recordOpportunityOrderConversion({
      organizationId: ctx.organizationId,
      opportunityId: id,
      quoteVersionId: latestQuote.id,
      existingMetadata: opportunity.metadata,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
      createdBy: ctx.user.id,
    });

    return {
      success: true,
      order,
      opportunityId: id,
    };
  });
