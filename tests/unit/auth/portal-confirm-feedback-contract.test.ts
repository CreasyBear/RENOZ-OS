import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('portal confirm feedback contract', () => {
  it('classifies provider errors without route-level raw message access', () => {
    const route = read('src/routes/portal/confirm.ts');

    expect(route).toContain('const code = toAuthErrorCode(error);');
    expect(route).not.toContain('toAuthErrorCode(error?.message)');
    expect(route).not.toContain('error?.message');
  });
});
