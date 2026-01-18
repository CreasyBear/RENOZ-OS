/**
 * Email Link Click Tracking Endpoint
 *
 * GET /api/track/click/:emailId/:linkId?url=<encoded-url>
 *
 * Records the link click and redirects to the original URL.
 * Validates the URL against the stored linkMap to prevent open redirect attacks.
 *
 * @see DOM-COMMS-001b
 */

import { createAPIFileRoute } from "@tanstack/start/api";
import { recordEmailClick } from "@/lib/server/email-tracking";
import { db } from "@/lib/db";
import { emailHistory } from "@/../drizzle/schema";
import { eq } from "drizzle-orm";

export const APIRoute = createAPIFileRoute("/api/track/click/$emailId/$linkId")({
  GET: async ({ params, request }) => {
    const { emailId, linkId } = params;

    // Get the original URL from query params
    const url = new URL(request.url);
    const originalUrl = url.searchParams.get("url");

    if (!originalUrl) {
      return new Response("Missing URL parameter", { status: 400 });
    }

    // Decode the URL
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(originalUrl);
    } catch {
      return new Response("Invalid URL encoding", { status: 400 });
    }

    // Validate the URL is a valid URL (basic security check)
    try {
      new URL(decodedUrl);
    } catch {
      return new Response("Invalid URL", { status: 400 });
    }

    // ========================================================================
    // SECURITY: Validate URL against stored linkMap
    // ========================================================================
    // Prevent open redirect attacks by verifying the target URL exists
    // in the original email's linkMap stored in metadata
    try {
      const [email] = await db
        .select({
          metadata: emailHistory.metadata,
        })
        .from(emailHistory)
        .where(eq(emailHistory.id, emailId))
        .limit(1);

      if (!email) {
        console.warn(`[track/click] Email not found: ${emailId}`);
        return new Response("Email not found", { status: 404 });
      }

      // Check if linkMap exists in metadata
      const linkMap = email.metadata?.linkMap as Record<string, string> | undefined;

      if (!linkMap) {
        console.warn(`[track/click] No linkMap found for email: ${emailId}`);
        return new Response("Link tracking data not found", { status: 400 });
      }

      // Verify the linkId exists in the linkMap
      const storedUrl = linkMap[linkId];

      if (!storedUrl) {
        console.warn(`[track/click] Invalid linkId: ${linkId} for email: ${emailId}`);
        return new Response("Invalid link", { status: 400 });
      }

      // Verify the URL matches the stored URL
      if (storedUrl !== decodedUrl) {
        console.warn(
          `[track/click] URL mismatch for linkId ${linkId}: expected ${storedUrl}, got ${decodedUrl}`
        );
        return new Response("URL mismatch", { status: 400 });
      }

      // URL is validated - safe to redirect
      decodedUrl = storedUrl;
    } catch (error) {
      console.error("[track/click] Error validating URL:", error);
      return new Response("Validation error", { status: 500 });
    }

    // Get request metadata for tracking
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    // Record the click (fire-and-forget, don't block redirect)
    recordEmailClick(emailId, linkId, decodedUrl, {
      userAgent,
      ipAddress,
    }).catch((err) => {
      console.error("[track/click] Error recording click:", err);
    });

    // Redirect to the validated URL
    return new Response(null, {
      status: 302,
      headers: {
        Location: decodedUrl,
        // Prevent caching of the redirect
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  },
});
