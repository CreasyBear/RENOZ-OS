/**
 * Payment Schedules Zod Schemas
 *
 * Validation schemas for payment plan operations.
 * Payment plans support battery equipment installment tracking.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-002b
 */

import { z } from 'zod';
import { idSchema, paginationSchema, currencySchema } from '../_shared/patterns';

// ============================================================================
// ENUMS (must match drizzle/schema/enums.ts)
// ============================================================================

export const paymentPlanTypeValues = ['fifty_fifty', 'thirds', 'monthly', 'custom'] as const;

export const installmentStatusValues = ['pending', 'due', 'paid', 'overdue'] as const;

export const paymentPlanTypeSchema = z.enum(paymentPlanTypeValues);
export const installmentStatusSchema = z.enum(installmentStatusValues);

export type PaymentPlanType = z.infer<typeof paymentPlanTypeSchema>;
export type InstallmentStatus = z.infer<typeof installmentStatusSchema>;

// ============================================================================
// CUSTOM INSTALLMENT (for custom plans)
// ============================================================================

export const customInstallmentSchema = z.object({
  description: z.string().max(255).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  amount: currencySchema.positive('Amount must be greater than 0'),
  gstAmount: currencySchema.optional(),
});

export type CustomInstallment = z.infer<typeof customInstallmentSchema>;

// ============================================================================
// CREATE PAYMENT PLAN
// ============================================================================

/**
 * Schema for creating a new payment plan.
 *
 * Preset plans:
 * - fifty_fifty: 50% now (deposit), 50% on completion (30 days default)
 * - thirds: 33% now, 33% mid-project, 34% completion
 * - monthly: Equal monthly payments over numberOfPayments months
 * - custom: User-defined installments
 */
export const createPaymentPlanSchema = z
  .object({
    orderId: idSchema,
    planType: paymentPlanTypeSchema,

    // For monthly plans - number of monthly payments
    numberOfPayments: z.number().int().min(2).max(24).optional(),

    // For custom plans - explicit installments
    customInstallments: z.array(customInstallmentSchema).min(2).max(24).optional(),

    // Override default 30-day terms (days from order date for first payment)
    paymentTermsDays: z.number().int().min(0).max(90).default(30),

    // Optional notes
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // monthly requires numberOfPayments
      if (data.planType === 'monthly' && !data.numberOfPayments) {
        return false;
      }
      // custom requires customInstallments
      if (
        data.planType === 'custom' &&
        (!data.customInstallments || data.customInstallments.length < 2)
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        'Monthly plans require numberOfPayments; custom plans require at least 2 installments',
    }
  );

export type CreatePaymentPlanInput = z.infer<typeof createPaymentPlanSchema>;

// ============================================================================
// RECORD INSTALLMENT PAYMENT
// ============================================================================

/**
 * Schema for recording a payment against an installment.
 */
export const recordInstallmentPaymentSchema = z.object({
  installmentId: idSchema,
  paidAmount: currencySchema.positive('Amount must be greater than 0'),
  paymentReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type RecordInstallmentPaymentInput = z.infer<typeof recordInstallmentPaymentSchema>;

// ============================================================================
// GET PAYMENT SCHEDULE
// ============================================================================

/**
 * Schema for getting payment schedule for an order.
 */
export const getPaymentScheduleSchema = z.object({
  orderId: idSchema,
});

export type GetPaymentScheduleInput = z.infer<typeof getPaymentScheduleSchema>;

// ============================================================================
// GET OVERDUE INSTALLMENTS QUERY
// ============================================================================

/**
 * Query parameters for getting overdue installments.
 */
export const overdueInstallmentsQuerySchema = paginationSchema.extend({
  // Filter by customer
  customerId: idSchema.optional(),

  // Minimum days overdue (default: 1)
  minDaysOverdue: z.coerce.number().int().min(1).default(1),

  // Include already-alerted installments
  includeAlerted: z.boolean().default(false),
});

export type OverdueInstallmentsQuery = z.infer<typeof overdueInstallmentsQuerySchema>;

// ============================================================================
// UPDATE INSTALLMENT
// ============================================================================

/**
 * Schema for updating an installment (due date, amount).
 * Only pending installments can be updated.
 */
export const updateInstallmentSchema = z.object({
  installmentId: idSchema,
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  amount: currencySchema.positive().optional(),
  gstAmount: currencySchema.optional(),
  description: z.string().max(255).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>;

// ============================================================================
// DELETE PAYMENT PLAN
// ============================================================================

/**
 * Schema for deleting a payment plan.
 * Only plans with no paid installments can be deleted.
 */
export const deletePaymentPlanSchema = z.object({
  orderId: idSchema,
});

export type DeletePaymentPlanInput = z.infer<typeof deletePaymentPlanSchema>;
