/**
 * Issues Filter URL Transform Unit Tests
 *
 * Verifies fromUrlParams and toUrlParams round-trip correctly for preset filters.
 * Ensures multi-value status/priority and assignedTo (me/unassigned) persist to URL.
 *
 * @see src/lib/utils/issues-filter-url.ts
 */

import { describe, it, expect } from 'vitest';
import { fromUrlParams, toUrlParams } from '@/lib/utils/issues-filter-url';

describe('issues-filter-url', () => {
  describe('fromUrlParams', () => {
    it('parses empty search to defaults', () => {
      const result = fromUrlParams({});
      expect(result.search).toBe('');
      expect(result.status).toEqual([]);
      expect(result.priority).toEqual([]);
      expect(result.assignedTo).toBeNull();
    });

    it('parses comma-separated status (Open preset)', () => {
      const result = fromUrlParams({ status: 'open,in_progress' });
      expect(result.status).toEqual(['open', 'in_progress']);
    });

    it('parses comma-separated priority (Critical preset)', () => {
      const result = fromUrlParams({ priority: 'critical,high' });
      expect(result.priority).toEqual(['critical', 'high']);
    });

    it('filters invalid status values', () => {
      const result = fromUrlParams({ status: 'open,invalid,in_progress' });
      expect(result.status).toEqual(['open', 'in_progress']);
    });

    it('parses assignedToFilter me', () => {
      const result = fromUrlParams({ assignedToFilter: 'me' });
      expect(result.assignedTo).toBe('me');
    });

    it('parses assignedToFilter unassigned', () => {
      const result = fromUrlParams({ assignedToFilter: 'unassigned' });
      expect(result.assignedTo).toBe('unassigned');
    });

    it('parses assignedToUserId for specific user', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const result = fromUrlParams({ assignedToUserId: userId });
      expect(result.assignedTo).toBe(userId);
    });
  });

  describe('toUrlParams', () => {
    it('outputs comma-separated status for multi-value', () => {
      const result = toUrlParams({
        search: '',
        status: ['open', 'in_progress'],
        priority: [],
        assignedTo: null,
        customerId: null,
      });
      expect(result.status).toBe('open,in_progress');
    });

    it('outputs comma-separated priority for multi-value', () => {
      const result = toUrlParams({
        search: '',
        status: [],
        priority: ['critical', 'high'],
        assignedTo: null,
        customerId: null,
      });
      expect(result.priority).toBe('critical,high');
    });

    it('outputs assignedToFilter me when assignedTo is me', () => {
      const result = toUrlParams({
        search: '',
        status: [],
        priority: [],
        assignedTo: 'me',
        customerId: null,
      });
      expect(result.assignedToFilter).toBe('me');
      expect(result.assignedToUserId).toBeUndefined();
    });

    it('outputs assignedToFilter unassigned when assignedTo is unassigned', () => {
      const result = toUrlParams({
        search: '',
        status: [],
        priority: [],
        assignedTo: 'unassigned',
        customerId: null,
      });
      expect(result.assignedToFilter).toBe('unassigned');
      expect(result.assignedToUserId).toBeUndefined();
    });

    it('outputs assignedToUserId when assignedTo is user UUID', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const result = toUrlParams({
        search: '',
        status: [],
        priority: [],
        assignedTo: userId,
        customerId: null,
      });
      expect(result.assignedToUserId).toBe(userId);
      expect(result.assignedToFilter).toBeUndefined();
    });
  });

  describe('round-trip', () => {
    it('preserves Open preset (status=open,in_progress)', () => {
      const filters = {
        search: '',
        status: ['open', 'in_progress'] as ['open', 'in_progress'],
        priority: [],
        assignedTo: null,
        customerId: null,
      };
      const url = toUrlParams(filters);
      const back = fromUrlParams(url as Parameters<typeof fromUrlParams>[0]);
      expect(back.status).toEqual(['open', 'in_progress']);
    });

    it('preserves Critical preset (priority=critical,high)', () => {
      const filters = {
        search: '',
        status: [],
        priority: ['critical', 'high'] as ['critical', 'high'],
        assignedTo: null,
        customerId: null,
      };
      const url = toUrlParams(filters);
      const back = fromUrlParams(url as Parameters<typeof fromUrlParams>[0]);
      expect(back.priority).toEqual(['critical', 'high']);
    });

    it('preserves My Issues preset (assignedToFilter=me)', () => {
      const filters = {
        search: '',
        status: [],
        priority: [],
        assignedTo: 'me' as const,
        customerId: null,
      };
      const url = toUrlParams(filters);
      const back = fromUrlParams(url as Parameters<typeof fromUrlParams>[0]);
      expect(back.assignedTo).toBe('me');
    });

    it('preserves Unassigned preset (assignedToFilter=unassigned)', () => {
      const filters = {
        search: '',
        status: [],
        priority: [],
        assignedTo: 'unassigned' as const,
        customerId: null,
      };
      const url = toUrlParams(filters);
      const back = fromUrlParams(url as Parameters<typeof fromUrlParams>[0]);
      expect(back.assignedTo).toBe('unassigned');
    });
  });
});
