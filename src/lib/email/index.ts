/**
 * Email Library
 *
 * Comprehensive email infrastructure for Renoz CRM.
 *
 * This library provides:
 * - React Email templates with dark mode support
 * - Dynamic organization branding (logo, colors, locale)
 * - Type-safe formatting utilities
 * - XSS-safe template variable substitution
 * - Render helpers for converting React to HTML
 *
 * @example
 * // Render with organization branding (recommended)
 * import { renderOrgEmail, OrderConfirmation } from '@/lib/email';
 *
 * const { html, text } = await renderOrgEmail(
 *   organizationId,
 *   <OrderConfirmation
 *     orderNumber="ORD-2024-001"
 *     total={299.99}
 *   />
 * );
 *
 * // Send via Resend
 * await resend.emails.send({
 *   from: 'noreply@example.com',
 *   to: customer.email,
 *   subject: 'Order Confirmation',
 *   html,
 *   text,
 * });
 *
 * @example
 * // Render without org context (system emails, previews)
 * import { renderEmail, WelcomeEmail } from '@/lib/email';
 *
 * const { html, text } = await renderEmail(
 *   <WelcomeEmail customerName="John" />
 * );
 */

// ============================================================================
// CONTEXT & ORG-AWARE RENDERING
// ============================================================================

export {
  // Context provider and hook
  OrgEmailProvider,
  useOrgEmail,
  // Types
  type OrgBranding,
  type OrgEmailSettings,
  type OrgEmailContextValue,
  // Defaults
  DEFAULT_BRANDING,
  DEFAULT_SETTINGS,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  // Color utilities
  isValidHexColor,
  lightenColor,
  isLightColor,
  getContrastColor,
} from "./context";

export {
  // Primary render function for multi-tenant
  renderOrgEmail,
  renderOrgEmailBatch,
  getOrgEmailData,
  // Preview helpers
  renderPreviewEmail,
  PREVIEW_ORG_DATA,
  // Types
  type OrgEmailData,
  type GetOrgEmailDataOptions,
  type RenderOrgEmailOptions,
  type RenderOrgEmailResult,
} from "./render-org";

// ============================================================================
// COMPONENTS
// ============================================================================

export {
  // Theme and styles
  EmailThemeProvider,
  emailTheme,
  getEmailDarkModeCSS,
  getEmailInlineStyles,
  getEmailThemeClasses,
  useEmailTheme,
  // Layout
  EmailLayout,
  type EmailLayoutProps,
  // UI Components
  Button,
  Header,
  Footer,
  MinimalFooter,
  Card,
  DetailRow,
  StatusBadge,
} from "./components";

// ============================================================================
// TEMPLATES
// ============================================================================

export {
  // Orders
  OrderConfirmation,
  OrderShipped,
  Invoice,
  type OrderConfirmationProps,
  type OrderShippedProps,
  type InvoiceProps,
  type OrderLineItem,
  type InvoiceLineItem,
  // Customers
  WelcomeEmail,
  type WelcomeEmailProps,
  // Support
  TicketCreated,
  TicketResolved,
  type TicketCreatedProps,
  type TicketResolvedProps,
  // Warranty
  WarrantyExpiring,
  type WarrantyExpiringProps,
} from "./templates";

// ============================================================================
// UTILITIES
// ============================================================================

// Rendering (basic, non-org-aware)
export {
  renderEmail,
  renderEmailToHtml,
  htmlToPlaintext,
  type RenderEmailOptions,
  type BaseEmailProps,
} from "./render";

// Formatting (null-safe)
export {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  formatPhone,
  formatAddress,
  formatAddressInline,
  formatName,
  getFirstName,
  formatNumber,
  formatPercent,
  formatOrderNumber,
  type FormatCurrencyOptions,
  type FormatDateOptions,
  type Address,
} from "./format";

// Sanitization (XSS-safe)
export {
  sanitizeForHtml,
  substituteTemplateVariables,
  containsHtml,
} from "./sanitize";
