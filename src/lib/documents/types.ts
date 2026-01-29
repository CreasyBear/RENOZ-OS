/**
 * Document Generation Types
 *
 * Comprehensive types for PDF document data.
 * Provides type-safe document handling with proper narrowing.
 *
 * @see src/lib/schemas/orders/orders.ts for order types
 * @see drizzle/schema/settings/organizations.ts for organization types
 */

// ============================================================================
// DOCUMENT TYPES ENUM
// ============================================================================

/**
 * Supported document types
 */
export const DOCUMENT_TYPES = ["quote", "invoice"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ============================================================================
// ADDRESS DATA
// ============================================================================

/**
 * Address structure used throughout documents
 */
export interface DocumentAddress {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

// ============================================================================
// ORGANIZATION DATA
// ============================================================================

/**
 * Organization branding for document styling
 * Matches OrganizationBranding from drizzle/schema/settings/organizations.ts
 */
export interface DocumentOrganization {
  id: string;
  name: string;
  slug?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  currency: string;
  locale: string;
  address?: DocumentAddress | null;
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    websiteUrl?: string | null;
  } | null;
  settings?: {
    timezone?: string | null;
    dateFormat?: string | null;
    timeFormat?: "12h" | "24h" | null;
    defaultPaymentTerms?: number | null;
    defaultTaxRate?: number | null;
  } | null;
}

// ============================================================================
// CUSTOMER DATA
// ============================================================================

/**
 * Customer information for documents
 */
export interface DocumentCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  address?: DocumentAddress | null;
}

// ============================================================================
// LINE ITEM DATA
// ============================================================================

/**
 * Line item for documents
 */
export interface DocumentLineItem {
  id: string;
  lineNumber?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxType?: "gst" | "exempt" | "included" | null;
  taxAmount?: number | null;
  total: number;
  notes?: string | null;
}

// ============================================================================
// ORDER DATA
// ============================================================================

/**
 * Order data for document generation
 */
export interface DocumentOrder {
  id: string;
  orderNumber: string;
  status?: string | null;
  paymentStatus?: string | null;
  orderDate?: Date | null;
  dueDate?: Date | null;
  shippedDate?: Date | null;
  deliveredDate?: Date | null;
  customer: DocumentCustomer;
  lineItems: DocumentLineItem[];
  billingAddress?: DocumentAddress | null;
  shippingAddress?: DocumentAddress | null;
  subtotal: number;
  discount?: number | null;
  discountType?: "fixed" | "percentage" | null;
  discountPercent?: number | null;
  taxRate?: number | null;
  taxAmount: number;
  shippingAmount?: number | null;
  total: number;
  paidAmount?: number | null;
  balanceDue?: number | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
}

// ============================================================================
// PAYMENT DETAILS (for invoices)
// ============================================================================

/**
 * Payment details for invoice documents
 */
export interface DocumentPaymentDetails {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  bsb?: string | null;
  swift?: string | null;
  paymentTerms?: string | null;
  paymentInstructions?: string | null;
}

// ============================================================================
// BASE DOCUMENT DATA
// ============================================================================

/**
 * Base interface for all document data
 */
interface BaseDocumentData {
  /** Document number (e.g., Q-2024-001, INV-2024-001) */
  documentNumber: string;
  /** Issue date */
  issueDate: Date;
  /** Order data with line items */
  order: DocumentOrder;
  /** Terms and conditions text */
  terms?: string | null;
  /** Notes for customer */
  notes?: string | null;
  /** Reference number (e.g., PO number) */
  reference?: string | null;
  /** When the document was generated */
  generatedAt?: Date | null;
  /** User ID who triggered generation */
  generatedBy?: string | null;
}

// ============================================================================
// QUOTE DOCUMENT DATA
// ============================================================================

/**
 * Quote-specific document data
 */
export interface QuoteDocumentData extends BaseDocumentData {
  type: "quote";
  /** Quote validity period end date */
  validUntil: Date;
}

// ============================================================================
// INVOICE DOCUMENT DATA
// ============================================================================

/**
 * Invoice-specific document data
 */
export interface InvoiceDocumentData extends BaseDocumentData {
  type: "invoice";
  /** Invoice due date */
  dueDate: Date;
  /** Payment details (bank info, terms) */
  paymentDetails?: DocumentPaymentDetails | null;
  /** Whether the invoice is paid */
  isPaid: boolean;
  /** Payment date if paid */
  paidAt?: Date | null;
}

// ============================================================================
// DISCRIMINATED UNION
// ============================================================================

/**
 * Union type for all document data
 *
 * Use the `type` field to narrow the type:
 *
 * @example
 * function processDocument(data: DocumentData) {
 *   if (data.type === 'quote') {
 *     // TypeScript knows this is QuoteDocumentData
 *     console.log(data.validUntil);
 *   } else if (data.type === 'invoice') {
 *     // TypeScript knows this is InvoiceDocumentData
 *     console.log(data.isPaid);
 *   }
 * }
 */
export type DocumentData = QuoteDocumentData | InvoiceDocumentData;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for quote document data
 */
export function isQuoteData(data: DocumentData): data is QuoteDocumentData {
  return data.type === "quote";
}

/**
 * Type guard for invoice document data
 */
export function isInvoiceData(data: DocumentData): data is InvoiceDocumentData {
  return data.type === "invoice";
}

// ============================================================================
// GENERATED DOCUMENT RECORD
// ============================================================================

/**
 * Record of a generated document (stored in database)
 */
export interface GeneratedDocument {
  id: string;
  organizationId: string;
  documentType: DocumentType;
  entityType: "order" | "warranty";
  entityId: string;
  filename: string;
  storagePath: string;
  signedUrl?: string | null;
  fileSize: number;
  pageCount?: number | null;
  checksum?: string | null;
  generatedAt: Date;
  generatedById?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================================================
// DOCUMENT GENERATION RESULT
// ============================================================================

/**
 * Result of document generation
 */
export interface DocumentGenerationResult {
  success: boolean;
  documentId?: string;
  storagePath: string;
  signedUrl?: string;
  filename: string;
  fileSize: number;
  pageCount?: number;
  checksum?: string;
  generatedAt: Date;
}
