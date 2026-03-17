import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithAuth = vi.fn();
const mockLogger = {
  error: vi.fn(),
};

const mockDb = {
  select: vi.fn(),
};

vi.mock('@/lib/server/protected', () => ({
  withAuth: (...args: unknown[]) => mockWithAuth(...args),
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

describe('ai artifacts route', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockWithAuth.mockResolvedValue({
      organizationId: 'org-1',
      user: { id: 'user-1' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('streams task-backed report artifacts instead of placeholder pending data', async () => {
    mockDb.select.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'task-1',
          organizationId: 'org-1',
          taskType: 'report_generation',
          agent: 'operations',
          status: 'completed',
          progress: 100,
          currentStep: 'Done',
          result: {
            success: true,
            summary: 'Report ready',
            artifacts: [
              {
                type: 'report',
                id: 'report_task-1',
                url: 'https://example.com/report.csv',
                metadata: {
                  reportKind: 'sales_summary',
                  status: 'completed',
                },
              },
            ],
          },
          queuedAt: new Date('2026-03-16T00:00:00.000Z'),
          startedAt: new Date('2026-03-16T00:01:00.000Z'),
          completedAt: new Date('2026-03-16T00:02:00.000Z'),
          tokensUsed: 0,
          cost: 0,
        },
      ])
    );

    const { GET } = await import('@/routes/api/ai/artifacts.$id');

    const responsePromise = GET({ params: { id: 'report_task-1' } });
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const bodyPromise = response.text();
    await vi.runAllTimersAsync();
    const body = await bodyPromise;

    expect(response.status).toBe(200);
    expect(body).toContain('"stage":"data_ready"');
    expect(body).toContain('"type":"report"');
    expect(body).toContain('"id":"report_task-1"');
    expect(body).toContain('"url":"https://example.com/report.csv"');
    expect(body).not.toContain('Report data not yet available');
  });

  it('returns an explicit report artifact not found stage when no task-backed report exists', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([]));

    const { GET } = await import('@/routes/api/ai/artifacts.$id');

    const responsePromise = GET({ params: { id: 'report_missing-task' } });
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const bodyPromise = response.text();
    await vi.runAllTimersAsync();
    const body = await bodyPromise;

    expect(response.status).toBe(200);
    expect(body).toContain('"stage":"error"');
    expect(body).toContain('Report artifact not found for the referenced AI task');
    expect(body).not.toContain('Report data not yet available');
  });
});
