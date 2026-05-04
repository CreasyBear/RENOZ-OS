import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('purchase order approval record tenant-scope contract', () => {
  it('keeps approval action record updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/approvals.ts'));

    expect(source).toContain(
      'where(and(eq(purchaseOrderApprovals.id,params.approvalId),eq(purchaseOrderApprovals.organizationId,params.organizationId)))'
    );

    const approvalWriteBlocks = source
      .split('update(purchaseOrderApprovals)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('.returning()')));

    const ctxScopedApprovalUpdates = approvalWriteBlocks.filter((block) =>
      block.includes(
        'where(and(eq(purchaseOrderApprovals.id,data.approvalId),eq(purchaseOrderApprovals.organizationId,ctx.organizationId)))'
      )
    );

    expect(ctxScopedApprovalUpdates).toHaveLength(4);
    expect(approvalWriteBlocks).toHaveLength(5);
    expect(source).not.toContain('.where(eq(purchaseOrderApprovals.id,params.approvalId))');
    expect(source).not.toContain('.where(eq(purchaseOrderApprovals.id,data.approvalId))');
  });
});
