/**
 * useCreateQuickLog Invalidation Contract Tests
 *
 * Verifies the query key structure for entityAuditWithRelated invalidation
 * when logging for opportunity (Phase 2 fix). The key must match what
 * useCreateQuickLog invalidates in its onSuccess.
 *
 * @see src/hooks/communications/use-quick-log.ts
 */

import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('useCreateQuickLog invalidation contract', () => {
  it('entityAuditWithRelated key for opportunity matches invalidation contract', () => {
    const oppId = '11111111-1111-1111-1111-111111111111';
    const key = queryKeys.unifiedActivities.entityAuditWithRelated(
      'opportunity',
      oppId,
      null
    );
    // Key structure: unifiedActivities entity audit with null relatedCustomerId
    expect(key).toContain('unifiedActivities');
    expect(key).toContain('opportunity');
    expect(key).toContain(oppId);
    expect(key).toContain('audit');
    expect(key[key.length - 1]).toBe(null);
  });
});
