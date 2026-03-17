import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithAuth = vi.fn();
const mockUpdateEmailApprovalDraft = vi.fn();
const mockLogger = {
  error: vi.fn(),
};

vi.mock('@/lib/server/protected', () => ({
  withAuth: (...args: unknown[]) => mockWithAuth(...args),
}));

vi.mock('@/server/functions/ai/approvals', () => ({
  updateEmailApprovalDraft: (...args: unknown[]) => mockUpdateEmailApprovalDraft(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('ai approval draft route', () => {
  const customerId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    mockWithAuth.mockResolvedValue({
      user: { id: 'user-1' },
      organizationId: 'org-1',
    });
  });

  it('returns the updated approval on success', async () => {
    mockUpdateEmailApprovalDraft.mockResolvedValue({
      success: true,
      approval: {
        id: 'approval-1',
        action: 'send_email',
        agent: 'customer',
        actionData: {
          actionType: 'send_email',
          availableActions: ['approve', 'edit', 'discard'],
          draft: {
            customerId,
            to: 'customer@example.com',
            subject: 'Updated subject',
            body: 'Updated body',
          },
        },
        version: 4,
        status: 'pending',
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        expiresAt: new Date('2026-03-17T00:00:00.000Z'),
        conversationId: null,
      },
    });

    const { PATCH } = await import('@/routes/api/ai/approvals.$approvalId');

    const response = await PATCH({
      params: { approvalId: 'approval-1' },
      request: new Request('http://localhost/api/ai/approvals/approval-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedVersion: 3,
          draft: {
            customerId,
            to: 'customer@example.com',
            subject: 'Updated subject',
            body: 'Updated body',
          },
        }),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      approval: expect.objectContaining({
        id: 'approval-1',
        version: 4,
      }),
    });
    expect(mockUpdateEmailApprovalDraft).toHaveBeenCalledWith(
      'approval-1',
      'user-1',
      'org-1',
      expect.objectContaining({
        to: 'customer@example.com',
        subject: 'Updated subject',
      }),
      3
    );
  });

  it('returns 409 for draft version conflicts', async () => {
    mockUpdateEmailApprovalDraft.mockResolvedValue({
      success: false,
      error: 'Approval draft changed before your edit was saved',
      code: 'VERSION_CONFLICT',
    });

    const { PATCH } = await import('@/routes/api/ai/approvals.$approvalId');

    const response = await PATCH({
      params: { approvalId: 'approval-1' },
      request: new Request('http://localhost/api/ai/approvals/approval-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedVersion: 2,
          draft: {
            customerId,
            to: 'customer@example.com',
            subject: 'Updated subject',
            body: 'Updated body',
          },
        }),
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Approval draft changed before your edit was saved',
      code: 'VERSION_CONFLICT',
    });
  });

  it('returns 400 for malformed json payloads', async () => {
    const { PATCH } = await import('@/routes/api/ai/approvals.$approvalId');

    const response = await PATCH({
      params: { approvalId: 'approval-1' },
      request: new Request('http://localhost/api/ai/approvals/approval-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{"draft":',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid JSON body',
      code: 'VALIDATION_ERROR',
    });
  });
});
