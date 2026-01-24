/**
 * Payment Reminders Zod Schemas
 *
 * Validation schemas for payment reminder template and history operations.
 * Reminders notify customers of overdue battery equipment invoices.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-006b
 */

import { z } from 'zod';
import { idSchema, paginationSchema } from '../_shared/patterns';

// ============================================================================
// DELIVERY STATUS ENUM
// ============================================================================

export const deliveryStatusValues = ['sent', 'delivered', 'bounced', 'failed'] as const;

export const deliveryStatusSchema = z.enum(deliveryStatusValues);

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

// ============================================================================
// CREATE REMINDER TEMPLATE
// ============================================================================

/**
 * Schema for creating a new reminder template.
 */
export const createReminderTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  daysOverdue: z.number().int().min(1, 'Days overdue must be at least 1'),
  subject: z.string().min(1, 'Subject is required').max(255),
  body: z.string().min(1, 'Body is required').max(10000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type CreateReminderTemplateInput = z.infer<typeof createReminderTemplateSchema>;

// ============================================================================
// UPDATE REMINDER TEMPLATE
// ============================================================================

/**
 * Schema for updating a reminder template.
 */
export const updateReminderTemplateSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100).optional(),
  daysOverdue: z.number().int().min(1).optional(),
  subject: z.string().min(1).max(255).optional(),
  body: z.string().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateReminderTemplateInput = z.infer<typeof updateReminderTemplateSchema>;

// ============================================================================
// LIST TEMPLATES QUERY
// ============================================================================

/**
 * Query parameters for listing reminder templates.
 */
export const reminderTemplateListQuerySchema = paginationSchema.extend({
  includeInactive: z.boolean().default(false),
});

export type ReminderTemplateListQuery = z.infer<typeof reminderTemplateListQuerySchema>;

// ============================================================================
// SEND REMINDER (MANUAL)
// ============================================================================

/**
 * Schema for manually sending a reminder for an order.
 */
export const sendReminderSchema = z.object({
  orderId: idSchema,
  templateId: idSchema.optional(), // If not provided, uses default template for days overdue
  recipientEmail: z.string().email('Invalid email address').optional(), // Override customer email
  notes: z.string().max(500).optional(),
});

export type SendReminderInput = z.infer<typeof sendReminderSchema>;

// ============================================================================
// LIST REMINDER HISTORY QUERY
// ============================================================================

/**
 * Query parameters for listing reminder history.
 */
export const reminderHistoryQuerySchema = paginationSchema.extend({
  orderId: idSchema.optional(),
  customerId: idSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  deliveryStatus: deliveryStatusSchema.optional(),
});

export type ReminderHistoryQuery = z.infer<typeof reminderHistoryQuerySchema>;

// ============================================================================
// GET OVERDUE ORDERS FOR REMINDERS
// ============================================================================

/**
 * Query parameters for getting orders due for reminders.
 */
export const overdueOrdersForRemindersQuerySchema = paginationSchema.extend({
  // Minimum days overdue (default: 1)
  minDaysOverdue: z.number().int().min(1).default(1),

  // Only get orders matching a specific template's days
  matchTemplateDays: z.boolean().default(false),

  // Exclude orders that already received a reminder at this tier
  excludeAlreadyReminded: z.boolean().default(true),
});

export type OverdueOrdersForRemindersQuery = z.infer<typeof overdueOrdersForRemindersQuerySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Reminder template with usage stats.
 */
export interface ReminderTemplateWithStats {
  id: string;
  name: string;
  daysOverdue: number;
  subject: string;
  body: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  // Stats
  totalSent: number;
  lastSentAt: Date | null;
}

/**
 * Reminder history record with order info.
 */
export interface ReminderHistoryWithOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  templateId: string | null;
  templateName: string | null;
  daysOverdue: number | null;
  subjectSent: string | null;
  bodySent: string | null;
  recipientEmail: string;
  sentAt: Date;
  deliveryStatus: DeliveryStatus;
  deliveryError: string | null;
  isManualSend: boolean;
  notes: string | null;
}

/**
 * Order eligible for reminder.
 */
export interface OrderForReminder {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  dueDate: Date;
  daysOverdue: number;
  balanceDue: number;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  lastReminderSentAt: Date | null;
  lastReminderDaysOverdue: number | null;
  matchingTemplateId: string | null;
  matchingTemplateName: string | null;
}

/**
 * Template variable values for rendering.
 */
export interface TemplateVariables {
  customerName: string;
  invoiceNumber: string;
  invoiceAmount: string; // Formatted AUD
  invoiceDate: string; // Formatted date
  dueDate: string; // Formatted date
  daysOverdue: number;
  orderDescription: string;
  paymentTerms: string;
}
