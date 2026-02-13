/**
 * Document URL Utilities
 *
 * Centralized URL construction for PDF documents (QR codes, view-online links).
 * Avoids duplicated logic and ensures consistent fallback domain.
 *
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md
 */

const DEFAULT_APP_URL = "https://app.renoz.com.au";

/**
 * Get the application base URL.
 * Uses APP_URL env var; falls back to production domain.
 */
export function getAppUrl(): string {
  return process.env.APP_URL || DEFAULT_APP_URL;
}

export type DocumentEntityType = "order" | "warranty" | "job" | "credit_note" | "quote_version" | "project";

/**
 * Build a document view URL by entity type and ID.
 * Used for QR codes and "View online" links on PDFs.
 *
 * @param entityType - order | warranty | job | credit_note | quote_version | project
 * @param entityId - UUID of the entity
 * @param documentType - Optional; for job, distinguishes assignment vs project
 */
export function buildDocumentViewUrl(
  entityType: DocumentEntityType,
  entityId: string,
  documentType?: string
): string {
  const base = getAppUrl();
  switch (entityType) {
    case "order":
      return `${base}/orders/${entityId}`;
    case "warranty":
      return `${base}/support/warranties/${entityId}`;
    case "job":
      // work_order, completion_certificate → assignment; handover_pack → project
      if (documentType === "handover_pack") {
        return `${base}/projects/${entityId}`;
      }
      return `${base}/jobs/assignments/${entityId}`;
    case "credit_note":
      return `${base}/financial/credit-notes/${entityId}`;
    case "quote_version":
      return `${base}/pipeline/quotes/${entityId}`;
    case "project":
      return `${base}/projects/${entityId}`;
    default:
      return base;
  }
}

/**
 * Build invoice payment URL for QR codes on invoice PDFs.
 */
export function buildInvoicePaymentUrl(orderId: string): string {
  return `${getAppUrl()}/invoices/${orderId}/pay`;
}
