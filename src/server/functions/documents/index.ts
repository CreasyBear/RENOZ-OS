/**
 * Document Server Functions
 *
 * Server functions for document generation and management.
 */

// ============================================================================
// DOCUMENT GENERATION (INT-DOC-002)
// ============================================================================

export {
  generateQuotePdf,
  generateInvoicePdf,
  getDocumentStatus,
} from "./generate-documents";

// ============================================================================
// SYNCHRONOUS DOCUMENT GENERATION (New - immediate PDF generation)
// ============================================================================

export {
  generateOrderDocument,
  generateOrderQuotePdf,
  generateOrderInvoicePdf,
  generateOrderProFormaPdf,
  generateOrderPackingSlipPdf,
  generateOrderDeliveryNotePdf,
} from "./generate-documents-sync";

// Project Documents (Work Orders, Completion Certificates, Handover Pack)
export {
  generateProjectDocument,
  generateProjectWorkOrderPdf,
  generateProjectCompletionCertificatePdf,
  generateProjectHandoverPackPdf,
} from "./generate-project-documents-sync";

// ============================================================================
// DOCUMENT TEMPLATES (INT-DOC-005)
// ============================================================================

export {
  getDocumentTemplate,
  updateDocumentTemplate,
  getAllDocumentTemplates,
  resetDocumentTemplate,
} from "./document-templates";

// ============================================================================
// DOCUMENT PREVIEW (INT-DOC-006-A)
// ============================================================================

export {
  previewDocument,
  getSupportedDocumentTypes,
  DOCUMENT_TYPES,
  type DocumentType,
  type PreviewDocumentInput,
} from "./preview-document";

// ============================================================================
// GENERATED DOCUMENTS HISTORY (INT-DOC-006-B)
// ============================================================================

export {
  getGeneratedDocuments,
  getGeneratedDocumentById,
  getDocumentCountsByType,
  type GeneratedDocumentsQuery,
} from "./get-generated-documents";

// ============================================================================
// PRO FORMA INVOICE (INT-DOC-002-C)
// ============================================================================

export {
  generateProFormaPdf,
  getProFormaStatus,
  type GenerateProFormaInput,
  type GenerateProFormaDocumentPayload,
} from "./generate-pro-forma";

// ============================================================================
// PACKING SLIP (INT-DOC-003-B)
// ============================================================================

export {
  generatePackingSlipPdf,
  getPackingSlipStatus,
  type GeneratePackingSlipInput,
  type GeneratePackingSlipDocumentPayload,
} from "./generate-packing-slip";
