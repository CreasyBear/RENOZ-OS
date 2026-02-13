import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetRequest = vi.fn();
const mockGetServerUser = vi.fn();
const mockDbExecute = vi.fn();
const mockSelectLimit = vi.fn();

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => mockGetRequest(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: (...args: unknown[]) => mockSelectLimit(...args),
        }),
      }),
    }),
    execute: (...args: unknown[]) => mockDbExecute(...args),
  },
}));

function renderSqlChunks(sqlArg: unknown): string {
  const maybe = sqlArg as { queryChunks?: Array<{ value?: unknown }> } | undefined;
  const chunks = maybe?.queryChunks ?? [];
  return chunks
    .map((chunk) => {
      const value = chunk?.value;
      if (Array.isArray(value)) {
        return value.join('');
      }
      return typeof value === 'string' ? value : '';
    })
    .join('');
}

describe('withAuth organization context', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetRequest.mockReturnValue(new Request('http://localhost:3000'));
    mockGetServerUser.mockResolvedValue({
      id: 'auth-user-1',
      email: 'admin@test.com',
    });
    mockSelectLimit.mockResolvedValue([
      {
        id: 'app-user-1',
        authId: 'auth-user-1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'owner',
        status: 'active',
        organizationId: 'org-1',
      },
    ]);
    mockDbExecute.mockResolvedValue(undefined);
  });

  it('sets app.organization_id with non-local scope', async () => {
    const { withAuth } = await import('@/lib/server/protected');

    await withAuth();

    const firstExecuteArg = mockDbExecute.mock.calls[0]?.[0];
    const rendered = renderSqlChunks(firstExecuteArg);

    expect(rendered).toContain("set_config('app.organization_id'");
    expect(rendered).toContain(', false)');
  });

  it('returns resolved org context from the app user row', async () => {
    const { withAuth } = await import('@/lib/server/protected');

    const ctx = await withAuth();

    expect(ctx.organizationId).toBe('org-1');
    expect(ctx.user.email).toBe('admin@test.com');
    expect(ctx.user.authId).toBe('auth-user-1');
  });
});
