import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function exists(path: string): boolean {
  return existsSync(join(root, path));
}

describe('realtime export contract', () => {
  it('exports only org-scoped broadcast realtime hooks', () => {
    const index = read('src/hooks/realtime/index.ts');
    const broadcastHook = read('src/hooks/realtime/use-realtime.ts');

    expect(index).toContain("from './use-realtime'");
    expect(index).toContain("from './use-orders-realtime'");
    expect(index).toContain("from './use-pipeline-realtime'");
    expect(index).toContain("from './use-inventory-realtime'");
    expect(broadcastHook).toContain("channel: string");
    expect(broadcastHook).toContain("queryKeys: QueryKey[]");

    expect(index).not.toContain('useRealtimeOrders');
    expect(index).not.toContain('useRealtimePipeline');
    expect(index).not.toContain('useRealtimeSubscription');
    expect(index).not.toContain('./use-realtime-orders');
    expect(index).not.toContain('./use-realtime-pipeline');
    expect(index).not.toContain('./use-realtime-subscription');
    expect(broadcastHook).not.toContain('postgres_changes hook is still available');

    expect(exists('src/hooks/realtime/use-realtime-orders.ts')).toBe(false);
    expect(exists('src/hooks/realtime/use-realtime-pipeline.ts')).toBe(false);
    expect(exists('src/hooks/realtime/use-realtime-subscription.ts')).toBe(false);
  });
});
