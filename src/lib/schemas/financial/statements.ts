/**
 * Customer Statements Zod Schemas
 *
 * Validation schemas for customer statement generation and history operations.
 * Statements show transaction history and balances for battery equipment sales.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-004b
 */

import { z } from 'zod';
import { idSchema, paginationSchema, currencySchema } from '../_shared/patterns';

// ============================================================================
// GENERATE STATEMENT
// ============================================================================

/**
 * Schema for generating a new customer statement.
 */
export const generateStatementSchema = z
  .object({
    customerId: idSchema,

    // Statement period - YYYY-MM-DD format
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    // Optional notes to include
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type GenerateStatementInput = z.infer<typeof generateStatementSchema>;

// ============================================================================
// SAVE STATEMENT HISTORY
// ============================================================================

/**
 * Schema for saving a generated statement to history.
 * (Usually called internally after PDF generation)
 */
export const saveStatementHistorySchema = z.object({
  customerId: idSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalance: currencySchema,
  closingBalance: currencySchema,
  invoiceCount: z.number().int().nonnegative(),
  paymentCount: z.number().int().nonnegative(),
  creditNoteCount: z.number().int().nonnegative(),
  totalInvoiced: currencySchema,
  totalPayments: currencySchema,
  totalCredits: currencySchema,
  totalGst: currencySchema,
  pdfPath: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export type SaveStatementHistoryInput = z.infer<typeof saveStatementHistorySchema>;

// ============================================================================
// MARK STATEMENT SENT
// ============================================================================

/**
 * Schema for marking a statement as sent (via email).
 */
export const markStatementSentSchema = z.object({
  statementId: idSchema,
  sentToEmail: z.string().email('Invalid email address'),
});

export type MarkStatementSentInput = z.infer<typeof markStatementSentSchema>;

// ============================================================================
// GET STATEMENT HISTORY QUERY
// ============================================================================

/**
 * Query parameters for getting statement history for a customer.
 */
export const statementHistoryQuerySchema = paginationSchema.extend({
  customerId: idSchema,

  // Filter by date range
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type StatementHistoryQuery = z.infer<typeof statementHistoryQuerySchema>;

// ============================================================================
// LIST ALL STATEMENTS QUERY
// ============================================================================

/**
 * Query parameters for listing all statements (admin view).
 */
export const statementListQuerySchema = paginationSchema.extend({
  customerId: idSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  onlySent: z.boolean().default(false),
});

export type StatementListQuery = z.infer<typeof statementListQuerySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Transaction in a statement.
 */
export interface StatementTransaction {
  id: string;
  date: Date;
  type: 'invoice' | 'payment' | 'credit_note';
  reference: string;
  description: string;
  amount: number;
  gstAmount: number;
  balance: number; // Running balance after this transaction
}

/**
 * Generated statement data (before PDF generation).
 */
export interface GeneratedStatement {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;

  // Period
  startDate: Date;
  endDate: Date;

  // Balances
  openingBalance: number;
  closingBalance: number;

  // Transaction summary
  invoiceCount: number;
  paymentCount: number;
  creditNoteCount: number;
  totalInvoiced: number;
  totalPayments: number;
  totalCredits: number;
  totalGst: number;

  // Transactions list
  transactions: StatementTransaction[];

  // Metadata
  paymentTerms: string; // e.g., "Net 30 days"
  generatedAt: Date;
}

/**
 * Statement history record with customer info.
 */
export interface StatementHistoryRecord {
  id: string;
  customerId: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  invoiceCount: number;
  paymentCount: number;
  creditNoteCount: number;
  totalInvoiced: number;
  totalPayments: number;
  totalCredits: number;
  totalGst: number;
  pdfPath: string | null;
  sentAt: Date | null;
  sentToEmail: string | null;
  createdAt: Date;
}
