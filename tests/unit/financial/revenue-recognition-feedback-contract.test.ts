import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = vi.hoisted(() => ({
  selectQueue: [] as Array<Array<Record<string, unknown>>>,
}));

function makeQuery(rows: Array<Record<string, unknown>>) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => Promise.resolve(rows)),
    groupBy: vi.fn(() => Promise.resolve(rows)),
    then: (
      resolve: (value: Array<Record<string, unknown>>) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
  };

  return chain;
}

vi.mock('@/lib/db', () => ({
  db: {
    select: () => makeQuery(dbState.selectQueue.shift() ?? []),
  },
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function recognition(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recognition-1',
    orderId: 'order-1',
    orderNumber: 'ORD-001',
    customerId: 'customer-1',
    customerName: 'RENOZ customer',
    recognitionType: 'milestone',
    milestoneName: 'Install',
    recognizedAmount: 1200,
    recognitionDate: '2026-05-06',
    state: 'sync_failed',
    xeroSyncAttempts: 1,
    xeroSyncError: null,
    lastXeroSyncAt: new Date('2026-05-06T01:00:00.000Z'),
    xeroJournalId: null,
    notes: null,
    createdAt: new Date('2026-05-06T00:00:00.000Z'),
    ...overrides,
  };
}

describe('revenue recognition feedback contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.selectQueue = [];
  });

  it('formats revenue-recognition Xero sync errors without exposing provider internals', async () => {
    const { formatRevenueRecognitionXeroSyncError } = await import(
      '@/server/functions/financial/_shared/xero-sync-feedback'
    );

    expect(
      formatRevenueRecognitionXeroSyncError(
        'duplicate key violates revenue_recognition_access_token_key at provider stack frame',
        'sync_failed',
      )
    ).toBe(
      'Xero connection needs attention before revenue journals can sync.'
    );
    expect(
      formatRevenueRecognitionXeroSyncError(
        'Xero revenue recognition accounts are not configured: sql settings lookup failed',
        'sync_failed',
      )
    ).toBe(
      'Xero revenue recognition account settings need attention before journals can sync.'
    );
    expect(
      formatRevenueRecognitionXeroSyncError(
        'Xero validation failed with raw provider payload',
        'manual_override',
      )
    ).toBe(
      'Revenue recognition needs manual accounting review before another Xero sync attempt.'
    );
  });

  it('returns safe order recognition read errors', async () => {
    dbState.selectQueue = [
      [
        recognition({
          xeroSyncError:
            'duplicate key violates revenue_recognition_access_token_key at provider stack frame',
        }),
      ],
    ];

    const { readOrderRecognitions } = await import(
      '@/server/functions/financial/_shared/revenue-recognition-read'
    );
    const result = await readOrderRecognitions(
      { organizationId: 'org-1', user: { id: 'user-1' } } as never,
      { orderId: 'order-1' } as never,
    );

    expect(result[0]?.xeroSyncError).toBe(
      'Xero connection needs attention before revenue journals can sync.'
    );
    expect(JSON.stringify(result)).not.toContain('duplicate key');
    expect(JSON.stringify(result)).not.toContain('access_token');
    expect(JSON.stringify(result)).not.toContain('provider stack');
  });

  it('returns safe recognition list errors for the revenue page read model', async () => {
    dbState.selectQueue = [
      [
        recognition({
          state: 'manual_override',
          xeroSyncError: 'Xero validation failed with raw provider payload',
        }),
      ],
      [{ count: 1 }],
      [{ state: 'manual_override', count: 1 }],
    ];

    const { readRecognitionsByState } = await import(
      '@/server/functions/financial/_shared/revenue-recognition-read'
    );
    const result = await readRecognitionsByState(
      { organizationId: 'org-1', user: { id: 'user-1' } } as never,
      { state: 'manual_override', page: 1, pageSize: 50 } as never,
    );

    expect(result.records[0]?.xeroSyncError).toBe(
      'Revenue recognition needs manual accounting review before another Xero sync attempt.'
    );
    expect(JSON.stringify(result)).not.toContain('raw provider payload');
    expect(result.stateCounts).toEqual({ manual_override: 1 });
  });

  it('keeps revenue-recognition Xero reads behind the shared feedback helper', () => {
    const readModel = read('src/server/functions/financial/_shared/revenue-recognition-read.ts');
    const mutation = read('src/server/functions/financial/_shared/revenue-recognition-xero-sync.ts');
    const feedback = read('src/server/functions/financial/_shared/xero-sync-feedback.ts');

    expect(feedback).toContain('formatRevenueRecognitionXeroSyncError');
    expect(readModel).toContain('formatRevenueRecognitionXeroSyncError(');
    expect(readModel).not.toMatch(/\n\s+xeroSyncError:\s+r\.xeroSyncError,\n\s+lastXeroSyncAt/);
    expect(mutation).toContain('error: formatRevenueRecognitionXeroSyncError(errorMessage, recognition.state)');
    expect(mutation).toContain('error: formatRevenueRecognitionXeroSyncError(errorMessage, newState)');
    expect(mutation).not.toContain('error: errorMessage');
    expect(mutation).not.toContain('error: readiness.message');
  });
});
