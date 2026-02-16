import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAuthContext = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: () => mockSignOut(),
    },
  },
}));

vi.mock('@/lib/auth/route-auth', () => ({
  getAuthContext: (...args: unknown[]) => mockGetAuthContext(...args),
  isRouterRedirect: (e: unknown) => !!(e && typeof e === 'object' && 'to' in e),
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
  });

  it('returns early for reason=session_expired without forcing sign-out', async () => {
    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await beforeLoad({
      search: { redirect: undefined, reason: 'session_expired' },
    } as never);

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('returns early for reason=offline without forcing sign-out', async () => {
    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await beforeLoad({
      search: { redirect: undefined, reason: 'offline' },
    } as never);

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('returns early for reason=auth_check_failed without forcing sign-out', async () => {
    const { Route } = await import('@/routes/login');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await beforeLoad({
      search: { redirect: undefined, reason: 'auth_check_failed' },
    } as never);

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('redirects authenticated user to sanitized target, never to /login', async () => {
    mockGetAuthContext.mockResolvedValue({
      user: { id: 'user-1' },
      appUser: { id: 'app-1', organizationId: 'org-1', role: 'owner', status: 'active' },
    });

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', { value: {}, writable: true, configurable: true });
    try {
      const { Route } = await import('@/routes/login');
      const beforeLoad = Route.options.beforeLoad;
      if (!beforeLoad) throw new Error('Expected beforeLoad');

      await expect(
        beforeLoad({
          search: { redirect: '/login', reason: undefined },
          location: { pathname: '/login' },
        } as never)
      ).rejects.toMatchObject({
        options: {
          to: '/dashboard',
          replace: true,
        },
      });
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });

  it('redirects authenticated user to search.redirect when safe', async () => {
    mockGetAuthContext.mockResolvedValue({
      user: { id: 'user-1' },
      appUser: { id: 'app-1', organizationId: 'org-1', role: 'owner', status: 'active' },
    });

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', { value: {}, writable: true, configurable: true });
    try {
      const { Route } = await import('@/routes/login');
      const beforeLoad = Route.options.beforeLoad;
      if (!beforeLoad) throw new Error('Expected beforeLoad');

      await expect(
        beforeLoad({
          search: { redirect: '/customers', reason: undefined },
          location: { pathname: '/login' },
        } as never)
      ).rejects.toMatchObject({
        options: {
          to: '/customers',
          replace: true,
        },
      });
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });
});
