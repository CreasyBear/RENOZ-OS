import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockExchangeCodeForSession = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/auth/exchange-code-for-session', () => ({
  exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

describe('update-password route beforeLoad', () => {
  const originalWindow = globalThis.window;
  let mockLocation: { hash: string; href: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockLocation = { hash: '', href: 'http://localhost:3000/update-password' };
    Object.defineProperty(globalThis, 'window', {
      value: { location: mockLocation },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it('returns early on server (no redirect)', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { code: undefined },
      } as never)
    ).resolves.toBeUndefined();
  });

  it('redirects to /forgot-password when no code and no auth params in hash', async () => {
    mockLocation.hash = '';
    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { code: undefined },
      } as never)
    ).rejects.toMatchObject({
      options: { to: '/forgot-password' },
    });
  });

  it('redirects to /forgot-password when no code and hash has no auth params', async () => {
    mockLocation.hash = '#some-other-param=value';
    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { code: undefined },
      } as never)
    ).rejects.toMatchObject({
      options: { to: '/forgot-password' },
    });
  });

  it('does not redirect when hash contains access_token (implicit flow)', async () => {
    mockLocation.hash = '#access_token=xxx&refresh_token=yyy';
    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { code: undefined },
      } as never)
    ).resolves.toBeUndefined();
  });

  it('does not redirect when hash contains error= (auth error in hash)', async () => {
    mockLocation.hash = '#error=invalid_request&error_description=Expired';
    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { code: undefined },
      } as never)
    ).resolves.toBeUndefined();
  });

  it('exchanges code and returns when code is valid', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    await expect(
      beforeLoad({
        search: { code: 'valid-code-123' },
      } as never)
    ).resolves.toBeUndefined();

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code-123');
  });

  it('redirects to /auth/error when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid or expired code' },
    });
    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { code: 'expired-code' },
      } as never)
    ).rejects.toMatchObject({
      options: {
        to: '/auth/error',
        search: {
          error: 'invalid_request',
          error_description: expect.stringContaining('invalid or expired'),
        },
      },
    });
  });

  it('allows through when code exchange fails but recovery session already exists', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid or expired code' },
    });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    const { Route } = await import('@/routes/update-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    await expect(
      beforeLoad({
        search: { code: 'already-consumed-code' },
      } as never)
    ).resolves.toBeUndefined();
  });
});
