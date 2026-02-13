/**
 * Payment Reminders Server Functions
 *
 * Template management, manual send, and history tracking for payment reminders.
 * Used to notify customers of overdue battery equipment invoices.
 *
 * The automated daily job (Trigger.dev) would call these functions.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-006b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, isNull, desc, gte, lte, asc, gt, ne, or, inArray, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  reminderTemplates,
  reminderHistory,
  orders,
  customers as customersTable,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  idParamSchema,
  createReminderTemplateSchema,
  updateReminderTemplateSchema,
  reminderTemplateListQuerySchema,
  sendReminderSchema,
  reminderHistoryQuerySchema,
  overdueOrdersForRemindersQuerySchema,
  type ReminderTemplateWithStats,
  type ReminderHistoryWithOrder,
  type OrderForReminder,
  type TemplateVariables,
} from '@/lib/schemas';
import {
  calculateDaysOverdue as calcDaysOverdue,
  getEffectiveDueDate,
  formatAUD,
  formatDateForDisplay,
  renderTemplate,
} from '@/lib/utils/financial';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard payment terms in days */
const PAYMENT_TERMS_DAYS = 30;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate days overdue from due date.
 * Uses shared utility with proper timezone handling.
 */
function calculateDaysOverdue(dueDate: Date): number {
  return calcDaysOverdue(dueDate, new Date());
}

// ============================================================================
// TEMPLATE CRUD
// ============================================================================

/**
 * Create a new reminder template.
 */
export const createReminderTemplate = createServerFn()
  .inputValidator(createReminderTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const [template] = await db
      .insert(reminderTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        daysOverdue: data.daysOverdue,
        subject: data.subject,
        body: data.body,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        createdBy: ctx.user.id,
      })
      .returning();

    return template;
  });

/**
 * Update a reminder template.
 */
export const updateReminderTemplate = createServerFn()
  .inputValidator(updateReminderTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });
    const { id, ...updates } = data;

    // Filter out undefined values
    const setValues: Record<string, unknown> = {};
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.daysOverdue !== undefined) setValues.daysOverdue = updates.daysOverdue;
    if (updates.subject !== undefined) setValues.subject = updates.subject;
    if (updates.body !== undefined) setValues.body = updates.body;
    if (updates.isActive !== undefined) setValues.isActive = updates.isActive;
    if (updates.sortOrder !== undefined) setValues.sortOrder = updates.sortOrder;
    setValues.updatedBy = ctx.user.id;

    const [updated] = await db
      .update(reminderTemplates)
      .set(setValues)
      .where(
        and(eq(reminderTemplates.id, id), eq(reminderTemplates.organizationId, ctx.organizationId))
      )
      .returning();

    if (!updated) {
      throw new NotFoundError('Template not found');
    }

    return updated;
  });

/**
 * Delete a reminder template.
 */
export const deleteReminderTemplate = createServerFn()
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const [deleted] = await db
      .delete(reminderTemplates)
      .where(
        and(
          eq(reminderTemplates.id, data.id),
          eq(reminderTemplates.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: reminderTemplates.id });

    if (!deleted) {
      throw new NotFoundError('Template not found');
    }

    return { success: true };
  });

/**
 * Get a single reminder template.
 */
