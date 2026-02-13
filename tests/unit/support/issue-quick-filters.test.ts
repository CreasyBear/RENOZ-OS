/**
 * Issue Quick Filters Unit Tests
 *
 * Tests for URL sync helpers:
 * - quickFilterFromSearch derives filter from search params
 * - quickFilterToSearch maps filter to search params
 *
 * @see src/components/domain/support/issues/issue-quick-filters.tsx
 */

import { describe, it, expect } from 'vitest';
import {
  quickFilterFromSearch,
  quickFilterToSearch,
  getFilterDescription,
} from '@/components/domain/support/issues/issue-quick-filters';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('quickFilterFromSearch', () => {
  it('returns quickFilter when present', () => {
    expect(quickFilterFromSearch({ quickFilter: 'escalated' }, USER_ID)).toBe('escalated');
    expect(quickFilterFromSearch({ quickFilter: 'overdue_sla' })).toBe('overdue_sla');
  });

  it('returns overdue_sla when slaStatus is breached', () => {
    expect(quickFilterFromSearch({ slaStatus: 'breached' }, USER_ID)).toBe('overdue_sla');
  });

  it('returns escalated when escalated is true', () => {
    expect(quickFilterFromSearch({ escalated: true }, USER_ID)).toBe('escalated');
  });

  it('returns my_issues when assignedToUserId matches current user', () => {
    expect(quickFilterFromSearch({ assignedToUserId: USER_ID }, USER_ID)).toBe('my_issues');
  });

  it('returns all when assignedToUserId does not match current user', () => {
    expect(quickFilterFromSearch({ assignedToUserId: 'other-user-id' }, USER_ID)).toBe('all');
  });

  it('returns all when no params match', () => {
    expect(quickFilterFromSearch({}, USER_ID)).toBe('all');
    expect(quickFilterFromSearch({ slaStatus: 'at_risk' }, USER_ID)).toBe('all');
  });

  it('quickFilter takes precedence over other params', () => {
    expect(
      quickFilterFromSearch({ quickFilter: 'high_priority', slaStatus: 'breached' }, USER_ID)
    ).toBe('high_priority');
  });
});

describe('quickFilterToSearch', () => {
  it('maps overdue_sla to slaStatus breached', () => {
    expect(quickFilterToSearch('overdue_sla', USER_ID)).toMatchObject({
      quickFilter: 'overdue_sla',
      slaStatus: 'breached',
    });
  });

  it('maps escalated to escalated true', () => {
    expect(quickFilterToSearch('escalated', USER_ID)).toMatchObject({
      quickFilter: 'escalated',
      escalated: true,
    });
  });

  it('maps my_issues to assignedToUserId when user provided', () => {
    expect(quickFilterToSearch('my_issues', USER_ID)).toMatchObject({
      quickFilter: 'my_issues',
      assignedToUserId: USER_ID,
    });
  });

  it('maps my_issues to all when no user', () => {
    expect(quickFilterToSearch('my_issues')).toMatchObject({ quickFilter: 'all' });
  });

  it('maps unassigned, sla_at_risk, high_priority, recent to quickFilter only', () => {
    expect(quickFilterToSearch('unassigned', USER_ID).quickFilter).toBe('unassigned');
    expect(quickFilterToSearch('sla_at_risk', USER_ID).quickFilter).toBe('sla_at_risk');
    expect(quickFilterToSearch('high_priority', USER_ID).quickFilter).toBe('high_priority');
    expect(quickFilterToSearch('recent', USER_ID).quickFilter).toBe('recent');
  });

  it('maps all to cleared params', () => {
    const result = quickFilterToSearch('all', USER_ID);
    expect(result.quickFilter).toBeUndefined();
    expect(result.slaStatus).toBeUndefined();
    expect(result.escalated).toBeUndefined();
    expect(result.assignedToUserId).toBeUndefined();
  });
});

describe('getFilterDescription', () => {
  it('returns description for known filter', () => {
    expect(getFilterDescription('overdue_sla')).toBe('SLA breached');
    expect(getFilterDescription('escalated')).toBe('Escalated issues');
    expect(getFilterDescription('all')).toBe('Show all issues');
  });
});
