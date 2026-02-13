'use server'

/**
 * Email Tracking Service
 *
 * Functions to record email opens, link clicks, and wrap links for tracking.
 * Designed to be privacy-compliant by respecting user communication preferences.
 *
 * @see DOM-COMMS-001b
 */

import { db } from "@/lib/db";
import { emailHistory, type LinkClicks, type LinkClick } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import {
  createEmailOpenedActivity,
  createEmailClickedActivity,
} from "@/lib/server/activity-bridge";
import { logger } from "@/lib/logger";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * 1x1 transparent GIF pixel (43 bytes)
 * Used for tracking email opens
 */
export const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

/**
 * Base URL for tracking endpoints
 * In production, this should be the deployed app URL
 */
export const TRACKING_BASE_URL =
  process.env.TRACKING_BASE_URL || process.env.VITE_APP_URL || "http://localhost:3000";

/**
 * Secret for HMAC signature generation
 * MUST be changed in production via environment variable
 */
const TRACKING_SECRET = process.env.TRACKING_HMAC_SECRET || 'dev-tracking-secret-change-in-prod';

// ============================================================================
// HMAC SIGNATURE SECURITY
// ============================================================================

/**
 * Generate HMAC signature for tracking URL validation
 *
 * @param emailId - The email_history record ID
 * @param linkId - Optional link ID for click tracking (omit for open tracking)
 * @returns 16-character hex signature
 */
