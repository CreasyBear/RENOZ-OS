import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('persisted state logging contract', () => {
  it('uses bounded structured logging for offline queue sync failures', () => {
    const source = read('src/hooks/_shared/use-persisted-state.ts');

    expect(source).toContain("logger.warn('Failed to sync persisted queue item'");
    expect(source).toContain('queueKey: key');
    expect(source).toContain('itemId: item.id');
    expect(source).toContain('error: String(error)');
    expect(source).not.toContain('console.error');
    expect(source).not.toContain('Failed to sync item:');
  });
});
