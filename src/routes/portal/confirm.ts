import { type EmailOtpType } from '@supabase/supabase-js';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

const confirmPortalFn = createServerFn({ method: 'GET' })
  .inputValidator((searchParams: unknown) => {
    if (
      searchParams &&
      typeof searchParams === 'object' &&
      'token_hash' in searchParams &&
      'type' in searchParams &&
      'next' in searchParams
    ) {
      return searchParams;
    }
    throw new Error('Invalid search params');
  })
  .handler(async (ctx) => {
    const { getRequest } = await import('@tanstack/react-start/server');
    const { createClient } = await import('~/lib/supabase/server');

    const request = getRequest();
    if (!request) {
      throw redirect({ to: `/auth/error`, search: { error: 'No request' } });
    }

    const searchParams = ctx.data;
    const token_hash = searchParams['token_hash'] as string;
    const type = searchParams['type'] as EmailOtpType | null;
    const _next = searchParams['next'] as string;
    const next = _next?.startsWith('/') ? _next : '/portal';

    if (token_hash && type) {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        throw redirect({ href: next });
      }

      throw redirect({
        to: `/auth/error`,
        search: { error: error?.message },
      });
    }

    throw redirect({
      to: `/auth/error`,
      search: { error: 'No token hash or type' },
    });
  });

export const Route = createFileRoute('/portal/confirm')({
  preload: false,
  loader: (opts) => confirmPortalFn({ data: opts.location.search }),
});
