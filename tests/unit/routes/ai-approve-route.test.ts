import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithAuth = vi.fn();
const mockExecuteAction = vi.fn();
const mockRejectAction = vi.fn();
const mockLogger = {
  error: vi.fn(),
};

vi.mock('@/lib/server/protected', () => ({
  withAuth: (...args: unknown[]) => mockWithAuth(...args),
}));

vi.mock('@/server/functions/ai/approvals', () => ({
  executeAction: (...args: unknown[]) => mockExecuteAction(...args),
  rejectAction: (...args: unknown[]) => mockRejectAction(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('ai approve route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithAuth.mockResolvedValue({
      user: { id: 'user-1' },
      organizationId: 'org-1',
    });
  });

  it('returns 503 with retry metadata when delivery can be retried on the same approval', async () => {
    mockExecuteAction.mockResolvedValue({
      success: false,
      code: 'DELIVERY_RETRY_REQUIRED',
      error: 'Approval was recorded, but email delivery failed. Retry approval to resend email.',
      retryAvailable: true,
    });

    const { POST } = await import('@/routes/api/ai/approve');

    const response = await POST({
      request: new Request('http://localhost/api/ai/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          approvalId: '11111111-1111-4111-8111-111111111111',
          action: 'approve',
          expectedVersion: 3,
        }),
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: 'DELIVERY_RETRY_REQUIRED',
      error: 'Approval was recorded, but email delivery failed. Retry approval to resend email.',
      retryAvailable: true,
    });
  });
});
