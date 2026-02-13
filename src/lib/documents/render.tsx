'use server'

/**
 * PDF Rendering Functions
 *
 * Core rendering utilities for generating PDF documents.
 * Uses @react-pdf/renderer to convert React components to PDF buffers.
 *
 * @see https://react-pdf.org/rendering
 */

import { renderToBuffer, renderToStream } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import "./fonts"; // Side-effect: registers fonts

/**
 * Type for PDF Document elements that can be rendered.
 * Callers pass custom document components (QuotePdfDocument, etc.) that wrap Document.
 */
type PdfDocument = ReactElement;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for PDF rendering
 */
export interface RenderPdfOptions {
  /** Use streaming for large documents (> 50 line items) */
  useStream?: boolean;
}

/**
 * Result of PDF rendering
 */
export interface RenderPdfResult {
  /** PDF as Buffer */
  buffer: Buffer;
  /** Size in bytes */
  size: number;
}

// ============================================================================
// CORE RENDER FUNCTION
// ============================================================================

/**
 * Render a PDF document to a Buffer
 *
 * This is the main rendering function. It takes a React component
 * representing the PDF document and returns a Buffer.
 *
 * @param element - React element (must be a Document component)
 * @param options - Rendering options
 * @returns Buffer containing the PDF data
 *
 * @example
 * const buffer = await renderPdfToBuffer(
 *   <QuotePdfDocument data={quoteData} />
 * );
 */
export async function renderPdfToBuffer(
  element: PdfDocument,
  options?: RenderPdfOptions,
): Promise<RenderPdfResult> {
  let buffer: Buffer;

  if (options?.useStream) {
    // Use streaming for large documents (cast: custom docs wrap Document)
    const stream = await renderToStream(element as ReactElement<DocumentProps>);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    buffer = Buffer.concat(chunks);
  } else {
    // Direct buffer rendering for smaller documents (cast: custom docs wrap Document)
    const result = await renderToBuffer(element as ReactElement<DocumentProps>);
    buffer = Buffer.from(result);
  }

  return {
    buffer,
    size: buffer.length,
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Allowed document types for generation */
const ALLOWED_DOCUMENT_TYPES = [
  'quote',
  'invoice',
  'packing-slip',
  'delivery-note',
  'work-order',
  'completion-certificate',
  'handover-pack',
] as const;
type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

/** Mapping of document types to storage folder names */
const DOCUMENT_TYPE_FOLDERS: Record<AllowedDocumentType, string> = {
  'quote': 'quotes',
  'invoice': 'invoices',
  'packing-slip': 'packing-slips',
  'delivery-note': 'delivery-notes',
  'work-order': 'project-documents',
  'completion-certificate': 'project-documents',
  'handover-pack': 'project-documents',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a filename for a document
 *
 * @param type - Document type (quote, invoice, packing-slip, delivery-note)
 * @param identifier - Unique identifier (order number, invoice number)
 * @param date - Date for the filename
 * @returns Formatted filename
 * @throws Error if document type is invalid
 *
 * @example
 * generateFilename('quote', 'Q-2024-001', new Date())
 * // => 'quote-Q-2024-001-2024-01-26.pdf'
 */
export function generateFilename(
  type: string,
  identifier: string,
  date: Date = new Date(),
): string {
  // Validate document type
  if (!ALLOWED_DOCUMENT_TYPES.includes(type as AllowedDocumentType)) {
    throw new Error(`Invalid document type: ${type}. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`);
  }

  const dateStr = date.toISOString().split("T")[0];
  // Sanitize both type and identifier for filesystem safety
  const sanitizedType = type.replace(/[^a-zA-Z0-9-]/g, "-");
  const sanitizedId = identifier.replace(/[^a-zA-Z0-9-]/g, "-");
  return `${sanitizedType}-${sanitizedId}-${dateStr}.pdf`;
}

/**
 * Generate a storage path for a document
 *
 * @param organizationId - Organization UUID
 * @param type - Document type (quote, invoice, packing-slip, delivery-note)
 * @param filename - Document filename
 * @returns Storage path
 * @throws Error if document type is unknown
 *
 * @example
 * generateStoragePath('org-uuid', 'quote', 'quote-Q-2024-001.pdf')
 * // => 'documents/org-uuid/quotes/quote-Q-2024-001.pdf'
 *
 * generateStoragePath('org-uuid', 'packing-slip', 'packing-slip-ORD-001.pdf')
 * // => 'documents/org-uuid/packing-slips/packing-slip-ORD-001.pdf'
 */
export function generateStoragePath(
  organizationId: string,
  type: string,
  filename: string,
): string {
  const folder = DOCUMENT_TYPE_FOLDERS[type as AllowedDocumentType];
  if (!folder) {
    throw new Error(`Unknown document type for storage: ${type}. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`);
  }
  return `documents/${organizationId}/${folder}/${filename}`;
}

/**
 * Calculate SHA-256 checksum of a buffer
 *
 * @param buffer - Buffer to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function calculateChecksum(buffer: Buffer): Promise<string> {
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
