/**
 * Document Generation Library
 *
 * PDF generation system for business documents (quotes, invoices).
 * Uses @react-pdf/renderer with organization branding context.
 *
 * @example
 * import {
 *   renderPdfToBuffer,
 *   QuotePdfDocument,
 *   type QuoteDocumentData,
 * } from '@/lib/documents';
 *
 * const { buffer } = await renderPdfToBuffer(
 *   <QuotePdfDocument organization={org} data={quoteData} />
 * );
 *
 * @see src/lib/email for the email template equivalent
 */

// ============================================================================
// FONTS (side-effect import to register fonts)
// ============================================================================

import "./fonts";

// ============================================================================
// CONTEXT
// ============================================================================

export {
  OrgDocumentProvider,
  useOrgDocument,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_ORGANIZATION,
  isValidHexColor,
  isLightColor,
  getContrastColor,
  formatOrgAddress,
  type OrgDocumentContextValue,
} from "./context";

// ============================================================================
// TYPES
// ============================================================================

export {
  DOCUMENT_TYPES,
  isQuoteData,
  isInvoiceData,
  type DocumentType,
  type DocumentOrganization,
  type DocumentCustomer,
  type DocumentLineItem,
  type DocumentOrder,
  type DocumentPaymentDetails,
  type QuoteDocumentData,
  type InvoiceDocumentData,
  type DocumentData,
  type GeneratedDocument,
  type DocumentGenerationResult,
} from "./types";

// ============================================================================
// SCHEMAS
// ============================================================================

export {
  documentTypeSchema,
  documentOrganizationSchema,
  documentCustomerSchema,
  documentLineItemSchema,
  documentOrderSchema,
  documentPaymentDetailsSchema,
  quoteDocumentDataSchema,
  invoiceDocumentDataSchema,
  documentDataSchema,
  generateQuotePdfRequestSchema,
  generateInvoicePdfRequestSchema,
  generatedDocumentSchema,
  type DocumentTypeSchema,
  type QuoteDocumentDataSchema,
  type InvoiceDocumentDataSchema,
  type DocumentDataSchema,
  type GenerateQuotePdfRequest,
  type GenerateInvoicePdfRequest,
  type GeneratedDocumentSchema,
} from "./schemas";

// ============================================================================
// RENDERING
// ============================================================================

export {
  renderPdfToBuffer,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type RenderPdfOptions,
  type RenderPdfResult,
} from "./render";

// ============================================================================
// THEME
// ============================================================================

export {
  colors,
  spacing,
  pageMargins,
  fontSize,
  lineHeight,
  commonStyles,
  formatCurrencyForPdf,
  formatDateForPdf,
  formatNumberForPdf,
} from "./components/theme";

// ============================================================================
// FONTS
// ============================================================================

export { FONT_FAMILY, FONT_WEIGHTS, type FontWeight } from "./fonts";

// ============================================================================
// COMPONENTS (for custom templates)
// ============================================================================

export {
  // Header
  DocumentHeader,
  type DocumentHeaderProps,
  // Address
  AddressBlock,
  AddressColumns,
  type AddressData,
  type AddressBlockProps,
  type AddressColumnsProps,
  // Line Items
  LineItems,
  type LineItemsProps,
  // Summary
  Summary,
  type SummaryProps,
  // Footer
  Terms,
  Notes,
  PaymentDetails,
  PageNumber,
  DocumentFooter,
  type TermsProps,
  type NotesProps,
  type PaymentDetailsProps,
  type DocumentFooterProps,
  // QR Code
  QRCode,
  generateQRCode,
  type QRCodeProps,
  type GenerateQRCodeOptions,
  // Watermark
  PaidWatermark,
  type PaidWatermarkProps,
  // Certificate Border
  CertificateBorder,
  CertificateDivider,
  CertificateSeal,
  type CertificateBorderProps,
  type CertificateDividerProps,
  type CertificateSealProps,
  // Signature Line
  SignatureLine,
  DeliveryAcknowledgment,
  WorkOrderSignOff,
  type SignatureLineProps,
  type DeliveryAcknowledgmentProps,
  type WorkOrderSignOffProps,
} from "./components";

// ============================================================================
// TEMPLATES
// ============================================================================

export {
  // Quote
  QuotePdfDocument,
  QuotePdfTemplate,
  type QuotePdfDocumentProps,
  type QuotePdfTemplateProps,
  // Invoice
  InvoicePdfDocument,
  InvoicePdfTemplate,
  type InvoicePdfDocumentProps,
  type InvoicePdfTemplateProps,
  // Pro Forma Invoice
  ProFormaPdfDocument,
  ProFormaPdfTemplate,
  type ProFormaDocumentData,
  type ProFormaLineItem,
  type ProFormaCustomer,
  type ProFormaOrder,
  type ProFormaPdfDocumentProps,
  type ProFormaPdfTemplateProps,
  // Warranty Certificate
  WarrantyCertificatePdfDocument,
  WarrantyCertificatePdfTemplate,
  type WarrantyCertificateData,
  type WarrantyCertificatePdfDocumentProps,
  type WarrantyCertificatePdfTemplateProps,
  // Completion Certificate
  CompletionCertificatePdfDocument,
  CompletionCertificatePdfTemplate,
  type CompletionCertificateData,
  type CompletionCertificatePdfDocumentProps,
  type CompletionCertificatePdfTemplateProps,
  // Delivery Note
  DeliveryNotePdfDocument,
  DeliveryNotePdfTemplate,
  type DeliveryNoteDocumentData,
  type DeliveryNoteLineItem,
  type DeliveryNotePdfDocumentProps,
  type DeliveryNotePdfTemplateProps,
  // Work Order
  WorkOrderPdfDocument,
  WorkOrderPdfTemplate,
  type WorkOrderDocumentData,
  type WorkOrderChecklistItem,
  type WorkOrderMaterial,
  type WorkOrderPriority,
  type WorkOrderPdfDocumentProps,
  type WorkOrderPdfTemplateProps,
  // Packing Slip
  PackingSlipPdfDocument,
  PackingSlipPdfTemplate,
  type PackingSlipDocumentData,
  type PackingSlipLineItem,
  type PackingSlipPdfDocumentProps,
  type PackingSlipPdfTemplateProps,
  // Reports
  ReportSummaryPdfDocument,
  type ReportSummaryDocumentData,
  type ReportSummaryMetric,
  type ReportSummaryPdfDocumentProps,
} from "./templates";
