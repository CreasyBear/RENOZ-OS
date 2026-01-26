/**
 * Document Generation Schemas
 *
 * Zod validation schemas for document generation input.
 * Ensures data integrity before PDF rendering.
 */

import { z } from "zod";

// ============================================================================
// DOCUMENT TYPE SCHEMA
// ============================================================================

export const documentTypeSchema = z.enum(["quote", "invoice"]);
export type DocumentTypeSchema = z.infer<typeof documentTypeSchema>;

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const documentBrandingSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  websiteUrl: z.string().url().nullable().optional(),
});

export const documentSettingsSchema = z.object({
  timezone: z.string().nullable().optional(),
  dateFormat: z.string().nullable().optional(),
  timeFormat: z.enum(["12h", "24h"]).nullable().optional(),
  defaultPaymentTerms: z.number().nullable().optional(),
  defaultTaxRate: z.number().nullable().optional(),
});

export const documentAddressSchema = z.object({
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
});

export const documentOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().optional(),
  currency: z.string().length(3),
  locale: z.string(),
  branding: documentBrandingSchema.nullable().optional(),
  settings: documentSettingsSchema.nullable().optional(),
  address: documentAddressSchema.nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  taxId: z.string().nullable().optional(),
});

// ============================================================================
// LINE ITEM SCHEMA
// ============================================================================

export const documentLineItemSchema = z.object({
  id: z.string().uuid(),
  lineNumber: z.string().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  discountAmount: z.number().min(0).nullable().optional(),
  taxType: z.enum(["gst", "exempt", "included"]).nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  total: z.number(),
  sku: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ============================================================================
// CUSTOMER SCHEMA
// ============================================================================

export const documentCustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  address: documentAddressSchema.nullable().optional(),
});

// ============================================================================
// ORDER SCHEMA
// ============================================================================

export const documentOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  status: z.string().nullable().optional(),
  paymentStatus: z.string().nullable().optional(),
  orderDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  shippedDate: z.coerce.date().nullable().optional(),
  deliveredDate: z.coerce.date().nullable().optional(),
  customer: documentCustomerSchema,
  lineItems: z.array(documentLineItemSchema).min(1),
  billingAddress: documentAddressSchema.nullable().optional(),
  shippingAddress: documentAddressSchema.nullable().optional(),
  subtotal: z.number(),
  discount: z.number().nullable().optional(),
  discountType: z.enum(["fixed", "percentage"]).nullable().optional(),
  discountPercent: z.number().nullable().optional(),
  taxRate: z.number().nullable().optional(),
  taxAmount: z.number(),
  shippingAmount: z.number().nullable().optional(),
  total: z.number(),
  paidAmount: z.number().nullable().optional(),
  balanceDue: z.number().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  customerNotes: z.string().nullable().optional(),
});

// ============================================================================
// PAYMENT DETAILS SCHEMA
// ============================================================================

export const documentPaymentDetailsSchema = z.object({
  bankName: z.string().nullable().optional(),
  accountName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  bsb: z.string().nullable().optional(),
  swift: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  paymentInstructions: z.string().nullable().optional(),
});

// ============================================================================
// QUOTE DOCUMENT DATA SCHEMA
// ============================================================================

export const quoteDocumentDataSchema = z.object({
  type: z.literal("quote"),
  documentNumber: z.string(),
  issueDate: z.coerce.date(),
  order: documentOrderSchema,
  validUntil: z.coerce.date(),
  terms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  generatedAt: z.coerce.date().nullable().optional(),
  generatedBy: z.string().uuid().nullable().optional(),
});

export type QuoteDocumentDataSchema = z.infer<typeof quoteDocumentDataSchema>;

// ============================================================================
// INVOICE DOCUMENT DATA SCHEMA
// ============================================================================

export const invoiceDocumentDataSchema = z.object({
  type: z.literal("invoice"),
  documentNumber: z.string(),
  issueDate: z.coerce.date(),
  order: documentOrderSchema,
  dueDate: z.coerce.date(),
  paymentDetails: documentPaymentDetailsSchema.nullable().optional(),
  isPaid: z.boolean(),
  paidAt: z.coerce.date().nullable().optional(),
  terms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  generatedAt: z.coerce.date().nullable().optional(),
  generatedBy: z.string().uuid().nullable().optional(),
});

export type InvoiceDocumentDataSchema = z.infer<
  typeof invoiceDocumentDataSchema
>;

// ============================================================================
// DOCUMENT DATA SCHEMA (discriminated union)
// ============================================================================

export const documentDataSchema = z.discriminatedUnion("type", [
  quoteDocumentDataSchema,
  invoiceDocumentDataSchema,
]);

export type DocumentDataSchema = z.infer<typeof documentDataSchema>;

// ============================================================================
// GENERATION REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for requesting quote PDF generation
 */
export const generateQuotePdfRequestSchema = z.object({
  orderId: z.string().uuid(),
  validUntil: z.coerce.date().optional(),
  terms: z.string().optional(),
  includeQrCode: z.boolean().default(true),
});

export type GenerateQuotePdfRequest = z.infer<
  typeof generateQuotePdfRequestSchema
>;

/**
 * Schema for requesting invoice PDF generation
 */
export const generateInvoicePdfRequestSchema = z.object({
  orderId: z.string().uuid(),
  invoiceNumber: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  paymentDetails: documentPaymentDetailsSchema.optional(),
  includeQrCode: z.boolean().default(true),
});

export type GenerateInvoicePdfRequest = z.infer<
  typeof generateInvoicePdfRequestSchema
>;

// ============================================================================
// GENERATED DOCUMENT RECORD SCHEMA
// ============================================================================

export const generatedDocumentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  documentType: documentTypeSchema,
  entityType: z.literal("order"),
  entityId: z.string().uuid(),
  filename: z.string(),
  storagePath: z.string(),
  fileSize: z.number().int().positive(),
  checksum: z.string().nullable().optional(),
  generatedAt: z.coerce.date(),
  generatedById: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type GeneratedDocumentSchema = z.infer<typeof generatedDocumentSchema>;
