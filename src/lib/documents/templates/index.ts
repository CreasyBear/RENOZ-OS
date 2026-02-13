/**
 * PDF Document Templates
 *
 * All available PDF templates organized by category.
 */

// ============================================================================
// FINANCIAL DOCUMENTS
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
  // Credit Note
  CreditNotePdfDocument,
  CreditNotePdfTemplate,
  type CreditNoteDocumentData,
  type CreditNotePdfDocumentProps,
  type CreditNotePdfTemplateProps,
} from "./financial";

// ============================================================================
// CERTIFICATE DOCUMENTS
// ============================================================================

export {
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
  // Handover Pack
  HandoverPackPdfDocument,
  HandoverPackPdfTemplate,
  type HandoverPackData,
  type HandoverPackPdfDocumentProps,
  type HandoverPackPdfTemplateProps,
} from "./certificates";

// ============================================================================
// OPERATIONAL DOCUMENTS
// ============================================================================

export {
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
} from "./operational";

// ============================================================================
// REPORT DOCUMENTS
// ============================================================================

export {
  ReportSummaryPdfDocument,
  type ReportSummaryDocumentData,
  type ReportSummaryMetric,
  type ReportSummaryPdfDocumentProps,
} from "./reports/report-summary";
