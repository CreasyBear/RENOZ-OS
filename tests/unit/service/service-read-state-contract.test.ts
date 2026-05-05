import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('service read state contract', () => {
  it('keeps service read fallback copy centralized and out of raw error messages', () => {
    const hook = read('src/hooks/service/use-service-systems.ts');
    const formatter = read('src/lib/service/read-error-messages.ts');
    const containers = [
      read('src/components/domain/service/containers/service-systems-list-container.tsx'),
      read('src/components/domain/service/containers/service-system-detail-container.tsx'),
      read('src/components/domain/service/containers/service-linkage-reviews-list-container.tsx'),
      read('src/components/domain/service/containers/service-linkage-review-detail-container.tsx'),
    ];

    expect(formatter).toContain('formatServiceReadError');
    expect(formatter).toContain('SERVICE_READ_MESSAGES');
    expect(hook).toContain("import { SERVICE_READ_MESSAGES } from '@/lib/service/read-error-messages'");
    expect(hook).toContain('fallbackMessage: SERVICE_READ_MESSAGES.systemsList');
    expect(hook).toContain('fallbackMessage: SERVICE_READ_MESSAGES.systemDetail');
    expect(hook).toContain('notFoundMessage: SERVICE_READ_MESSAGES.systemNotFound');
    expect(hook).toContain('fallbackMessage: SERVICE_READ_MESSAGES.linkageReviewsList');
    expect(hook).toContain('fallbackMessage: SERVICE_READ_MESSAGES.linkageReviewDetail');
    expect(hook).toContain('notFoundMessage: SERVICE_READ_MESSAGES.linkageReviewNotFound');

    for (const source of containers) {
      expect(source).toContain('formatServiceReadError');
      expect(source).toContain('SERVICE_READ_MESSAGES');
      expect(source).not.toContain('error instanceof Error ? error.message');
      expect(source).not.toContain('Unknown system error');
      expect(source).not.toContain('Unknown review error');
      expect(source).not.toContain("title=\"Failed to load service");
    }
  });
});
