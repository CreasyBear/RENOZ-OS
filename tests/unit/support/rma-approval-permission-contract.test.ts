import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function serverFunctionBody(source: string, name: string): string {
  const start = source.indexOf(`export const ${name}`);
  expect(start, `${name} should exist`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf('\n// ============================================================================', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

describe('RMA approval permission contract', () => {
  it('keeps single and bulk approval on the same support update permission', () => {
    const server = read('src/server/functions/orders/rma.ts');

    expect(serverFunctionBody(server, 'approveRma')).toContain(
      'withAuth({ permission: PERMISSIONS.support.update })'
    );
    expect(serverFunctionBody(server, 'bulkApproveRma')).toContain(
      'withAuth({ permission: PERMISSIONS.support.update })'
    );
    expect(serverFunctionBody(server, 'bulkApproveRma')).not.toContain('const ctx = await withAuth();');
  });

  it('keeps the approval trace aligned with permission and cache contracts', () => {
    const trace = read('docs/code-traces/21-rma-approval-workflow.md');
    const readme = read('docs/code-traces/README.md');

    expect(trace).toContain('PERMISSIONS.support.update');
    expect(trace).toContain('approveRmaSchema');
    expect(trace).toContain('bulkApproveRmaSchema');
    expect(trace).toContain('queryKeys.support.rmasList()');
    expect(trace).toContain('queryKeys.support.rmaDetails()');
    expect(readme).toContain('21-rma-approval-workflow.md');
  });
});
