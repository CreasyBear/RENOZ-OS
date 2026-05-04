/**
 * Payment reminder queue helpers.
 */

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers as customersTable,
  orders,
  reminderHistory,
  reminderTemplates,
} from 'drizzle/schema';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import { sendReminderSchema, type TemplateVariables } from '@/lib/schemas';
import {
  calculateDaysOverdue as calcDaysOverdue,
  formatAUD,
  formatDateForDisplay,
  getEffectiveDueDate,
  renderTemplate,
} from '@/lib/utils/financial';
import type { z } from 'zod';

const PAYMENT_TERMS_DAYS = 30;
function calculateDaysOverdue(dueDate: Date): number {
  return calcDaysOverdue(dueDate, new Date());
}

export async function queueManualPaymentReminder(
  ctx: SessionContext,
  data: z.infer<typeof sendReminderSchema>,
) {
  const { orderId, templateId, recipientEmail, notes } = data;

  // Get order details
  const orderResult = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      orderDate: orders.orderDate,
      dueDate: orders.dueDate,
      total: orders.total,
      balanceDue: orders.balanceDue,
      paidAmount: orders.paidAmount,
      customerId: orders.customerId,
      customerName: customersTable.name,
      customerEmail: customersTable.email,
    })
    .from(orders)
    .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt),
      ),
    )
    .limit(1);

  if (orderResult.length === 0) {
    throw new NotFoundError('Order not found');
  }

  const order = orderResult[0];
  const email = recipientEmail ?? order.customerEmail;

  if (!email) {
    throw new ValidationError('No email address available for customer');
  }

  // Calculate days overdue
  const effectiveDueDate = getEffectiveDueDate(
    order.orderDate,
    order.dueDate,
    PAYMENT_TERMS_DAYS,
  );
  const daysOverdue = calculateDaysOverdue(effectiveDueDate);

  // Get template
  let template;
  if (templateId) {
    const templateResult = await db
      .select()
      .from(reminderTemplates)
      .where(
        and(
          eq(reminderTemplates.id, templateId),
          eq(reminderTemplates.organizationId, ctx.organizationId),
        ),
      )
      .limit(1);

    if (templateResult.length === 0) {
      throw new NotFoundError('Template not found');
    }
    template = templateResult[0];
  } else {
    // Find template matching days overdue (closest match)
    const templateResult = await db
      .select()
      .from(reminderTemplates)
      .where(
        and(
          eq(reminderTemplates.organizationId, ctx.organizationId),
          eq(reminderTemplates.isActive, true),
          lte(reminderTemplates.daysOverdue, daysOverdue),
        ),
      )
      .orderBy(desc(reminderTemplates.daysOverdue))
      .limit(1);

    if (templateResult.length === 0) {
      throw new ValidationError(
        'No active template found for this overdue period',
      );
    }
    template = templateResult[0];
  }

  // Prepare template variables
  const balanceDue =
    order.balanceDue ?? (order.total ?? 0) - (order.paidAmount ?? 0);
  const variables: TemplateVariables = {
    customerName: order.customerName ?? 'Customer',
    invoiceNumber: order.orderNumber,
    invoiceAmount: formatAUD(balanceDue),
    invoiceDate: formatDateForDisplay(new Date(order.orderDate)),
    dueDate: formatDateForDisplay(effectiveDueDate),
    daysOverdue: Math.max(0, daysOverdue),
    orderDescription: `Order ${order.orderNumber}`,
    paymentTerms: `Net ${PAYMENT_TERMS_DAYS} days`,
  };

  // Render subject and body (renderTemplate expects string values)
  const stringVars = {
    ...variables,
    daysOverdue: String(variables.daysOverdue),
  };
  const renderedSubject = renderTemplate(template.subject, stringVars);
  const renderedBody = renderTemplate(template.body, stringVars);

  // Record in history
  const [historyRecord] = await db
    .insert(reminderHistory)
    .values({
      organizationId: ctx.organizationId,
      orderId,
      templateId: template.id,
      templateName: template.name,
      daysOverdue: template.daysOverdue,
      subjectSent: renderedSubject,
      bodySent: renderedBody,
      recipientEmail: email,
      sentAt: new Date(),
      deliveryStatus: 'queued',
      isManualSend: true,
      notes,
      createdBy: ctx.user.id,
    })
    .returning();

  return {
    id: historyRecord.id,
    subject: renderedSubject,
    body: renderedBody,
    recipientEmail: email,
  };
}

interface ReminderJobLogger {
  info(message: string, payload?: Record<string, unknown>): void;
  error(message: string, payload?: Record<string, unknown>): void;
}

export interface ProcessPaymentReminderOrganizationResult {
  ordersProcessed: number;
  remindersQueued: number;
  remindersSkipped: number;
  errors: number;
}

