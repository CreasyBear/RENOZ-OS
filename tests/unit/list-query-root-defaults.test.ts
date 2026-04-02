import { describe, expect, it } from 'vitest';
import {
  customerCursorQuerySchema,
  customerListQuerySchema,
  customerMergeAuditCursorSchema,
} from '@/lib/schemas/customers/customers';
import {
  listActionPlansCursorSchema,
  listActionPlansSchema,
} from '@/lib/schemas/customers/action-plans';
import { orderCursorQuerySchema, orderListQuerySchema } from '@/lib/schemas/orders/orders';
import {
  templateListCursorQuerySchema,
  templateListQuerySchema,
} from '@/lib/schemas/orders/order-templates';
import {
  shipmentListCursorQuerySchema,
  shipmentListQuerySchema,
} from '@/lib/schemas/orders/shipments';
import {
  amendmentListCursorQuerySchema,
  amendmentListQuerySchema,
} from '@/lib/schemas/orders/order-amendments';
import {
  reminderTemplateListQuerySchema,
  reminderHistoryQuerySchema,
  overdueOrdersForRemindersQuerySchema,
} from '@/lib/schemas/financial/payment-reminders';
import {
  statementHistoryQuerySchema,
  statementListQuerySchema,
} from '@/lib/schemas/financial/statements';

describe('paginated list query schemas', () => {
  it('defaults omitted customer list input to pagination defaults', () => {
    expect(customerListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted customer cursor input to cursor defaults', () => {
    expect(customerCursorQuerySchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted customer merge audit cursor input', () => {
    expect(customerMergeAuditCursorSchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted action plan list input to pagination defaults', () => {
    expect(listActionPlansSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted action plan cursor input to cursor defaults', () => {
    expect(listActionPlansCursorSchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted order list input to pagination defaults', () => {
    expect(orderListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted order cursor input to cursor defaults', () => {
    expect(orderCursorQuerySchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted template list input to pagination defaults', () => {
    expect(templateListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('defaults omitted template cursor input to cursor defaults', () => {
    expect(templateListCursorQuerySchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted shipment list input to pagination defaults', () => {
    expect(shipmentListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted shipment cursor input to cursor defaults', () => {
    expect(shipmentListCursorQuerySchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted amendment list input to pagination defaults', () => {
    expect(amendmentListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'requestedAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted amendment cursor input to cursor defaults', () => {
    expect(amendmentListCursorQuerySchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted reminder template list input to pagination defaults', () => {
    expect(reminderTemplateListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
      includeInactive: false,
    });
  });

  it('defaults omitted reminder history input to pagination defaults', () => {
    expect(reminderHistoryQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted overdue reminders input to pagination defaults', () => {
    expect(overdueOrdersForRemindersQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
      minDaysOverdue: 1,
      matchTemplateDays: false,
      excludeAlreadyReminded: true,
    });
  });

  it('does not fail at the root for statement history filters', () => {
    const result = statementHistoryQuerySchema.safeParse(undefined);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.length === 0)).toBe(false);
    }
  });

  it('defaults omitted statement list input to pagination defaults', () => {
    expect(statementListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
      onlySent: false,
    });
  });
});
