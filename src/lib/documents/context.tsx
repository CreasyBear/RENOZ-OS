/**
 * Organization Document Context
 *
 * Provides organization branding and settings to PDF templates.
 * This enables dynamic, per-org theming in a multi-tenant CRM.
 *
 * @example
 * // Components consume context automatically
 * function MyTemplate() {
 *   const { organization, primaryColor } = useOrgDocument();
 *   return <Text style={{ color: primaryColor }}>...</Text>;
 * }
 *
 * @see src/lib/email/context.tsx for the email equivalent
 * @see renderOrgDocument for the primary render function
 */

import { createContext, useContext, type ReactNode } from "react";
import type { DocumentOrganization } from "./types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete organization document context
 */
export interface OrgDocumentContextValue {
  /** Full organization data */
  organization: DocumentOrganization;
  /** Resolved primary color (with fallback) */
  primaryColor: string;
  /** Resolved secondary color (with fallback) */
  secondaryColor: string;
  /** Resolved locale for formatting */
  locale: string;
  /** Resolved currency code */
  currency: string;
  /** Resolved timezone */
  timezone: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default colors when organization has none configured
 * Professional, neutral palette that works for any business
 */
export const DEFAULT_PRIMARY_COLOR = "#18181B"; // Zinc-900 - professional dark
export const DEFAULT_SECONDARY_COLOR = "#3B82F6"; // Blue-500 - energetic accent

/**
 * Default organization settings
 */
export const DEFAULT_ORGANIZATION: DocumentOrganization = {
  id: "",
  name: "Your Company",
  slug: "company",
  currency: "USD",
  locale: "en-US",
  branding: {
    logoUrl: null,
    primaryColor: DEFAULT_PRIMARY_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
    websiteUrl: null,
  },
  settings: {
    timezone: "UTC",
    dateFormat: "MMM D, YYYY",
    timeFormat: "12h",
    defaultPaymentTerms: 30,
    defaultTaxRate: 10,
  },
  address: null,
  phone: null,
  email: null,
  taxId: null,
};

// ============================================================================
// CONTEXT
// ============================================================================

const OrgDocumentContext = createContext<OrgDocumentContextValue | null>(null);

/**
 * Hook to access organization document context
 *
 * Returns organization branding and settings when inside OrgDocumentProvider,
 * or sensible defaults when used outside (e.g., dev preview, system documents).
 *
 * @returns Organization document context with branding and settings
 *
 * @example
 * function DocumentHeader() {
 *   const { organization, primaryColor } = useOrgDocument();
 *   return (
 *     <View>
 *       {organization.branding.logoUrl && (
 *         <Image src={organization.branding.logoUrl} />
 *       )}
 *       <Text style={{ color: primaryColor }}>{organization.name}</Text>
 *     </View>
 *   );
 * }
 */
export function useOrgDocument(): OrgDocumentContextValue {
  const context = useContext(OrgDocumentContext);
  if (!context) {
    // Return defaults for non-org contexts (dev preview, system documents)
    return {
      organization: DEFAULT_ORGANIZATION,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
      locale: "en-US",
      currency: "USD",
      timezone: "UTC",
    };
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface OrgDocumentProviderProps {
  children: ReactNode;
  organization: DocumentOrganization;
}

/**
 * Provides organization context to PDF templates
 *
 * @example
 * <OrgDocumentProvider organization={org}>
 *   <QuotePdfTemplate data={quoteData} />
 * </OrgDocumentProvider>
 */
export function OrgDocumentProvider({
  children,
  organization,
}: OrgDocumentProviderProps) {
  // Resolve colors with fallbacks (branding may be null)
  const primaryColor =
    organization.branding?.primaryColor || DEFAULT_PRIMARY_COLOR;
  const secondaryColor =
    organization.branding?.secondaryColor || DEFAULT_SECONDARY_COLOR;

  // Resolve settings with fallbacks (locale/currency are top-level, timezone in settings)
  const locale = organization.locale || "en-US";
  const currency = organization.currency || "USD";
  const timezone = organization.settings?.timezone || "UTC";

  const value: OrgDocumentContextValue = {
    organization,
    primaryColor,
    secondaryColor,
    locale,
    currency,
    timezone,
  };

  return (
    <OrgDocumentContext.Provider value={value}>
      {children}
    </OrgDocumentContext.Provider>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Validate a hex color string
 * Accepts formats: #RRGGBB, RRGGBB (6 characters)
 */
export function isValidHexColor(hex: string | null | undefined): boolean {
  if (!hex) return false;
  return /^#?[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Check if a color is "light" (should use dark text)
 * Uses relative luminance formula
 *
 * @param hex - Hex color string
 * @returns true if light (use dark text), false if dark (use light text)
 */
export function isLightColor(hex: string): boolean {
  if (!isValidHexColor(hex)) {
    return false;
  }

  const color = hex.replace("#", "");

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}

/**
 * Get contrasting text color for a background
 *
 * @param bgHex - Background hex color
 * @returns "#18181B" for light backgrounds, "#FFFFFF" for dark backgrounds
 */
export function getContrastColor(bgHex: string): string {
  return isLightColor(bgHex) ? "#18181B" : "#FFFFFF";
}

/**
 * Format organization address as a single string
 */
export function formatOrgAddress(
  address: DocumentOrganization["address"],
): string {
  if (!address) return "";

  const parts = [
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(" "),
    address.country,
  ].filter(Boolean);

  return parts.join("\n");
}
