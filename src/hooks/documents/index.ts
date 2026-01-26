/**
 * Document Hooks
 *
 * TanStack Query hooks for document generation and history.
 * Provides hooks for generating PDFs and viewing document history.
 */

// --- Generation ---
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
