/**
 * Credit Notes Zod Schemas
 *
 * Validation schemas for credit note operations.
 * Credit notes handle battery equipment returns, adjustments, and refunds.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-001b
 */

import { z } from 'zod';
import {
  idSchema,
  idParamSchema,
  paginationSchema,
  filterSchema,
  currencySchema,
} from '../_shared/patterns';

// ============================================================================
// ENUMS (must match drizzle/schema/enums.ts)
// ============================================================================

export const creditNoteStatusValues = ['draft', 'issued', 'applied', 'voided'] as const;

export const creditNoteStatusSchema = z.enum(creditNoteStatusValues);

export type CreditNoteStatus = z.infer<typeof creditNoteStatusSchema>;

// ============================================================================
// CREATE CREDIT NOTE
// ============================================================================

/**
 * Schema for creating a new credit note.
 *
 * Amount is in AUD (e.g., 1500.00 for $1,500).
 * GST is automatically calculated as 10% if not provided.
 */
export const createCreditNoteSchema = z.object({
  // Customer is required
  customerId: idSchema,

  // Related order/invoice (optional - can be standalone credit)
  orderId: idSchema.optional(),

  // Amount in AUD
  amount: currencySchema.positive('Amount must be greater than 0'),

  // GST amount (optional - calculated as 10% if not provided)
  gstAmount: currencySchema.optional(),

  // Reason for credit note
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or less'),

  // Optional internal notes
  internalNotes: z.string().max(2000).optional(),
});

export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;

// ============================================================================
// UPDATE CREDIT NOTE
// ============================================================================

/**
 * Schema for updating a credit note (draft status only).
 */
export const updateCreditNoteSchema = z.object({
  amount: currencySchema.positive('Amount must be greater than 0').optional(),
  gstAmount: currencySchema.optional(),
  reason: z.string().min(1).max(500).optional(),
  internalNotes: z.string().max(2000).optional().nullable(),
});

export type UpdateCreditNoteInput = z.infer<typeof updateCreditNoteSchema>;

// ============================================================================
// ISSUE CREDIT NOTE
// ============================================================================

/**
 * Schema for issuing a draft credit note.
 * Transitions status from 'draft' to 'issued'.
 */
export const issueCreditNoteSchema = idParamSchema;

export type IssueCreditNoteInput = z.infer<typeof issueCreditNoteSchema>;

// ============================================================================
// APPLY CREDIT NOTE
// ============================================================================

/**
 * Schema for applying a credit note to an invoice/order.
 * Transitions status from 'issued' to 'applied'.
 */
export const applyCreditNoteSchema = z.object({
  creditNoteId: idSchema,
  orderId: idSchema,
});

export type ApplyCreditNoteInput = z.infer<typeof applyCreditNoteSchema>;

// ============================================================================
// VOID CREDIT NOTE
// ============================================================================

/**
 * Schema for voiding a credit note.
 * Can void draft or issued credit notes.
 */
export const voidCreditNoteSchema = z.object({
  id: idSchema,
  voidReason: z
    .string()
    .min(1, 'Void reason is required')
    .max(500, 'Void reason must be 500 characters or less'),
});

export type VoidCreditNoteInput = z.infer<typeof voidCreditNoteSchema>;

// ============================================================================
// LIST CREDIT NOTES QUERY
// ============================================================================

/**
 * Query parameters for listing credit notes.
 */
export const creditNoteListQuerySchema = paginationSchema.merge(filterSchema).extend({
  status: creditNoteStatusSchema.optional(),
  customerId: idSchema.optional(),
  orderId: idSchema.optional(),
});

export type CreditNoteListQuery = z.infer<typeof creditNoteListQuerySchema>;

// ============================================================================
// CREDIT NOTE BY CUSTOMER QUERY
// ============================================================================

/**
 * Query parameters for getting credit notes by customer.
 */
export const creditNotesByCustomerQuerySchema = paginationSchema.extend({
  customerId: idSchema,
  includeApplied: z.boolean().default(false),
});

export type CreditNotesByCustomerQuery = z.infer<typeof creditNotesByCustomerQuerySchema>;
