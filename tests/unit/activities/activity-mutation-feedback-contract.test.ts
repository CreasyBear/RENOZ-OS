import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('activity mutation feedback contract', () => {
  it('keeps entity activity logging feedback and cache invalidation on the safe contract', () => {
    const loggingHook = read('src/hooks/activities/use-entity-activity-logging.ts');
    const activityHooks = read('src/hooks/activities/use-activities.ts');
    const formatter = read('src/lib/activities/mutation-error-messages.ts');
    const barrel = read('src/lib/activities/index.ts');

    expect(formatter).toContain('formatActivityMutationError');
    expect(barrel).toContain('formatActivityMutationError');
    expect(loggingHook).toContain("toastError(formatActivityMutationError(error, 'logEntity'))");
    expect(loggingHook).not.toContain('error instanceof Error ? error.message');
    expect(loggingHook).not.toContain('Failed to log activity');

    expect(activityHooks).toContain('queryKeys.activities.entity(variables.entityType, variables.entityId)');
    expect(activityHooks).toContain('queryKeys.unifiedActivities.entity(variables.entityType, variables.entityId)');
    expect(activityHooks).toContain('queryKeys.unifiedActivities.entityAuditWithRelated(');
    expect(activityHooks).toContain('queryKeys.activities.feeds()');
  });
});
