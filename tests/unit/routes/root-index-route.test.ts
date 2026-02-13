import { describe, expect, it } from 'vitest';

describe('root index route server redirect behavior', () => {
  it('does not redirect non-root paths on server', async () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    try {
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
});
