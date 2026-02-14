'use server'

/**
 * Unsubscribe Token Generation and Verification
 *
 * Provides HMAC-signed tokens for secure unsubscribe functionality.
 * Tokens include expiration to prevent indefinite validity.
 *
 * Security features:
 * - HMAC-SHA256 signature prevents token forgery
 * - 30-day expiration limits token lifetime
 * - Timing-safe comparison prevents timing attacks
 * - No PII in URL (email is in signed payload, not visible)
 *
 * @see INT-RES-007
 * @see SEC-002 (security requirements)
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getAppUrl } from "./app-url";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * HMAC secret for unsubscribe token signing.
 * MUST be set in production via UNSUBSCRIBE_HMAC_SECRET environment variable.
 */
function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      "UNSUBSCRIBE_HMAC_SECRET environment variable is required. " +
        "Generate a random 32+ character string for production use."
    );
  }
  return secret;
}

/**
 * Token expiration in days.
 * After this period, tokens are no longer valid.
 */
const TOKEN_EXPIRY_DAYS = 30;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Payload encoded in the unsubscribe token.
 * Contains all information needed to process an unsubscribe request.
 */
export interface UnsubscribePayload {
  /** Contact ID for preference update */
  contactId: string;
  /** Email address (for suppression list) */
  email: string;
  /** Communication channel */
  channel: "email" | "sms";
  /** Organization ID for multi-tenant isolation */
  organizationId: string;
  /** Optional: Email history ID for tracking source */
  emailId?: string;
  /** Unix timestamp when token expires */
  exp: number;
}

/**
 * Input for generating a new unsubscribe token.
 */
export type UnsubscribeTokenInput = Omit<UnsubscribePayload, "exp">;

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a secure unsubscribe token.
 *
 * Token format: base64url(payload).signature
 * - payload: JSON string containing all unsubscribe data
 * - signature: First 16 characters of HMAC-SHA256 hex digest
 *
 * @param input - Unsubscribe payload without expiration
 * @returns URL-safe token string
 *
 * @example
 * ```ts
 * const token = generateUnsubscribeToken({
 *   contactId: 'contact-123',
 *   email: 'user@example.com',
 *   channel: 'email',
 *   organizationId: 'org-456',
 *   emailId: 'email-789',
 * });
 * // Returns: "eyJjb250YWN0SWQiOiJjb250...abc123def456"
 * ```
 */
export function generateUnsubscribeToken(input: UnsubscribeTokenInput): string {
  const secret = getUnsubscribeSecret();

  // Calculate expiration timestamp (30 days from now)
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

  // Build full payload with expiration
  const payload: UnsubscribePayload = {
    ...input,
    exp: expiry,
  };

  // Serialize payload to JSON
  const data = JSON.stringify(payload);

  // Generate HMAC signature (first 16 chars of hex digest)
  const signature = createHmac("sha256", secret)
    .update(data)
    .digest("hex")
    .slice(0, 16);

  // Encode payload as base64url and append signature
  const encoded = Buffer.from(data).toString("base64url");
  return `${encoded}.${signature}`;
}

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Verify an unsubscribe token and extract its payload.
 *
 * Validates:
 * 1. Token format (base64url.signature)
 * 2. HMAC signature (timing-safe comparison)
 * 3. Expiration timestamp
 *
 * @param token - The token string to verify
 * @returns The decoded payload if valid, null if invalid or expired
 *
 * @example
 * ```ts
 * const payload = verifyUnsubscribeToken(token);
 * if (!payload) {
 *   // Token is invalid or expired
 *   return { error: 'Invalid or expired unsubscribe link' };
 * }
 * // Process unsubscribe for payload.email
 * ```
 */
export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  // Validate token format
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encoded, signature] = parts;
  if (!encoded || !signature) {
    return null;
  }

  // Validate signature length
  if (signature.length !== 16) {
    return null;
  }

  try {
    const secret = getUnsubscribeSecret();

    // Decode the payload
    const data = Buffer.from(encoded, "base64url").toString("utf-8");

    // Generate expected signature
    const expectedSig = createHmac("sha256", secret)
      .update(data)
      .digest("hex")
      .slice(0, 16);

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expectedSig, "utf-8");

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    // Parse and validate payload
    const payload: UnsubscribePayload = JSON.parse(data);

    // Validate required fields
    if (
      !payload.contactId ||
      !payload.email ||
      !payload.channel ||
      !payload.organizationId ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    // Validate channel value
    if (payload.channel !== "email" && payload.channel !== "sms") {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    // JSON parse error or other issues
    return null;
  }
}

// ============================================================================
// URL GENERATION HELPER
// ============================================================================

/**
 * Generate a complete unsubscribe URL.
 *
 * @param input - Unsubscribe token input
 * @returns Full unsubscribe URL
 *
 * @example
 * ```ts
 * const url = generateUnsubscribeUrl({
 *   contactId: 'contact-123',
 *   email: 'user@example.com',
 *   channel: 'email',
 *   organizationId: 'org-456',
 * });
 * // Returns: "https://app.example.com/api/unsubscribe/eyJjb250YWN0..."
 * ```
 */
export function generateUnsubscribeUrl(input: UnsubscribeTokenInput): string {
  const token = generateUnsubscribeToken(input);
  const baseUrl = getAppUrl();
  return `${baseUrl}/api/unsubscribe/${token}`;
}
