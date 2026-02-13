/**
 * Order Payment Schema
 * 
 * Zod schema definitions for order payments following FORM-STANDARDS.md.
 * Uses TanStack Form validation patterns.
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const PAYMENT_METHODS = [
  "bank_transfer",
  "credit_card",
  "cash",
  "cheque",
  "paypal",
  "stripe",
  "xero",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  cash: "Cash",
  cheque: "Cheque",
  paypal: "PayPal",
  stripe: "Stripe",
  xero: "Xero",
};

// ============================================================================
// BASE SCHEMA
// ============================================================================

export const orderPaymentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  orderId: z.string().uuid(),
  amount: z.number().min(0, "Amount must be positive"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  reference: z.string().max(100, "Reference too long").optional().nullable(),
  notes: z.string().max(1000, "Notes too long").optional().nullable(),
  recordedBy: z.string().uuid().optional().nullable(),
  isRefund: z.boolean().default(false),
  relatedPaymentId: z.string().uuid().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable(),
  updatedBy: z.string().uuid().optional().nullable(),
});

export type OrderPayment = z.infer<typeof orderPaymentSchema>;

// ============================================================================
// INSERT SCHEMA
// ============================================================================

export const insertOrderPaymentSchema = z.object({
  orderId: z.string().uuid("Order is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  reference: z.string().max(100, "Reference too long").optional().nullable(),
  notes: z.string().max(1000, "Notes too long").optional().nullable(),
  isRefund: z.boolean().default(false),
  relatedPaymentId: z.string().uuid().optional().nullable(),
});

export type InsertOrderPayment = z.infer<typeof insertOrderPaymentSchema>;

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const updateOrderPaymentSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().min(0.01, "Amount must be greater than 0").optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional(),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpdateOrderPayment = z.infer<typeof updateOrderPaymentSchema>;

// ============================================================================
// DELETE SCHEMA
// ============================================================================

export const deleteOrderPaymentSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOrderPayment = z.infer<typeof deleteOrderPaymentSchema>;

// ============================================================================
// PAYMENT TYPES (for UI components)
// ============================================================================

/**
 * Payment - used in order payments tab
 */
export interface Payment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  isRefund: boolean;
  relatedPaymentId: string | null;
  createdAt: string;
}

/**
 * Payment summary - aggregated payment statistics
 */
export interface PaymentSummary {
  totalPayments: number;
  totalPaid: number;
  totalRefunds: number;
  netAmount: number;
}

// ============================================================================
// FORM DEFAULTS
// ============================================================================

export const getPaymentFormDefaults = (): {
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  isRefund: boolean;
  relatedPaymentId: string | null;
} => ({
  orderId: "",
  amount: 0,
  paymentMethod: "bank_transfer",
  paymentDate: new Date().toISOString().split("T")[0],
  reference: null,
  notes: null,
  isRefund: false,
  relatedPaymentId: null,
});
