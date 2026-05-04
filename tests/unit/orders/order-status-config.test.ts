import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatDueDateRelative,
  isOrderOverdue,
} from '@/components/domain/orders/order-status-config';

describe('order overdue lifecycle rules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks active unsettled overdue orders as overdue', () => {
    vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));

    expect(
      isOrderOverdue({
        dueDate: '2026-04-05T00:00:00.000Z',
        status: 'confirmed',
        paymentStatus: 'partial',
        balanceDue: 150,
      })
    ).toBe(true);
  });

  it('does not mark delivered orders as overdue', () => {
    vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));

    expect(
      isOrderOverdue({
        dueDate: '2026-04-05T00:00:00.000Z',
        status: 'delivered',
        paymentStatus: 'pending',
        balanceDue: 150,
      })
    ).toBe(false);
  });

  it('does not mark cancelled orders as overdue', () => {
    vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));

    expect(
      isOrderOverdue({
        dueDate: '2026-04-05T00:00:00.000Z',
        status: 'cancelled',
        paymentStatus: 'pending',
        balanceDue: 150,
      })
    ).toBe(false);
  });

  it('does not mark fully paid orders as overdue', () => {
    vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));

    expect(
      isOrderOverdue({
        dueDate: '2026-04-05T00:00:00.000Z',
        status: 'confirmed',
        paymentStatus: 'paid',
        balanceDue: 0,
      })
    ).toBe(false);
  });

  it('formats settled overdue dates without destructive styling', () => {
    vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));

    expect(
      formatDueDateRelative({
        dueDate: '2026-04-05T00:00:00.000Z',
        status: 'delivered',
        paymentStatus: 'paid',
        balanceDue: 0,
      })
    ).toEqual({
      text: '05/04/2026',
      isOverdue: false,
    });
  });
});
