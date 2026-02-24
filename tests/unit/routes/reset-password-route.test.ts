import { describe, expect, it } from 'vitest';

describe('reset-password legacy route', () => {
  it('preserves code query param when redirecting to /update-password', async () => {
    const { Route } = await import('@/routes/reset-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    try {
      beforeLoad({
        search: { code: 'legacy-code-123' },
      } as never);
      throw new Error('Expected redirect to be thrown');
    } catch (error) {
      expect(error).toMatchObject({
        status: 307,
        options: {
          to: '/update-password',
          search: { code: 'legacy-code-123' },
          replace: true,
        },
      });
    }
  });

  it('redirects safely when code is missing', async () => {
    const { Route } = await import('@/routes/reset-password');
    const beforeLoad = Route.options.beforeLoad;
    if (!beforeLoad) throw new Error('Expected beforeLoad');

    try {
      beforeLoad({
        search: { code: undefined },
      } as never);
      throw new Error('Expected redirect to be thrown');
    } catch (error) {
      expect(error).toMatchObject({
        status: 307,
        options: {
          to: '/update-password',
          search: { code: undefined },
          replace: true,
        },
      });
    }
  });
});
