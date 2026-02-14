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

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

describe('root index route server redirect behavior', () => {
  beforeEach(() => {
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

  it('does not redirect when router path is not "/" even if request path is normalized to "/"', async () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    try {
      // Simulate production normalization where server request appears as "/"
      // while the router location still points to the actual route.
      mockGetRequest.mockReturnValue(new Request('http://localhost:3000/'));
      const { Route } = await import('@/routes/index');
      const beforeLoad = Route.options.beforeLoad;

      if (!beforeLoad) {
        throw new Error('Expected index route to define beforeLoad');
      }

      await expect(
        beforeLoad({
          location: {
            pathname: '/login',
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

  it('does not redirect unauthenticated "/" request on server', async () => {
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
      ).resolves.toBeUndefined();
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });
});
