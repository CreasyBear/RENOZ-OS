import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetRequest = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => mockGetRequest(),
}));

vi.mock('~/lib/supabase/server', () => ({
  createServerSupabase: () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

describe('root index route server redirect behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: null,
      },
    });
  });

  it('does not redirect when HTTP request path is not "/" on server', async () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    try {
      mockGetRequest.mockReturnValue(new Request('http://localhost:3000/login'));
      const { Route } = await import('@/routes/index');
      const beforeLoad = Route.options.beforeLoad;

      if (!beforeLoad) {
        throw new Error('Expected index route to define beforeLoad');
      }

      await expect(
        beforeLoad({
          location: {
            // Simulate a potentially normalized router path in SSR.
            pathname: '/',
          },
        } as never)
      ).resolves.toBeUndefined();
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });

  it('redirects unauthenticated "/" request to /login on server', async () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    try {
      mockGetRequest.mockReturnValue(new Request('http://localhost:3000/'));
      const { Route } = await import('@/routes/index');
      const beforeLoad = Route.options.beforeLoad;

      if (!beforeLoad) {
        throw new Error('Expected index route to define beforeLoad');
      }

      await expect(
        beforeLoad({
          location: {
            pathname: '/',
          },
        } as never)
      ).rejects.toMatchObject({
        options: {
          to: '/login',
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
