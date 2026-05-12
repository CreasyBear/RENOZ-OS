import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('orders realtime cache contract', () => {
  it('refreshes explicit order families without order root invalidation', () => {
    const hook = read('src/hooks/realtime/use-orders-realtime.ts');

    expect(hook).toContain('queryKeys.orders.lists()');
    expect(hook).toContain('queryKeys.orders.infiniteLists()');
    expect(hook).toContain('queryKeys.orders.details()');
    expect(hook).toContain('queryKeys.orders.recent');
    expect(hook).toContain('queryKeys.orders.fulfillmentRoot()');
    expect(hook).toContain('queryKeys.orders.stats()');
    expect(hook).toContain('queryKeys.dashboard.orders()');
    expect(hook).toContain('queryKeys.dashboard.stats()');

    expect(hook).not.toContain('queryKeys.orders.all');
    expect(hook).not.toContain('queryKeys.orders.list({})');
  });
});
