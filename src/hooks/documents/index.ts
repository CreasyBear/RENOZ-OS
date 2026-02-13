/**
 * Document Hooks
 *
 * TanStack Query hooks for document generation and history.
 * Provides hooks for generating PDFs and viewing document history.
 */

// --- Generation (Async - Trigger.dev) ---
export {
  useGenerateQuote,
  useGenerateInvoice,
  useDocumentStatus,
  useDocumentPolling,
  type DocumentType,
  type GenerateQuoteInput,
  type GenerateInvoiceInput,
  type DocumentStatusInput,
  type DocumentStatusResult,
} from './use-generate-document';

// --- Generation (Sync - Immediate PDF) ---
export {
  useGenerateOrderDocument,
  useGenerateOrderQuote,
  useGenerateOrderInvoice,
  useGenerateOrderProForma,
  useGenerateOrderPackingSlip,
  useGenerateOrderDeliveryNote,
  type OrderDocumentType,
  type GenerateOrderDocumentResult,
  type GenerateOrderQuoteInput,
  type GenerateOrderInvoiceInput,
  type GenerateOrderProFormaInput,
  type GenerateOrderPackingSlipInput,
  type GenerateOrderDeliveryNoteInput,
} from './use-generate-order-documents';

// --- Generation (Sync - Project Documents) ---
export {
  useGenerateProjectDocument,
  useGenerateWorkOrder,
  useGenerateCompletionCertificate,
  type ProjectDocumentType,
  type GenerateProjectDocumentResult,
  type GenerateWorkOrderInput,
  type GenerateCompletionCertificateInput,
} from './use-generate-project-documents';

// --- History ---
export {
  useDocumentHistory,
  useLatestDocument,
  useInvalidateDocumentHistory,
  formatFileSize,
  getDocumentTypeLabel,
  type DocumentEntityType,
  type GeneratedDocument,
  type DocumentHistoryFilters,
  type DocumentHistoryResult,
} from './use-document-history';
