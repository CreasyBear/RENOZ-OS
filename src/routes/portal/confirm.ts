import { type EmailOtpType } from '@supabase/supabase-js';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/server/rate-limit';
import { sanitizeInternalRedirect } from '@/lib/auth/redirects';
import { authErrorMessage, toAuthErrorCode } from '@/lib/auth/error-codes';

const confirmPortalFn = createServerFn({ method: 'GET' })
  .inputValidator((searchParams: unknown) => {
    if (searchParams && typeof searchParams === 'object') {
      const params = searchParams as Record<string, unknown>;
      if (typeof params.token_hash === 'string' && typeof params.type === 'string') {
        return params;
      }
    }
    throw new Error('Invalid search params');
  })
  .handler(async (ctx) => {
    const { getRequest } = await import('@tanstack/react-start/server');
    const { createServerSupabase } = await import('@/lib/supabase/server');

    const request = getRequest();
    if (!request) {
      throw redirect({
        to: `/auth/error`,
        search: { error: 'invalid_request', error_description: authErrorMessage('invalid_request') },
      });
    }

    const searchParams = ctx.data;
    const token_hash = searchParams['token_hash'] as string;
    const type = searchParams['type'] as EmailOtpType | null;
    const next = sanitizeInternalRedirect(searchParams['next'], { fallback: '/portal' });

    // Throttle token verification to reduce abuse and token-guess attempts.
    const clientId = getClientIdentifier(request);
    checkRateLimit('auth-confirm-portal', `${clientId}:${token_hash}`, RATE_LIMITS.publicAction);

    if (token_hash && type) {
      const supabase = createServerSupabase(request);
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        throw redirect({ href: next });
      }

      const code = toAuthErrorCode(error?.message);
      throw redirect({
        to: `/auth/error`,
        search: { error: code, error_description: authErrorMessage(code) },
      });
    }

    throw redirect({
      to: `/auth/error`,
      search: { error: 'invalid_request', error_description: authErrorMessage('invalid_request') },
    });
  });

export const Route = createFileRoute('/portal/confirm')({
  preload: false,
  loader: (opts) => confirmPortalFn({ data: opts.location.search }),
});
