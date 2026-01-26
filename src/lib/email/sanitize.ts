/**
 * Email Sanitization Utilities
 *
 * Centralized HTML sanitization for email templates to prevent XSS attacks.
 * All string template substitution should use these functions.
 *
 * @see EMAIL-TPL-001
 */

/**
 * Sanitize a string value for safe HTML insertion.
 * Encodes HTML special characters to prevent XSS.
 *
 * @example
 * sanitizeForHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function sanitizeForHtml(value: string | null | undefined): string {
  if (value == null) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Substitute template variables in HTML string with sanitized values.
 * Variables use the {{variableName}} format.
 *
 * IMPORTANT: This function sanitizes all variable values before substitution.
 * Use this for database templates and inline HTML templates.
 *
 * @example
 * substituteTemplateVariables(
 *   '<p>Hello, {{name}}!</p>',
 *   { name: '<script>xss</script>' }
 * )
 * // Returns: '<p>Hello, &lt;script&gt;xss&lt;/script&gt;!</p>'
 */
export function substituteTemplateVariables(
  html: string,
  variables: Record<string, string | number | boolean | null | undefined>
): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    // Numbers and booleans are safe, strings need sanitization
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return sanitizeForHtml(value as string | null | undefined);
  });
}

/**
 * Check if a string contains potentially unsafe HTML.
 * Useful for validation and logging.
 */
export function containsHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<[a-z][\s\S]*>/i.test(value);
}

/**
 * Validate and sanitize a URL for use in email links.
 * Only allows HTTPS URLs to prevent:
 * - javascript: execution
 * - data: exfiltration
 * - http: downgrade attacks
 *
 * @param url - The URL to validate
 * @param fallback - Value to return if URL is invalid (default: null)
 * @returns Valid HTTPS URL or fallback value
 *
 * @example
 * validateEmailUrl("https://app.example.com/order/123")  // "https://app.example.com/order/123"
 * validateEmailUrl("javascript:alert(1)")                 // null
 * validateEmailUrl("http://example.com")                  // null (not HTTPS)
 * validateEmailUrl(null, "#")                             // "#"
 */
export function validateEmailUrl(
  url: string | null | undefined,
  fallback: string | null = null
): string | null {
  if (!url) return fallback;

  try {
    const parsed = new URL(url);
    // Only allow HTTPS protocol
    if (parsed.protocol !== "https:") {
      return fallback;
    }
    return url;
  } catch {
    // Invalid URL format
    return fallback;
  }
}

/**
 * Validate URL with a list of allowed domains.
 * More restrictive - only allows URLs from specified domains.
 *
 * @param url - The URL to validate
 * @param allowedDomains - List of allowed domain suffixes (e.g., ["renoz.com", "renoz.energy"])
 * @param fallback - Value to return if URL is invalid
 * @returns Valid URL on allowed domain, or fallback
 *
 * @example
 * validateEmailUrlDomain("https://app.renoz.com/orders", ["renoz.com"]) // "https://app.renoz.com/orders"
 * validateEmailUrlDomain("https://evil.com/phish", ["renoz.com"])       // null
 */
export function validateEmailUrlDomain(
  url: string | null | undefined,
  allowedDomains: string[],
  fallback: string | null = null
): string | null {
  if (!url) return fallback;

  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== "https:") {
      return fallback;
    }

    // Check against allowed domains
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = allowedDomains.some((domain) => {
      const d = domain.toLowerCase();
      return hostname === d || hostname.endsWith(`.${d}`);
    });

    return isAllowed ? url : fallback;
  } catch {
    return fallback;
  }
}
