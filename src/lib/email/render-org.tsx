/**
 * Organization-Aware Email Rendering
 *
 * Renders email templates with organization branding and settings.
 * This is the primary render function for multi-tenant email delivery.
 *
 * @example
 * // In a Trigger.dev job
 * const { html, text } = await renderOrgEmail(
 *   organizationId,
 *   <OrderConfirmation orderNumber="ORD-001" total={299.99} />
 * );
 *
 * await resend.emails.send({ html, text, ... });
 */

import { type ReactElement } from "react";
import { db } from "@/lib/db";
import { organizations } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { renderEmail, type RenderEmailOptions } from "./render";
import {
  OrgEmailProvider,
  type OrgBranding,
  type OrgEmailSettings,
  DEFAULT_BRANDING,
  DEFAULT_SETTINGS,
} from "./context";

// ============================================================================
// TYPES
// ============================================================================

export interface OrgEmailData {
  branding: OrgBranding;
  settings: OrgEmailSettings;
}

export interface GetOrgEmailDataOptions {
  /**
   * If true, throw an error instead of returning defaults when:
   * - Organization is not found
   * - Database query fails
   *
   * Use strict mode for production email sends where falling back to
   * default branding could be a compliance issue (CAN-SPAM).
   */
  strict?: boolean;
}

export interface RenderOrgEmailOptions extends RenderEmailOptions {
  /** Skip DB fetch and use provided org data (for caching/batching) */
  orgData?: OrgEmailData;
}

export interface RenderOrgEmailResult {
  html: string;
  text: string;
  /** The org data used for rendering (useful for debugging/logging) */
  orgData: OrgEmailData;
}

// ============================================================================
// ORG DATA FETCHING
// ============================================================================

/**
 * Fetch organization branding and settings from database
 *
 * @param organizationId - The organization UUID
 * @param options - Optional configuration
 * @param options.strict - Throw on errors instead of returning defaults
 * @returns Organization email data or defaults if not found (unless strict)
 *
 * @example
 * // Non-strict (default) - returns defaults on error
 * const data = await getOrgEmailData(orgId);
 *
 * @example
 * // Strict - throws on error (recommended for production sends)
 * const data = await getOrgEmailData(orgId, { strict: true });
 */