export async function processPaymentReminderOrganization(params: {
  organizationId: string;
  logger: ReminderJobLogger;
  maxOrders?: number;
}): Promise<ProcessPaymentReminderOrganizationResult> {
  const { organizationId, logger, maxOrders = 100 } = params;
  let ordersProcessed = 0;
  let remindersQueued = 0;
  let remindersSkipped = 0;
  let errors = 0;

  const activeTemplates = await db
    .select({
      id: reminderTemplates.id,
      name: reminderTemplates.name,
      daysOverdue: reminderTemplates.daysOverdue,
      subject: reminderTemplates.subject,
      body: reminderTemplates.body,
    })
    .from(reminderTemplates)
    .where(
      and(
        eq(reminderTemplates.organizationId, organizationId),
        eq(reminderTemplates.isActive, true),
      ),
    )
    .orderBy(asc(reminderTemplates.daysOverdue));

  if (activeTemplates.length === 0) {
    logger.info(
      `No active templates for organization ${organizationId}, skipping`,
    );
    return { ordersProcessed, remindersQueued, remindersSkipped, errors };
  }

  const outstandingOrders = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderDate: orders.orderDate,
      dueDate: orders.dueDate,
      total: orders.total,
      paidAmount: orders.paidAmount,
      balanceDue: orders.balanceDue,
      customerId: orders.customerId,
      customerName: customersTable.name,
      customerEmail: customersTable.email,
    })
    .from(orders)
    .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
    .where(
      and(
        eq(orders.organizationId, organizationId),
        isNull(orders.deletedAt),
        ne(orders.status, 'draft'),
        ne(orders.status, 'cancelled'),
        or(
          gt(orders.balanceDue, sql`0`),
          and(
            isNull(orders.balanceDue),
            sql`COALESCE(${orders.total}, 0) > COALESCE(${orders.paidAmount}, 0)`,
          ),
        ),
      ),
    )
    .limit(maxOrders);

  if (outstandingOrders.length === 0) {
    logger.info(`No outstanding orders for organization ${organizationId}`);
    return { ordersProcessed, remindersQueued, remindersSkipped, errors };
  }

  const orderIds = outstandingOrders.map((order) => order.orderId);
  const reminderHistoryMap = new Map<
    string,
    { sentAt: Date; daysOverdue: number | null }
  >();

  if (orderIds.length > 0) {
    const historyResult = await db
      .select({
        orderId: reminderHistory.orderId,
        sentAt: reminderHistory.sentAt,
        daysOverdue: reminderHistory.daysOverdue,
      })
      .from(reminderHistory)
      .where(
        and(
          eq(reminderHistory.organizationId, organizationId),
          inArray(reminderHistory.orderId, orderIds),
        ),
      )
      .orderBy(desc(reminderHistory.sentAt));

    for (const history of historyResult) {
      if (!reminderHistoryMap.has(history.orderId)) {
        reminderHistoryMap.set(history.orderId, {
          sentAt: history.sentAt,
          daysOverdue: history.daysOverdue,
        });
      }
    }
  }

  for (const order of outstandingOrders) {
    try {
      const effectiveDueDate = getEffectiveDueDate(
        order.orderDate,
        order.dueDate,
        PAYMENT_TERMS_DAYS,
      );
      const daysOverdue = calculateDaysOverdue(effectiveDueDate);
      if (daysOverdue < 1) continue;

      const balanceDue =
        order.balanceDue ?? (order.total ?? 0) - (order.paidAmount ?? 0);
      if (balanceDue <= 0) continue;

      let matchingTemplate = null;
      for (const template of activeTemplates) {
        if (daysOverdue >= template.daysOverdue) matchingTemplate = template;
      }

      if (!matchingTemplate) {
        logger.info(
          `No matching template for order ${order.orderNumber} (${daysOverdue} days overdue)`,
        );
        remindersSkipped++;
        continue;
      }

      const lastReminder = reminderHistoryMap.get(order.orderId);
      if (
        lastReminder?.daysOverdue != null &&
        lastReminder.daysOverdue >= matchingTemplate.daysOverdue
      ) {
        logger.info(
          `Order ${order.orderNumber} already reminded at tier ${lastReminder.daysOverdue}, skipping`,
        );
        remindersSkipped++;
        continue;
      }

      if (!order.customerEmail) {
        logger.info(
          `No email address for customer ${order.customerId}, skipping`,
        );
        remindersSkipped++;
        continue;
      }

      const variables: Record<string, string> = {
        customerName: order.customerName ?? 'Customer',
        invoiceNumber: order.orderNumber,
        invoiceAmount: formatAUD(balanceDue),
        invoiceDate: formatDateForDisplay(new Date(order.orderDate)),
        dueDate: formatDateForDisplay(effectiveDueDate),
        daysOverdue: String(Math.max(0, daysOverdue)),
        orderDescription: `Order ${order.orderNumber}`,
        paymentTerms: `Net ${PAYMENT_TERMS_DAYS} days`,
      };

      await db.insert(reminderHistory).values({
        organizationId,
        orderId: order.orderId,
        templateId: matchingTemplate.id,
        templateName: matchingTemplate.name,
        daysOverdue: matchingTemplate.daysOverdue,
        subjectSent: renderTemplate(matchingTemplate.subject, variables),
        bodySent: renderTemplate(matchingTemplate.body, variables),
        recipientEmail: order.customerEmail,
        sentAt: new Date(),
        deliveryStatus: 'queued',
        isManualSend: false,
        createdBy: null,
      });

      logger.info(
        `Queued reminder for order ${order.orderNumber} (${daysOverdue} days overdue)`,
      );
      remindersQueued++;
      ordersProcessed++;
    } catch (error) {
      logger.error(`Error processing order ${order.orderId}:`, {
        error: error instanceof Error ? error : String(error),
      });
      errors++;
    }
  }

  return { ordersProcessed, remindersQueued, remindersSkipped, errors };
}
