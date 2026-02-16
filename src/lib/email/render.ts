/**
 * Email Rendering Utilities
 *
 * Provides functions to render React email templates to HTML and plain text.
 * Uses ReactDOMServer for server-side rendering.
 *
 * @see INT-RES-006
 */

import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface RenderEmailResult {
  /** Full HTML content including DOCTYPE */
  html: string;
  /** Plain text version (HTML stripped) */
  text: string;
}

export interface BaseEmailProps {
  /** Support email for the footer */
  supportEmail?: string;
  /** URL for unsubscribing from emails */
  unsubscribeUrl?: string;
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render a React email template to HTML and plain text.
 *
 * @param element - React element to render
 * @returns Promise with html and text versions
 *
 * @example
 * ```ts
 * import { renderEmail } from '@/lib/email/render';
 * import { WelcomeEmail } from '@/lib/email';
 *
 * const { html, text } = await renderEmail(
 *   <WelcomeEmail customerName="John" />
 * );
 * ```
 */
export async function renderEmail(element: ReactElement): Promise<RenderEmailResult> {
  // Render React to static HTML
  const markup = renderToStaticMarkup(element);

  // Add DOCTYPE for email clients
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n${markup}`;

  // Generate plain text version
  const text = htmlToPlainText(markup);

  return { html, text };
}

/**
 * Convert HTML to plain text for email.
 * Preserves basic structure like line breaks and paragraphs.
 */
function htmlToPlainText(html: string): string {
  return html
    // Replace <br> with newlines
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace closing block tags with double newlines
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    // Handle list items
    .replace(/<li[^>]*>/gi, "• ")
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
