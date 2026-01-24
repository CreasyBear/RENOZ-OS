/**
 * OAuth Initiation Endpoint
 *
 * POST /api/oauth/initiate
 */

import { z } from 'zod';
import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { initiateOAuthFlow } from '@/lib/oauth/flow';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, RateLimitError } from '@/lib/server/rate-limit';

const requestSchema = z.object({
  provider: z.enum(['google_workspace', 'microsoft_365']),
  services: z.array(z.enum(['calendar', 'email', 'contacts'])).min(1).max(3),
  redirectUrl: z.string().url().optional(),
});

export async function POST({ request }: { request: globalThis.Request }) {
  try {
    const ctx = await withAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new globalThis.Response(JSON.stringify({ error: 'Invalid request', details: parsed.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientId = getClientIdentifier(request);
    checkRateLimit('oauth-initiate', clientId, RATE_LIMITS.publicAction);

    const origin = new URL(request.url).origin;
    const redirectUrl = parsed.data.redirectUrl || `${origin}/integrations/oauth`;

    const flow = await initiateOAuthFlow({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      provider: parsed.data.provider,
      services: parsed.data.services,
      redirectUrl,
      db,
    });

    return new globalThis.Response(
      JSON.stringify({
        authorizationUrl: flow.authorizationUrl,
        state: flow.state,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new globalThis.Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(error.retryAfterMs / 1000).toString(),
        },
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new globalThis.Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