export const getReminderTemplate = createServerFn()
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [template] = await db
      .select()
      .from(reminderTemplates)
      .where(
        and(
          eq(reminderTemplates.id, data.id),
          eq(reminderTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    return template;
  });

/**
 * List reminder templates with usage stats.
 */
export const listReminderTemplates = createServerFn()
  .inputValidator(reminderTemplateListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { page, pageSize, includeInactive } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [eq(reminderTemplates.organizationId, ctx.organizationId)];
    if (!includeInactive) {
      conditions.push(eq(reminderTemplates.isActive, true));
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(reminderTemplates)
      .where(and(...conditions));

    const totalItems = countResult[0]?.count ?? 0;

    // Get templates with stats
    const templates = await db
      .select({
        id: reminderTemplates.id,
        name: reminderTemplates.name,
        daysOverdue: reminderTemplates.daysOverdue,
        subject: reminderTemplates.subject,
        body: reminderTemplates.body,
        isActive: reminderTemplates.isActive,
        sortOrder: reminderTemplates.sortOrder,
        createdAt: reminderTemplates.createdAt,
        updatedAt: reminderTemplates.updatedAt,
      })
      .from(reminderTemplates)
      .where(and(...conditions))
      .orderBy(asc(reminderTemplates.sortOrder), asc(reminderTemplates.daysOverdue))
      .limit(pageSize)
      .offset(offset);

    // Get all stats in ONE query with GROUP BY instead of N queries
    const templateIds = templates.map((t) => t.id);
    const statsResults =
      templateIds.length > 0
        ? await db
            .select({
              templateId: reminderHistory.templateId,
              totalSent: count(),
              lastSentAt: sql<Date | null>`max(${reminderHistory.sentAt})`,
            })
            .from(reminderHistory)
            .where(inArray(reminderHistory.templateId, templateIds))
            .groupBy(reminderHistory.templateId)
        : [];

    // Build lookup map
    const statsMap = new Map(statsResults.map((s) => [s.templateId, s]));

    // Combine templates with stats
    const items: ReminderTemplateWithStats[] = templates.map((t) => ({
      ...t,
      createdAt: t.createdAt ?? new Date(),
      updatedAt: t.updatedAt ?? new Date(),
      totalSent: statsMap.get(t.id)?.totalSent ?? 0,
      lastSentAt: statsMap.get(t.id)?.lastSentAt ?? null,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

// ============================================================================
// SEND REMINDER
// ============================================================================

/**
 * Manually send a reminder for an order.
 *
 * This records the reminder in history but does NOT actually send email.
 * Email sending would be handled by a separate email service.
 */
export const sendReminder = createServerFn()
  .inputValidator(sendReminderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
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
          isNull(orders.deletedAt)
        )
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
    const effectiveDueDate = getEffectiveDueDate(order.orderDate, order.dueDate, PAYMENT_TERMS_DAYS);
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
            eq(reminderTemplates.organizationId, ctx.organizationId)
          )
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
            lte(reminderTemplates.daysOverdue, daysOverdue)
          )
        )
        .orderBy(desc(reminderTemplates.daysOverdue))
        .limit(1);

      if (templateResult.length === 0) {
        throw new ValidationError('No active template found for this overdue period');
      }
      template = templateResult[0];
    }

    // Prepare template variables
    const balanceDue = order.balanceDue ?? (order.total ?? 0) - (order.paidAmount ?? 0);
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
    const stringVars = { ...variables, daysOverdue: String(variables.daysOverdue) };
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
        deliveryStatus: 'sent',
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
  });

// ============================================================================
// GET ORDERS FOR REMINDERS
// ============================================================================

/**
 * Get orders that are overdue and eligible for reminders.
 *
 * Used by the automated job to find orders to send reminders for.
 * Filtering (minDaysOverdue, matchTemplateDays, excludeAlreadyReminded) is pushed
 * to SQL for proper database-level pagination (SCHEMA-TRACE.md).
 */
