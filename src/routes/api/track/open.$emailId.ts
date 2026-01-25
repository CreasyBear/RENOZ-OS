/**
 * Email Open Tracking Endpoint
 *
 * GET /api/track/open/:emailId
 *
 * Returns a 1x1 transparent GIF pixel and records the email open.
 * This is loaded as an image in the email client.
 *
 * @see DOM-COMMS-001b
 */

import {
  recordEmailOpen,
  TRACKING_PIXEL,
  validateTrackingSignature,
} from "@/lib/server/email-tracking";

export async function GET({ request, params }: { request: Request; params: { emailId: string } }) {
  const { emailId } = params;

  // Validate HMAC signature
  const url = new URL(request.url);
  const sig = url.searchParams.get("sig");

  if (!sig || !validateTrackingSignature(emailId, sig)) {
    return new Response("Invalid tracking signature", { status: 403 });
  }

  // Record the open (fire-and-forget, don't block response)
  recordEmailOpen(emailId).catch((err) => {
    console.error("[track/open] Error recording open:", err);
  });

  // Return the tracking pixel
  return new Response(TRACKING_PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRACKING_PIXEL.length),
      // Prevent caching to ensure pixel is always fetched
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
