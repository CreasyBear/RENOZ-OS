/**
 * OAuth Callback Endpoint
 *
 * GET /api/oauth/callback
 */

import { db } from '@/lib/db';
import { toOAuthConnectionErrorCode } from '@/lib/oauth/oauth-error-messages';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || undefined;
  const state = url.searchParams.get('state') || undefined;
  const error = url.searchParams.get('error') || undefined;
  const errorDescription = url.searchParams.get('error_description') || undefined;

  const { handleOAuthCallback } = await import('@/lib/oauth/flow');
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

  if (!result.success && result.error === 'TENANT_SELECTION_REQUIRED' && 'stateId' in result) {
    redirect.searchParams.set('oauth', 'select_tenant');
    redirect.searchParams.set('oauthStateId', result.stateId);
    redirect.searchParams.set('provider', 'xero');
  } else {
    redirect.searchParams.set('oauth', result.success ? 'success' : 'failed');
  }

  if (!result.success && result.error !== 'TENANT_SELECTION_REQUIRED') {
    redirect.searchParams.set('error', toOAuthConnectionErrorCode(result.error));
  }

  return new Response(null, {
    status: 302,
    headers: { Location: redirect.toString() },
  });
}
