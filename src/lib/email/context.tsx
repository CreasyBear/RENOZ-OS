/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */
/**
 * Organization Email Context
 *
 * Provides organization branding and settings to email templates.
 * This enables dynamic, per-org theming in a multi-tenant CRM.
 *
 * @example
 * // Components consume context automatically
 * function MyTemplate() {
 *   const { branding, settings } = useOrgEmail();
 *   return <Button style={{ backgroundColor: branding.primaryColor }}>...</Button>;
 * }
 *
 * @see renderOrgEmail for the primary render function
 */

import { createContext, useContext, type ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Organization branding configuration
 * Matches OrganizationBranding from drizzle/schema/settings/organizations.ts
 */
export interface OrgBranding {
  /** URL to organization logo (displayed in header) */
  logoUrl?: string | null;
  /** Primary brand color (hex, e.g., "#2563EB") - used for buttons, accents */
  primaryColor?: string | null;
  /** Secondary brand color (hex) - used for secondary buttons, subtle accents */
  secondaryColor?: string | null;
  /** Organization website URL */
  websiteUrl?: string | null;
}

/**
 * Organization settings relevant to email formatting
 * Subset of OrganizationSettings from drizzle/schema/settings/organizations.ts
 */
export interface OrgEmailSettings {
  /** Organization display name */
  name: string;
  /** Timezone for date formatting (e.g., "Australia/Sydney") */
  timezone?: string | null;
  /** Locale for number/date formatting (e.g., "en-AU") */
  locale?: string | null;
  /** Currency code (e.g., "AUD", "USD") */
  currency?: string | null;
  /** Date format preference (e.g., "DD/MM/YYYY") */
  dateFormat?: string | null;
  /** Time format preference */
  timeFormat?: "12h" | "24h" | null;
  /** Support email for footer */
  supportEmail?: string | null;
  /** Physical address for CAN-SPAM compliance */
  physicalAddress?: string | null;
}

/**
 * Complete organization email context
 */
export interface OrgEmailContextValue {
  /** Organization branding (logo, colors) */
  branding: OrgBranding;
  /** Organization settings (locale, currency, etc.) */
  settings: OrgEmailSettings;
  /** Resolved primary color (with fallback) */
  primaryColor: string;
  /** Resolved secondary color (with fallback) */
  secondaryColor: string;
  /** Resolved accent color for links/highlights */
  accentColor: string;
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
 * Default branding when organization has none configured
 */
export const DEFAULT_BRANDING: OrgBranding = {
  logoUrl: null,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
  websiteUrl: null,
};

/**
 * Default settings fallbacks
 */
export const DEFAULT_SETTINGS: OrgEmailSettings = {
  name: "Your Company",
  timezone: "UTC",
  locale: "en-US",
  currency: "USD",
  dateFormat: "MMM D, YYYY",
  timeFormat: "12h",
  supportEmail: null,
  physicalAddress: null,
};

// ============================================================================
// CONTEXT
// ============================================================================

const OrgEmailContext = createContext<OrgEmailContextValue | null>(null);

/**
 * Hook to access organization email context
 *
 * Returns organization branding and settings when inside OrgEmailProvider,
 * or sensible defaults when used outside (e.g., dev preview, system emails).
 *
 * @returns Organization email context with branding and settings
 *
 * @example
 * function EmailButton({ children, href }) {
 *   const { primaryColor } = useOrgEmail();
 *   return (
 *     <a href={href} style={{ backgroundColor: primaryColor }}>
 *       {children}
 *     </a>
 *   );
 * }
 */
export function useOrgEmail(): OrgEmailContextValue {
  const context = useContext(OrgEmailContext);
  if (!context) {
    // Return defaults for non-org contexts (dev preview, system emails)
    return {
      branding: DEFAULT_BRANDING,
      settings: DEFAULT_SETTINGS,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
      accentColor: DEFAULT_SECONDARY_COLOR,
    };
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface OrgEmailProviderProps {
  children: ReactNode;
  branding?: OrgBranding | null;
  settings?: Partial<OrgEmailSettings> | null;
  orgName?: string;
}

/**
 * Provides organization context to email templates
 *
 * @example
 * <OrgEmailProvider
 *   branding={org.branding}
 *   settings={org.settings}
 *   orgName={org.name}
 * >
 *   <OrderConfirmation {...props} />
 * </OrgEmailProvider>
 */
export function OrgEmailProvider({
  children,
  branding,
  settings,
  orgName,
}: OrgEmailProviderProps) {
  // Merge with defaults
  const resolvedBranding: OrgBranding = {
    ...DEFAULT_BRANDING,
    ...branding,
  };

  const resolvedSettings: OrgEmailSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
    name: orgName || settings?.name || DEFAULT_SETTINGS.name,
  };

  // Resolve colors with fallbacks
  const primaryColor = resolvedBranding.primaryColor || DEFAULT_PRIMARY_COLOR;
  const secondaryColor = resolvedBranding.secondaryColor || DEFAULT_SECONDARY_COLOR;

  // Accent color: use secondary if available, otherwise derive from primary
  const accentColor = secondaryColor;

  const value: OrgEmailContextValue = {
    branding: resolvedBranding,
    settings: resolvedSettings,
    primaryColor,
    secondaryColor,
    accentColor,
  };

  return (
    <OrgEmailContext.Provider value={value}>
      {children}
    </OrgEmailContext.Provider>
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
 * Generate a lighter variant of a hex color
 * Useful for hover states, backgrounds
 *
 * @param hex - Hex color string (e.g., "#2563EB" or "2563EB")
 * @param percent - Amount to lighten (0-100)
 * @returns Lightened hex color, or DEFAULT_SECONDARY_COLOR if input is invalid
 */
export function lightenColor(hex: string, percent: number): string {
  if (!isValidHexColor(hex)) {
    return DEFAULT_SECONDARY_COLOR;
  }

  // Remove # if present
  const color = hex.replace("#", "");

  // Parse RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Lighten
  const newR = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
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
    // Default to treating invalid colors as dark (return false = use light text)
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
