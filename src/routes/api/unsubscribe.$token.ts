/**
 * Unsubscribe API Endpoint
 *
 * Handles one-click unsubscribe from emails/SMS.
 * GET: Shows unsubscribe confirmation page
 * POST: Processes the unsubscribe
 *
 * Security features (INT-RES-007):
 * - HMAC-signed tokens prevent forgery
 * - 30-day token expiration
 * - Rate limiting: 10 requests/minute per IP
 * - Integration with suppression list
 *
 * @see DOM-COMMS-005
 * @see INT-RES-007
 */

import { db } from "@/lib/db";
import { contacts, customerActivities } from "drizzle/schema";
import { eq } from "drizzle-orm";
import {
  verifyUnsubscribeToken as verifyLegacyToken,
} from "@/lib/server/communication-preferences";
import { verifyUnsubscribeToken as verifySecureToken } from "@/lib/server/unsubscribe-tokens";
import { addSuppressionDirect } from "@/server/functions/communications/email-suppression";
import {
  checkRateLimitSync,
  getClientIdentifier,
} from "@/lib/server/rate-limit";

// ============================================================================
// RATE LIMIT CONFIGURATION (SEC-003)
// ============================================================================

/**
 * Rate limit for unsubscribe endpoint.
 * 10 requests per minute per IP address.
 */
const UNSUBSCRIBE_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many unsubscribe requests. Please try again in a minute.",
};

// ============================================================================
// TOKEN VERIFICATION (supports both legacy and secure tokens)
// ============================================================================

interface VerifiedToken {
  contactId: string;
  channel: "email" | "sms";
  organizationId?: string;
  email?: string;
  emailId?: string;
  isSecure: boolean;
}

/**
 * Verify an unsubscribe token.
 * Supports both legacy (base64-only) and secure (HMAC-signed) token formats.
 * Legacy tokens are supported for backwards compatibility during transition.
 *
 * @param token - The token to verify
 * @returns Verified token data or null if invalid
 */
function verifyToken(token: string): VerifiedToken | null {
  // Try secure token format first (recommended)
  const securePayload = verifySecureToken(token);
  if (securePayload) {
    return {
      contactId: securePayload.contactId,
      channel: securePayload.channel,
      organizationId: securePayload.organizationId,
      email: securePayload.email,
      emailId: securePayload.emailId,
      isSecure: true,
    };
  }

  // Fall back to legacy token format (for existing links)
  // This should be removed after migration period
  const legacyData = verifyLegacyToken(token);
  if (legacyData) {
    console.warn(
      "[unsubscribe] Legacy token format used. Consider regenerating unsubscribe links."
    );
    return {
      contactId: legacyData.contactId,
      channel: legacyData.channel,
      isSecure: false,
    };
  }

  return null;
}

// ============================================================================
// GET HANDLER - Show confirmation page
// ============================================================================

