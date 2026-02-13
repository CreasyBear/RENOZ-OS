/**
 * Support Metrics Structure Unit Tests
 *
 * Validates that SupportMetricsResponse has the expected shape.
 * Uses a fixture to assert the interface structure without mocking DB.
 *
 * @see src/server/functions/support/support-metrics.ts
 */

import { describe, it, expect } from 'vitest';
import type { SupportMetricsResponse } from '@/server/functions/support/support-metrics';

/** Minimal valid fixture matching SupportMetricsResponse */
function createValidMetricsFixture(): SupportMetricsResponse {
  return {
    overview: {
      openIssues: 0,
      inProgressIssues: 0,
      resolvedToday: 0,
      avgResolutionHours: 0,
    },
    sla: {
      totalTracked: 0,
      breached: 0,
      atRisk: 0,
      onTrack: 0,
      complianceRate: 100,
    },
    breakdown: {
      byStatus: [],
      byType: [],
      byPriority: [],
    },
    trend: {
      openedThisWeek: 0,
      closedThisWeek: 0,
      netChange: 0,
    },
    triage: {
      overdueSla: 0,
      escalated: 0,
      myIssues: 0,
    },
  };
}

describe('SupportMetricsResponse structure', () => {
  it('fixture has required overview fields', () => {
    const m = createValidMetricsFixture();
    expect(m.overview).toHaveProperty('openIssues');
    expect(m.overview).toHaveProperty('inProgressIssues');
    expect(m.overview).toHaveProperty('resolvedToday');
    expect(m.overview).toHaveProperty('avgResolutionHours');
    expect(typeof m.overview.openIssues).toBe('number');
    expect(typeof m.overview.avgResolutionHours).toBe('number');
  });

  it('fixture has required sla fields', () => {
    const m = createValidMetricsFixture();
    expect(m.sla).toHaveProperty('totalTracked');
    expect(m.sla).toHaveProperty('breached');
    expect(m.sla).toHaveProperty('atRisk');
    expect(m.sla).toHaveProperty('onTrack');
    expect(m.sla).toHaveProperty('complianceRate');
    expect(typeof m.sla.complianceRate).toBe('number');
  });

  it('fixture has required breakdown arrays', () => {
    const m = createValidMetricsFixture();
    expect(Array.isArray(m.breakdown.byStatus)).toBe(true);
    expect(Array.isArray(m.breakdown.byType)).toBe(true);
    expect(Array.isArray(m.breakdown.byPriority)).toBe(true);
  });

  it('fixture has required triage counts', () => {
    const m = createValidMetricsFixture();
    expect(m.triage).toHaveProperty('overdueSla');
    expect(m.triage).toHaveProperty('escalated');
    expect(m.triage).toHaveProperty('myIssues');
    expect(typeof m.triage.myIssues).toBe('number');
  });

  it('breakdown items have status/type/priority and count', () => {
    const m: SupportMetricsResponse = {
      ...createValidMetricsFixture(),
      breakdown: {
        byStatus: [{ status: 'open', count: 5 }],
        byType: [{ type: 'hardware_fault', count: 2 }],
        byPriority: [{ priority: 'high', count: 1 }],
      },
    };
    expect(m.breakdown.byStatus[0]).toMatchObject({ status: 'open', count: 5 });
    expect(m.breakdown.byType[0]).toMatchObject({ type: 'hardware_fault', count: 2 });
    expect(m.breakdown.byPriority[0]).toMatchObject({ priority: 'high', count: 1 });
  });
});