export function generateTrackingSignature(emailId: string, linkId?: string): string {
  const data = linkId ? `${emailId}:${linkId}` : emailId;
  return createHmac('sha256', TRACKING_SECRET)
    .update(data)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Validate HMAC signature (timing-safe comparison)
 *
 * @param emailId - The email_history record ID
 * @param sig - The signature to validate
 * @param linkId - Optional link ID for click tracking (omit for open tracking)
 * @returns True if signature is valid
 */
export function validateTrackingSignature(emailId: string, sig: string, linkId?: string): boolean {
  if (!sig || sig.length !== 16) return false;
  const expected = generateTrackingSignature(emailId, linkId);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

/**
 * Record that an email was opened (tracking pixel loaded)
 *
 * @param emailId - The email_history record ID
 * @returns Success status
 */
export async function recordEmailOpen(emailId: string): Promise<{ success: boolean; alreadyOpened: boolean }> {
  try {
    // Find the email and check if already opened
    const [email] = await db
      .select({
        id: emailHistory.id,
        openedAt: emailHistory.openedAt,
        organizationId: emailHistory.organizationId,
        customerId: emailHistory.customerId,
        subject: emailHistory.subject,
        toAddress: emailHistory.toAddress,
      })
      .from(emailHistory)
      .where(eq(emailHistory.id, emailId))
      .limit(1);

    if (!email) {
      logger.warn('[email-tracking] Email not found', { emailId });
      return { success: false, alreadyOpened: false };
    }

    // If already opened, don't update but return success
    if (email.openedAt) {
      return { success: true, alreadyOpened: true };
    }

    // Record the first open
    await db
      .update(emailHistory)
      .set({ openedAt: new Date() })
      .where(eq(emailHistory.id, emailId));

    // Create activity record for the email open (COMMS-AUTO-001)
    await createEmailOpenedActivity({
      emailId: email.id,
      organizationId: email.organizationId,
      customerId: email.customerId,
      subject: email.subject,
      recipientEmail: email.toAddress,
    });

    logger.debug('[email-tracking] Recorded email open', { emailId });
    return { success: true, alreadyOpened: false };
  } catch (error) {
    logger.error("[email-tracking] Error recording email open", error as Error, { emailId });
    return { success: false, alreadyOpened: false };
  }
}

/**
 * Record that a link in an email was clicked
 *
 * @param emailId - The email_history record ID
 * @param linkId - The unique link identifier
 * @param originalUrl - The original URL that was clicked
 * @param metadata - Optional metadata (user agent, IP hash)
 * @returns The original URL to redirect to, or null if not found
 */
export async function recordEmailClick(
  emailId: string,
  linkId: string,
  originalUrl: string,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<{ success: boolean; redirectUrl: string | null }> {
  try {
    // Find the email
    const [email] = await db
      .select({
        id: emailHistory.id,
        clickedAt: emailHistory.clickedAt,
        linkClicks: emailHistory.linkClicks,
        organizationId: emailHistory.organizationId,
        customerId: emailHistory.customerId,
        subject: emailHistory.subject,
        toAddress: emailHistory.toAddress,
      })
      .from(emailHistory)
      .where(eq(emailHistory.id, emailId))
      .limit(1);

    if (!email) {
      logger.warn('[email-tracking] Email not found for click', { emailId });
      return { success: false, redirectUrl: originalUrl };
    }

    // Create the click record
    const newClick: LinkClick = {
      linkId,
      url: originalUrl,
      clickedAt: new Date().toISOString(),
      userAgent: metadata?.userAgent,
      ipHash: metadata?.ipAddress ? hashIpAddress(metadata.ipAddress) : undefined,
    };

    // Get existing link clicks or create new structure
    const existingClicks: LinkClicks = (email.linkClicks as LinkClicks) || {
      clicks: [],
      totalClicks: 0,
      uniqueLinksClicked: 0,
    };

    // Check if this is a new unique link
    const isNewLink = !existingClicks.clicks.some((c) => c.linkId === linkId);

    // Add the new click
    const updatedClicks: LinkClicks = {
      clicks: [...existingClicks.clicks, newClick],
      totalClicks: existingClicks.totalClicks + 1,
      uniqueLinksClicked: isNewLink
        ? existingClicks.uniqueLinksClicked + 1
        : existingClicks.uniqueLinksClicked,
    };

    // Update the email record
    const updateData: { linkClicks: LinkClicks; clickedAt?: Date } = {
      linkClicks: updatedClicks,
    };

    // Set clickedAt on first click
    if (!email.clickedAt) {
      updateData.clickedAt = new Date();
    }

    await db
      .update(emailHistory)
      .set(updateData)
      .where(eq(emailHistory.id, emailId));

    // Create activity record for the link click (COMMS-AUTO-001)
    // Only create activity for first click on this link
    if (isNewLink) {
      await createEmailClickedActivity({
        emailId: email.id,
        organizationId: email.organizationId,
        customerId: email.customerId,
        subject: email.subject,
        recipientEmail: email.toAddress,
        clickedUrl: originalUrl,
        linkId,
      });
    }

    logger.debug('[email-tracking] Recorded link click', { emailId, linkId });
    return { success: true, redirectUrl: originalUrl };
  } catch (error) {
    logger.error("[email-tracking] Error recording link click", error as Error, { emailId, linkId });
    // Still return the redirect URL so the user isn't blocked
    return { success: false, redirectUrl: originalUrl };
  }
}

// ============================================================================
// LINK WRAPPING UTILITIES
// ============================================================================

/**
 * Generates a unique link ID for tracking
 */
export function generateLinkId(): string {
  return randomUUID().replace(/-/g, "").substring(0, 16);
}

/**
 * Creates a tracking URL for a link
 *
 * @param emailId - The email_history record ID
 * @param linkId - The unique link identifier
 * @param originalUrl - The original destination URL
 * @returns The tracking URL with HMAC signature
 */
export function createTrackingUrl(
  emailId: string,
  linkId: string,
  originalUrl: string
): string {
  const encodedUrl = encodeURIComponent(originalUrl);
  const sig = generateTrackingSignature(emailId, linkId);
  return `${TRACKING_BASE_URL}/api/track/click/${emailId}/${linkId}?url=${encodedUrl}&sig=${sig}`;
}

/**
 * Creates a tracking pixel URL for an email
 *
 * @param emailId - The email_history record ID
 * @returns The tracking pixel URL with HMAC signature
 */
export function createTrackingPixelUrl(emailId: string): string {
  const sig = generateTrackingSignature(emailId);
  return `${TRACKING_BASE_URL}/api/track/open/${emailId}?sig=${sig}`;
}

/**
 * Wraps all links in HTML content with tracking URLs
 *
 * @param htmlContent - The email HTML content
 * @param emailId - The email_history record ID
 * @returns The HTML with wrapped links and a map of linkId -> originalUrl
 */
export function wrapLinksInHtml(
  htmlContent: string,
  emailId: string
): { html: string; linkMap: Map<string, string> } {
  const linkMap = new Map<string, string>();

  // Regex to find href attributes in anchor tags
  // Handles both single and double quotes
  const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>/gi;

  const wrappedHtml = htmlContent.replace(
    linkRegex,
    (match, before, url, after) => {
      // Skip mailto:, tel:, and anchor links
      if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
        return match;
      }

      // Skip unsubscribe links (privacy requirement)
      if (url.includes("unsubscribe") || url.includes("opt-out")) {
        return match;
      }

      // Generate unique link ID and create tracking URL
      const linkId = generateLinkId();
      const trackingUrl = createTrackingUrl(emailId, linkId, url);

      // Store the mapping
      linkMap.set(linkId, url);

      return `<a ${before}href="${trackingUrl}"${after}>`;
    }
  );

  return { html: wrappedHtml, linkMap };
}

/**
 * Inserts a tracking pixel into HTML email content
 *
 * @param htmlContent - The email HTML content
 * @param emailId - The email_history record ID
 * @returns The HTML with tracking pixel inserted
 */
export function insertTrackingPixel(htmlContent: string, emailId: string): string {
  const pixelUrl = createTrackingPixelUrl(emailId);
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;

  // Try to insert before </body> tag
  if (htmlContent.includes("</body>")) {
    return htmlContent.replace("</body>", `${pixelHtml}</body>`);
  }

  // Otherwise append at the end
  return htmlContent + pixelHtml;
}

/**
 * Prepares email HTML for sending with tracking
 * Wraps links and inserts tracking pixel
 *
 * @param htmlContent - The email HTML content
 * @param emailId - The email_history record ID
 * @param options - Options for tracking behavior
 * @returns The prepared HTML and link map
 */
export function prepareEmailForTracking(
  htmlContent: string,
  emailId: string,
  options: {
    trackOpens?: boolean;
    trackClicks?: boolean;
  } = {}
): { html: string; linkMap: Map<string, string> } {
  const { trackOpens = true, trackClicks = true } = options;

  let html = htmlContent;
  let linkMap = new Map<string, string>();

  // Wrap links if click tracking is enabled
  if (trackClicks) {
    const result = wrapLinksInHtml(html, emailId);
    html = result.html;
    linkMap = result.linkMap;
  }

  // Insert tracking pixel if open tracking is enabled
  if (trackOpens) {
    html = insertTrackingPixel(html, emailId);
  }

  return { html, linkMap };
}

// ============================================================================
// PRIVACY UTILITIES
// ============================================================================

/**
 * Hash an IP address for privacy-compliant storage
 * Uses SHA-256 with a salt to prevent reverse lookup
 */
function hashIpAddress(ipAddress: string): string {
  const salt = process.env.IP_HASH_SALT || "email-tracking-salt";
  return createHash("sha256")
    .update(salt + ipAddress)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Check if tracking is allowed for a contact
 * Respects emailOptIn preferences
 *
 * @param contactId - The contact ID to check
 * @returns Whether tracking is allowed
 */
export async function isTrackingAllowed(_contactId: string): Promise<boolean> {
  // TODO: Implement when communication preferences are added (DOM-COMMS-005)
  // For now, default to allowing tracking
  // In production, check contacts.emailOptIn
  return true;
}
