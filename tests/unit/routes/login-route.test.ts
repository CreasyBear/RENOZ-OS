import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('~/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: () => mockSignOut(),
    },
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: () => mockSignOut(),
    },
  },
}));

vi.mock('~/lib/auth/route-auth', () => ({
  withAuthRetry: (fn: () => Promise<unknown>) => fn(),
}));

describe('login route beforeLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('signs out and returns early for reason=invalid_user', async () => {
    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await beforeLoad({
      search: { redirect: undefined, reason: 'invalid_user' },
    } as never);

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns early for reason=session_expired without forcing sign-out', async () => {
    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await beforeLoad({
      search: { redirect: undefined, reason: 'session_expired' },
    } as never);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns early for reason=offline without forcing sign-out', async () => {
    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await beforeLoad({
      search: { redirect: undefined, reason: 'offline' },
    } as never);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns early for reason=auth_check_failed without forcing sign-out', async () => {
    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await beforeLoad({
      search: { redirect: undefined, reason: 'auth_check_failed' },
    } as never);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects authenticated user to sanitized target, never to /login', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { redirect: '/login', reason: undefined },
      } as never)
    ).rejects.toMatchObject({
      options: {
        to: '/dashboard',
        replace: true,
      },
    });
  });

  it('redirects authenticated user to search.redirect when safe', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { redirect: '/customers', reason: undefined },
      } as never)
    ).rejects.toMatchObject({
      options: {
        to: '/customers',
        replace: true,
      },
    });
  });
});
