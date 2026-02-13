/**
 * OAuth Callback Endpoint
 *
 * GET /api/oauth/callback
 */

import { db } from '@/lib/db';
import { handleOAuthCallback } from '@/lib/oauth/flow';
import { toAuthErrorCode } from '@/lib/auth/error-codes';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || undefined;
  const state = url.searchParams.get('state') || undefined;
  const error = url.searchParams.get('error') || undefined;
  const errorDescription = url.searchParams.get('error_description') || undefined;

  const result = await handleOAuthCallback({
    code,
    state,
    error,
    errorDescription,
    db,
  });

  const redirectUrl =
    result.success ? result.redirectUrl : `${url.origin}/integrations/oauth`;
  const redirect = new URL(redirectUrl);
  redirect.searchParams.set('oauth', result.success ? 'success' : 'failed');

  if (!result.success) {
    redirect.searchParams.set('error', toAuthErrorCode(result.error));
  }

  return new Response(null, {
    status: 302,
    headers: { Location: redirect.toString() },
  });
}
