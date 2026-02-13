/**
 * Document Generation Constants
 *
 * Centralized configuration values for PDF document generation.
 * These values were previously hardcoded across multiple files.
 *
 * @see src/server/functions/documents/generate-documents-sync.tsx
 * @see src/lib/documents/render.tsx
 */

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/** Supported document types for generation */
export const DOCUMENT_TYPES = ['quote', 'invoice', 'packing-slip', 'delivery-note'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Financial document types (include pricing) */
export const FINANCIAL_DOCUMENT_TYPES = ['quote', 'invoice'] as const;
export type FinancialDocumentType = (typeof FINANCIAL_DOCUMENT_TYPES)[number];

/** Operational document types (for logistics) */
export const OPERATIONAL_DOCUMENT_TYPES = ['packing-slip', 'delivery-note'] as const;
export type OperationalDocumentType = (typeof OPERATIONAL_DOCUMENT_TYPES)[number];

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

/** Supabase storage bucket for documents */
export const DOCUMENT_STORAGE_BUCKET = 'documents';

/** Signed URL expiry in seconds (1 year) */
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365;

/** Mapping of document types to storage folder names */
export const DOCUMENT_TYPE_FOLDERS: Record<DocumentType, string> = {
  'quote': 'quotes',
  'invoice': 'invoices',
  'packing-slip': 'packing-slips',
  'delivery-note': 'delivery-notes',
};

// ============================================================================
// QUOTE CONFIGURATION
// ============================================================================

/** Default number of days a quote is valid */
export const QUOTE_VALIDITY_DAYS = 30;

// ============================================================================
// QR CODE CONFIGURATION
// ============================================================================

/** Configuration for QR code generation */
export const QR_CODE_CONFIG = {
  /** Width in pixels */
  width: 240,
  /** Margin around QR code */
  margin: 0,
  /** Error correction level */
  errorCorrectionLevel: 'M' as const,
} as const;

// ============================================================================
// PDF PAGE CONFIGURATION
// ============================================================================

/** Default page padding in points */
export const PDF_PAGE_PADDING = {
  top: 32,
  bottom: 32,
  left: 40,
  right: 40,
} as const;

/** Default page size */
export const PDF_PAGE_SIZE = 'A4' as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a string is a valid document type
 */
export function isDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType);
}

/**
 * Check if a string is a financial document type
 */
export function isFinancialDocumentType(value: string): value is FinancialDocumentType {
  return FINANCIAL_DOCUMENT_TYPES.includes(value as FinancialDocumentType);
}

/**
 * Check if a string is an operational document type
 */
export function isOperationalDocumentType(value: string): value is OperationalDocumentType {
  return OPERATIONAL_DOCUMENT_TYPES.includes(value as OperationalDocumentType);
}
