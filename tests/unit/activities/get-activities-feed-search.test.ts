/**
 * getActivitiesFeedSearch Unit Tests
 *
 * Verifies typed navigation helper for /activities route.
 * @see src/lib/activities/activity-navigation.ts
 */

import { describe, expect, it } from 'vitest';
import { getActivitiesFeedSearch } from '@/lib/activities/activity-navigation';

describe('getActivitiesFeedSearch', () => {
  it('returns { entityType: "customer" } when given "customer"', () => {
    expect(getActivitiesFeedSearch('customer')).toEqual({ entityType: 'customer' });
  });

  it('returns {} when given no argument', () => {
    expect(getActivitiesFeedSearch()).toEqual({});
  });

  it('returns entityType for other entity types', () => {
    expect(getActivitiesFeedSearch('opportunity')).toEqual({ entityType: 'opportunity' });
    expect(getActivitiesFeedSearch('order')).toEqual({ entityType: 'order' });
    expect(getActivitiesFeedSearch('project')).toEqual({ entityType: 'project' });
  });
});
