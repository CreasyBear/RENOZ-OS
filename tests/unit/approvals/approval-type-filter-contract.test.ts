import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listPendingApprovalsCursorSchema,
  listPendingApprovalsSchema,
} from '@/lib/schemas/approvals';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('approval type filter contract', () => {
  it('keeps purchase-order approval filters supported end to end', () => {
    expect(listPendingApprovalsSchema.parse({ type: 'purchase_order' }).type).toBe(
      'purchase_order'
    );
    expect(listPendingApprovalsCursorSchema.parse({ type: 'purchase_order' }).type).toBe(
      'purchase_order'
    );

    const server = read('src/server/functions/suppliers/approvals.ts');
    const page = read('src/routes/_authenticated/approvals/approvals-page.tsx');

    expect(server).toContain("type === 'purchase_order'");
    expect(server.match(/assertSupportedApprovalTypeFilter\(type\);/g)).toHaveLength(2);
    expect(server).not.toContain('Type filtering not implemented');

    expect(page).toContain(
      "const supportedType = search.type === 'purchase_order' ? 'purchase_order' : 'all';"
    );
    expect(page).toContain("type: filters.type !== 'all' ? filters.type : undefined");
  });

  it('keeps unsupported amendment filters normalized by the route', () => {
    const server = read('src/server/functions/suppliers/approvals.ts');
    const page = read('src/routes/_authenticated/approvals/approvals-page.tsx');

    expect(server).toContain("'amendment' | undefined");
    expect(server).toContain('UNSUPPORTED_APPROVAL_TYPE_MESSAGE');
    expect(page).toContain("const hasUnsupportedType = search.type === 'amendment';");
    expect(page).toContain('Only purchase-order approvals are currently supported.');
  });
});