export const getOrdersForReminders = createServerFn()
  .inputValidator(overdueOrdersForRemindersQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { page, pageSize, minDaysOverdue, matchTemplateDays, excludeAlreadyReminded } = data;
    const offset = (page - 1) * pageSize;

    // Get active templates for this org
    const activeTemplates = await db
      .select({
        id: reminderTemplates.id,
        name: reminderTemplates.name,
        daysOverdue: reminderTemplates.daysOverdue,
      })
      .from(reminderTemplates)
      .where(
        and(
          eq(reminderTemplates.organizationId, ctx.organizationId),
          eq(reminderTemplates.isActive, true)
        )
      )
      .orderBy(asc(reminderTemplates.daysOverdue));

    // RAW SQL (Phase 11 Keep): EXISTS subqueries, COALESCE date arithmetic. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    const effectiveDueExpr = sql`COALESCE(${orders.dueDate}, (${orders.orderDate} + interval '30 days')::date)`;
    const daysOverdueExpr = sql`(CURRENT_DATE - ${effectiveDueExpr})::integer`;

    const baseConditions = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      ne(orders.status, 'draft'),
      ne(orders.status, 'cancelled'),
      sql`${daysOverdueExpr} >= ${minDaysOverdue}`,
      or(
        gt(orders.balanceDue, 0),
        and(
          isNull(orders.balanceDue),
          sql`COALESCE(${orders.total}, 0) > COALESCE(${orders.paidAmount}, 0)`
        )
      )
    );

    // matchTemplateDays: restrict to orders that have a matching template
    const ordersWithMatch = matchTemplateDays
      ? await db
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
              baseConditions,
              sql`EXISTS (
                SELECT 1 FROM reminder_templates t
                WHERE t.organization_id = ${ctx.organizationId}
                  AND t.is_active = true
                  AND t.days_overdue <= (CURRENT_DATE - ${effectiveDueExpr})::integer
              )`
            )
          )
      : await db
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
          .where(baseConditions);

    // Get reminder history for these orders (for excludeAlreadyReminded and result shape)
    const orderIds = ordersWithMatch.map((o) => o.orderId);
    const reminderHistoryMap = new Map<string, { sentAt: Date; daysOverdue: number | null }>();

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
            eq(reminderHistory.organizationId, ctx.organizationId),
            inArray(reminderHistory.orderId, orderIds)
          )
        )
        .orderBy(desc(reminderHistory.sentAt));

      for (const h of historyResult) {
        if (!reminderHistoryMap.has(h.orderId)) {
          reminderHistoryMap.set(h.orderId, { sentAt: h.sentAt, daysOverdue: h.daysOverdue });
        }
      }
    }

    // Build eligible orders (apply excludeAlreadyReminded and find matching template)
    const eligibleOrders: OrderForReminder[] = [];

    for (const order of ordersWithMatch) {
      const effectiveDueDate = getEffectiveDueDate(order.orderDate, order.dueDate);
      const daysOverdue = calculateDaysOverdue(effectiveDueDate);

      const balanceDue = order.balanceDue ?? (order.total ?? 0) - (order.paidAmount ?? 0);
      if (balanceDue <= 0) continue;

      let matchingTemplate = null;
      for (const t of activeTemplates) {
        if (daysOverdue >= t.daysOverdue) {
          matchingTemplate = t;
        }
      }

      const lastReminder = reminderHistoryMap.get(order.orderId);
      if (excludeAlreadyReminded && lastReminder && matchingTemplate) {
        if (
          lastReminder.daysOverdue !== null &&
          lastReminder.daysOverdue >= matchingTemplate.daysOverdue
        ) {
          continue;
        }
      }

      eligibleOrders.push({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.orderDate),
        dueDate: effectiveDueDate,
        daysOverdue,
        balanceDue,
        customerId: order.customerId,
        customerName: order.customerName ?? 'Unknown',
        customerEmail: order.customerEmail,
        lastReminderSentAt: lastReminder?.sentAt ?? null,
        lastReminderDaysOverdue: lastReminder?.daysOverdue ?? null,
        matchingTemplateId: matchingTemplate?.id ?? null,
        matchingTemplateName: matchingTemplate?.name ?? null,
      });
    }

    eligibleOrders.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totalItems = eligibleOrders.length;
    const paginatedOrders = eligibleOrders.slice(offset, offset + pageSize);

    return {
      items: paginatedOrders,
      templates: activeTemplates,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

// ============================================================================
// REMINDER HISTORY
// ============================================================================

/**
 * Get reminder history with filtering.
 */
export const getReminderHistory = createServerFn()
  .inputValidator(reminderHistoryQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { page, pageSize, orderId, customerId, dateFrom, dateTo, deliveryStatus } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(reminderHistory.organizationId, ctx.organizationId),
    ];

    if (orderId) {
      conditions.push(eq(reminderHistory.orderId, orderId));
    }
    if (dateFrom) {
      conditions.push(gte(reminderHistory.sentAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(reminderHistory.sentAt, dateTo));
    }
    if (deliveryStatus) {
      conditions.push(eq(reminderHistory.deliveryStatus, deliveryStatus));
    }
    if (customerId) {
      conditions.push(eq(orders.customerId, customerId));
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(reminderHistory)
      .innerJoin(orders, eq(reminderHistory.orderId, orders.id))
      .where(and(...conditions));

    const totalItems = countResult[0]?.count ?? 0;

    // Get paginated records
    const records = await db
      .select({
        id: reminderHistory.id,
        orderId: reminderHistory.orderId,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customersTable.name,
        templateId: reminderHistory.templateId,
        templateName: reminderHistory.templateName,
        daysOverdue: reminderHistory.daysOverdue,
        subjectSent: reminderHistory.subjectSent,
        bodySent: reminderHistory.bodySent,
        recipientEmail: reminderHistory.recipientEmail,
        sentAt: reminderHistory.sentAt,
        deliveryStatus: reminderHistory.deliveryStatus,
        deliveryError: reminderHistory.deliveryError,
        isManualSend: reminderHistory.isManualSend,
        notes: reminderHistory.notes,
      })
      .from(reminderHistory)
      .innerJoin(orders, eq(reminderHistory.orderId, orders.id))
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(and(...conditions))
      .orderBy(desc(reminderHistory.sentAt))
      .limit(pageSize)
      .offset(offset);

    const items: ReminderHistoryWithOrder[] = records.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      customerId: r.customerId,
      customerName: r.customerName ?? 'Unknown',
      templateId: r.templateId,
      templateName: r.templateName,
      daysOverdue: r.daysOverdue,
      subjectSent: r.subjectSent,
      bodySent: r.bodySent,
      recipientEmail: r.recipientEmail,
      sentAt: r.sentAt,
      deliveryStatus: r.deliveryStatus as ReminderHistoryWithOrder['deliveryStatus'],
      deliveryError: r.deliveryError,
      isManualSend: r.isManualSend,
      notes: r.notes,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });
