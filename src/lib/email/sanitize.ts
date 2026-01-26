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
