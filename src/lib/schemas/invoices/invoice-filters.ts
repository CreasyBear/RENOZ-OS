/**
 * Invoice Filter Schemas
 *
 * Validation schemas for invoice list queries.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { z } from 'zod';
import { INVOICE_STATUS_VALUES } from '@/lib/constants/invoice-status';
import { cursorPaginationSchema } from '@/lib/db/pagination';

/**
 * Invoice status enum schema
 */
export const invoiceStatusSchema = z.enum(INVOICE_STATUS_VALUES);

/**
 * Invoice list filter schema
 */
export const invoiceFilterSchema = z.object({
  search: z.string().optional(),
  status: invoiceStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  fromDate: z.string().optional(), // ISO date string
  toDate: z.string().optional(), // ISO date string
  minAmount: z.number().optional(), // Minimum invoice amount
  maxAmount: z.number().optional(), // Maximum invoice amount
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'total', 'invoiceNumber', 'customer']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  cursor: z.string().optional(),
});

export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>;

/**
 * Invoice list query schema (for server functions)
 */
export const invoiceListQuerySchema = invoiceFilterSchema;

export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

/**
 * Invoice cursor query schema (for cursor-based pagination on large datasets)
 */
const invoiceCursorFilterSchema = invoiceFilterSchema.omit({ page: true, pageSize: true, cursor: true });
export const invoiceCursorQuerySchema = cursorPaginationSchema.merge(invoiceCursorFilterSchema);

export type InvoiceCursorQuery = z.infer<typeof invoiceCursorQuerySchema>;

/**
 * Invoice status update schema
 */
export const updateInvoiceStatusSchema = z.object({
  id: z.string().uuid(),
  status: invoiceStatusSchema,
  paidAt: z.date().optional(), // Required when marking as paid
  note: z.string().optional(), // Optional note for status change
});

export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;

/**
 * Invoice summary request schema
 */
export const invoiceSummaryQuerySchema = z.object({
  statuses: z.array(invoiceStatusSchema).optional(),
  customerId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type InvoiceSummaryQuery = z.infer<typeof invoiceSummaryQuerySchema>;
