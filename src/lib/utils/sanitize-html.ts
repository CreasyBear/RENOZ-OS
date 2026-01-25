/**
 * HTML Sanitization Utility
 *
 * Provides secure HTML sanitization using DOMPurify to prevent XSS attacks
 * when rendering user-generated content with dangerouslySetInnerHTML.
 *
 * @see https://github.com/cure53/DOMPurify
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 *
 * Use this whenever rendering user-generated HTML content with dangerouslySetInnerHTML.
 *
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```tsx
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
 * ```
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return '';

  // DOMPurify sanitizes HTML and removes potentially dangerous content
  // By default it allows safe HTML tags and removes scripts, event handlers, etc.
  return DOMPurify.sanitize(dirty, {
    // Allow common HTML tags used in rich text editors
    ALLOWED_TAGS: [
      'p',
      'br',
      'b',
      'i',
      'u',
      'strong',
      'em',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'pre',
      'code',
      'span',
      'div',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'style',
      'target',
      'rel',
      'width',
      'height',
    ],
    // Allow data URIs for images (base64 encoded)
    ALLOW_DATA_ATTR: false,
    // Ensure links open in new tab safely
    ADD_ATTR: ['target', 'rel'],
  });
}

/**
 * Sanitize HTML with stricter rules for email content.
 * Only allows basic formatting tags - no images, links, or complex structures.
 *
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string with minimal tags
 */
export function sanitizeEmailPreview(dirty: string | undefined | null): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}