export async function getOrgEmailData(
  organizationId: string,
  options: GetOrgEmailDataOptions = {}
): Promise<OrgEmailData> {
  const { strict = false } = options;

  try {
    const [org] = await db
      .select({
        name: organizations.name,
        branding: organizations.branding,
        settings: organizations.settings,
        timezone: organizations.timezone,
        locale: organizations.locale,
        currency: organizations.currency,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      if (strict) {
        throw new Error(`Organization not found: ${organizationId}`);
      }
      console.warn(`Organization not found: ${organizationId}, using defaults`);
      return {
        branding: DEFAULT_BRANDING,
        settings: DEFAULT_SETTINGS,
      };
    }

    // Extract branding (could be in branding column or settings.portalBranding)
    const branding: OrgBranding = {
      logoUrl: org.branding?.logoUrl ?? null,
      primaryColor: org.branding?.primaryColor ?? null,
      secondaryColor: org.branding?.secondaryColor ?? null,
      websiteUrl: org.branding?.websiteUrl ?? null,
    };

    // Build settings from org data
    const settings: OrgEmailSettings = {
      name: org.name,
      timezone: org.settings?.timezone ?? org.timezone ?? DEFAULT_SETTINGS.timezone,
      locale: org.settings?.locale ?? org.locale ?? DEFAULT_SETTINGS.locale,
      currency: org.settings?.currency ?? org.currency ?? DEFAULT_SETTINGS.currency,
      dateFormat: org.settings?.dateFormat ?? DEFAULT_SETTINGS.dateFormat,
      timeFormat: org.settings?.timeFormat ?? DEFAULT_SETTINGS.timeFormat,
      supportEmail: null, // Could be added to org settings
      physicalAddress: null, // Could be added to org settings
    };

    return { branding, settings };
  } catch (error) {
    if (strict) {
      throw new Error(
        `Failed to fetch org email data for ${organizationId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    console.error(`Failed to fetch org email data for ${organizationId}:`, error);
    return {
      branding: DEFAULT_BRANDING,
      settings: DEFAULT_SETTINGS,
    };
  }
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

/**
 * Render an email template with organization branding
 *
 * This is the primary function for rendering emails in a multi-tenant context.
 * It fetches the organization's branding and settings, wraps the template
 * in the OrgEmailProvider, and renders to HTML and plaintext.
 *
 * @param organizationId - The organization UUID
 * @param element - The React Email template element
 * @param options - Optional render options
 *
 * @example
 * // Basic usage
 * const { html, text } = await renderOrgEmail(
 *   payload.organizationId,
 *   <OrderConfirmation {...orderData} />
 * );
 *
 * @example
 * // With pre-fetched org data (for batch sending)
 * const orgData = await getOrgEmailData(organizationId);
 * for (const order of orders) {
 *   const { html, text } = await renderOrgEmail(
 *     organizationId,
 *     <OrderConfirmation {...order} />,
 *     { orgData } // Reuse fetched data
 *   );
 * }
 */
export async function renderOrgEmail(
  organizationId: string,
  element: ReactElement,
  options: RenderOrgEmailOptions = {}
): Promise<RenderOrgEmailResult> {
  // Fetch org data or use provided
  const orgData = options.orgData ?? (await getOrgEmailData(organizationId));

  // Wrap element in OrgEmailProvider
  const wrappedElement = (
    <OrgEmailProvider
      branding={orgData.branding}
      settings={orgData.settings}
      orgName={orgData.settings.name}
    >
      {element}
    </OrgEmailProvider>
  );

  // Render using base renderEmail
  const { html, text } = await renderEmail(wrappedElement, options);

  return { html, text, orgData };
}

/**
 * Render multiple emails for the same organization efficiently
 *
 * Fetches org data once and reuses it for all templates.
 * Useful for campaign sends or batch notifications.
 *
 * @param organizationId - The organization UUID
 * @param elements - Array of React Email template elements
 *
 * @example
 * const results = await renderOrgEmailBatch(organizationId, [
 *   <OrderConfirmation {...order1} />,
 *   <OrderConfirmation {...order2} />,
 *   <OrderConfirmation {...order3} />,
 * ]);
 */
export async function renderOrgEmailBatch(
  organizationId: string,
  elements: ReactElement[]
): Promise<RenderOrgEmailResult[]> {
  // Fetch org data once
  const orgData = await getOrgEmailData(organizationId);

  // Render all elements with the same org data
  const results = await Promise.all(
    elements.map((element) =>
      renderOrgEmail(organizationId, element, { orgData })
    )
  );

  return results;
}

// ============================================================================
// PREVIEW HELPERS
// ============================================================================

/**
 * Sample organization data for development previews
 */
export const PREVIEW_ORG_DATA: OrgEmailData = {
  branding: {
    logoUrl: "https://placehold.co/120x40/18181B/FFFFFF?text=LOGO",
    primaryColor: "#2563EB", // Blue-600
    secondaryColor: "#7C3AED", // Violet-600
    websiteUrl: "https://example.com",
  },
  settings: {
    name: "Acme Energy Solutions",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    currency: "USD",
    dateFormat: "MMM D, YYYY",
    timeFormat: "12h",
    supportEmail: "support@acme-energy.com",
    physicalAddress: "123 Solar Way, San Francisco, CA 94102",
  },
};

/**
 * Render an email with sample org data for development/preview
 *
 * @example
 * // In React Email dev server
 * const { html } = await renderPreviewEmail(<OrderConfirmation {...previewProps} />);
 */
export async function renderPreviewEmail(
  element: ReactElement,
  options: RenderEmailOptions = {}
): Promise<RenderOrgEmailResult> {
  return renderOrgEmail("preview", element, {
    ...options,
    orgData: PREVIEW_ORG_DATA,
  });
}