export async function GET({
  params,
  request,
}: {
  params: { token: string };
  request: Request;
}) {
  const { token } = params;

  // Rate limiting (SEC-003)
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimitSync(
    "unsubscribe",
    clientId,
    UNSUBSCRIBE_RATE_LIMIT
  );

  if (!rateLimitResult.allowed) {
    return new Response(
      renderHtml({
        title: "Too Many Requests",
        message: UNSUBSCRIBE_RATE_LIMIT.message,
        success: false,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "text/html",
          "Retry-After": String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
        },
      }
    );
  }

  // Verify token
  const tokenData = verifyToken(token);
  if (!tokenData) {
    return new Response(
      renderHtml({
        title: "Invalid Link",
        message: "This unsubscribe link is invalid or has expired.",
        success: false,
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Get contact info
  const [contact] = await db
    .select({
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      emailOptIn: contacts.emailOptIn,
      smsOptIn: contacts.smsOptIn,
    })
    .from(contacts)
    .where(eq(contacts.id, tokenData.contactId))
    .limit(1);

  if (!contact) {
    return new Response(
      renderHtml({
        title: "Contact Not Found",
        message: "We couldn't find your contact information.",
        success: false,
      }),
      {
        status: 404,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  const channelLabel = tokenData.channel === "email" ? "email" : "SMS";
  const currentlyOptedIn =
    tokenData.channel === "email" ? contact.emailOptIn : contact.smsOptIn;

  if (!currentlyOptedIn) {
    return new Response(
      renderHtml({
        title: "Already Unsubscribed",
        message: `You are already unsubscribed from ${channelLabel} communications.`,
        success: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Show confirmation page with form
  return new Response(
    renderConfirmationPage({
      name: `${contact.firstName} ${contact.lastName}`,
      channel: channelLabel,
      token,
    }),
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}

// ============================================================================
// POST HANDLER - Process unsubscribe
// ============================================================================

export async function POST({
  params,
  request,
}: {
  params: { token: string };
  request: Request;
}) {
  const { token } = params;

  // Rate limiting (SEC-003)
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimitSync(
    "unsubscribe",
    clientId,
    UNSUBSCRIBE_RATE_LIMIT
  );

  if (!rateLimitResult.allowed) {
    return new Response(
      renderHtml({
        title: "Too Many Requests",
        message: UNSUBSCRIBE_RATE_LIMIT.message,
        success: false,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "text/html",
          "Retry-After": String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
        },
      }
    );
  }

  // Verify token
  const tokenData = verifyToken(token);
  if (!tokenData) {
    return new Response(
      renderHtml({
        title: "Invalid Link",
        message: "This unsubscribe link is invalid or has expired.",
        success: false,
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Get contact info
  const [contact] = await db
    .select({
      id: contacts.id,
      customerId: contacts.customerId,
      organizationId: contacts.organizationId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      emailOptIn: contacts.emailOptIn,
      smsOptIn: contacts.smsOptIn,
    })
    .from(contacts)
    .where(eq(contacts.id, tokenData.contactId))
    .limit(1);

  if (!contact) {
    return new Response(
      renderHtml({
        title: "Contact Not Found",
        message: "We couldn't find your contact information.",
        success: false,
      }),
      {
        status: 404,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  const now = new Date().toISOString();
  const channelLabel = tokenData.channel === "email" ? "email" : "SMS";

  // Update preference
  const updateData =
    tokenData.channel === "email"
      ? { emailOptIn: false, emailOptInAt: now }
      : { smsOptIn: false, smsOptInAt: now };

  await db
    .update(contacts)
    .set(updateData)
    .where(eq(contacts.id, tokenData.contactId));

  // INT-RES-007: Add to suppression list for email channel
  if (tokenData.channel === "email") {
    // Use email from secure token if available, otherwise use contact's email
    const emailToSuppress = tokenData.email || contact.email;
    // Use organizationId from secure token if available, otherwise use contact's org
    const orgId = tokenData.organizationId || contact.organizationId;

    if (emailToSuppress && orgId) {
      try {
        await addSuppressionDirect({
          organizationId: orgId,
          email: emailToSuppress,
          reason: "unsubscribe",
          source: "api",
          metadata: {
            contactId: contact.id,
            emailId: tokenData.emailId,
            method: "unsubscribe-link",
            unsubscribedAt: now,
          },
        });
      } catch (error) {
        // Log but don't fail the unsubscribe if suppression fails
        console.error("[unsubscribe] Failed to add to suppression list:", error);
      }
    }
  }

  // Log to activities for compliance
  await db.insert(customerActivities).values({
    organizationId: contact.organizationId,
    customerId: contact.customerId,
    contactId: contact.id,
    createdBy: contact.id, // Self-service unsubscribe
    activityType: "note",
    description: `Communication preference changed: ${contact.firstName} ${contact.lastName} opted out of ${channelLabel} communications via unsubscribe link`,
    metadata: {
      preferenceChange: true,
      channel: channelLabel,
      oldValue: tokenData.channel === "email" ? contact.emailOptIn : contact.smsOptIn,
      newValue: false,
      changedAt: now,
      changedBy: "self-service",
      method: "unsubscribe-link",
      contactName: `${contact.firstName} ${contact.lastName}`,
      secureToken: tokenData.isSecure, // Track which token format was used
    },
  });

  return new Response(
    renderHtml({
      title: "Unsubscribed Successfully",
      message: `You have been unsubscribed from ${channelLabel} communications.`,
      success: true,
    }),
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}

// ============================================================================
// HTML RENDERING HELPERS
// ============================================================================

interface HtmlProps {
  title: string;
  message: string;
  success: boolean;
}

function renderHtml({ title, message, success }: HtmlProps): string {
  const icon = success
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
    <div class="flex justify-center mb-4">${icon}</div>
    <h1 class="text-2xl font-semibold text-gray-900 mb-2">${title}</h1>
    <p class="text-gray-600">${message}</p>
  </div>
</body>
</html>`;
}

interface ConfirmationProps {
  name: string;
  channel: string;
  token: string;
}

function renderConfirmationPage({ name, channel, token }: ConfirmationProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
    <div class="text-center mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-gray-400 mb-4"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      <h1 class="text-2xl font-semibold text-gray-900 mb-2">Unsubscribe</h1>
      <p class="text-gray-600">Hi ${name}, would you like to unsubscribe from ${channel} communications?</p>
    </div>
    <form method="POST" action="/api/unsubscribe/${token}" class="space-y-4">
      <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
        Unsubscribe from ${channel}
      </button>
    </form>
    <p class="text-xs text-gray-500 text-center mt-4">
      You can re-subscribe at any time by contacting us.
    </p>
  </div>
</body>
</html>`;
}
