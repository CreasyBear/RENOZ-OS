import { describe, expect, it } from 'vitest';

describe('optional-root GET schemas', () => {
  it('treat omitted fulfillment kanban filters as an empty object', async () => {
    const { fulfillmentKanbanQuerySchema } = await import('@/server/functions/orders/order-kanban');
    expect(fulfillmentKanbanQuerySchema.parse(undefined)).toEqual({});
  });

  it('still validates explicit fulfillment kanban filters', async () => {
    const { fulfillmentKanbanQuerySchema } = await import('@/server/functions/orders/order-kanban');

    expect(
      fulfillmentKanbanQuerySchema.parse({
        search: 'INV-1001',
        dateFrom: '2026-04-01',
      })
    ).toEqual({
      search: 'INV-1001',
      dateFrom: new Date('2026-04-01'),
    });
  });

  it('treat omitted support metrics filters as an empty object', async () => {
    const { getSupportMetricsSchema } = await import('@/server/functions/support/support-metrics');
    expect(getSupportMetricsSchema.parse(undefined)).toEqual({});
  });

  it('still validates explicit support metrics filters', async () => {
    const { getSupportMetricsSchema } = await import('@/server/functions/support/support-metrics');

    expect(
      getSupportMetricsSchema.parse({
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: '2026-04-30T23:59:59.999Z',
      })
    ).toEqual({
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-30T23:59:59.999Z',
    });
  });

  it('treat omitted SLA metrics filters as an empty object', async () => {
    const { getSlaMetricsSchema } = await import('@/server/functions/support/sla');
    expect(getSlaMetricsSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted SLA issue-type report filters as an empty object', async () => {
    const { getSlaReportByIssueTypeSchema } = await import('@/server/functions/support/sla');
    expect(getSlaReportByIssueTypeSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted win/loss analysis filters as an empty object', async () => {
    const { winLossAnalysisQuerySchema } = await import('@/server/functions/pipeline/win-loss-reasons');
    expect(winLossAnalysisQuerySchema.parse(undefined)).toEqual({});
  });

  it('treat omitted audit stats filters as an empty object', async () => {
    const { auditStatsSchema } = await import('@/server/functions/_shared/audit-logs');
    expect(auditStatsSchema.parse(undefined)).toEqual({});
  });
});
