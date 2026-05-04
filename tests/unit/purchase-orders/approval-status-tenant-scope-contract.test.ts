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

describe('purchase order approval status tenant-scope contract', () => {
  it('keeps final approval status checks and updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/approvals.ts'));

    expect(source).toContain(
      'asyncfunctioncheckAndUpdateFinalApprovalStatus(purchaseOrderId:string,organizationId:string,currentLevel:number,userId:string)'
    );
    expect(source).toContain(
      'eq(purchaseOrderApprovals.purchaseOrderId,purchaseOrderId),eq(purchaseOrderApprovals.organizationId,organizationId),inArray(purchaseOrderApprovals.status,[...ACTIONABLE_APPROVAL_STATUSES])'
    );
    expect(source).toContain(
      'update(purchaseOrders).set({status:APPROVAL_STATUS.APPROVED,updatedBy:userId}).where(and(eq(purchaseOrders.id,purchaseOrderId),eq(purchaseOrders.organizationId,organizationId)))'
    );
    expect(source).toContain(
      'awaitcheckAndUpdateFinalApprovalStatus(approval.purchaseOrderId,params.organizationId,approval.level,params.userId)'
    );
  });

  it('keeps approval-driven purchase order status writes organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/approvals.ts'));

    expect(source).toContain(
      'update(purchaseOrders).set({status:\'draft\',updatedBy:ctx.user.id,}).where(and(eq(purchaseOrders.id,approval.purchaseOrderId),eq(purchaseOrders.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'update(purchaseOrders).set({status:APPROVAL_STATUS.APPROVED,updatedBy:ctx.user.id}).where(and(eq(purchaseOrders.id,data.purchaseOrderId),eq(purchaseOrders.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'update(purchaseOrders).set({status:\'pending_approval\',updatedBy:ctx.user.id}).where(and(eq(purchaseOrders.id,data.purchaseOrderId),eq(purchaseOrders.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(purchaseOrders.id,purchaseOrderId))');
    expect(source).not.toContain('.where(eq(purchaseOrders.id,approval.purchaseOrderId))');
    expect(source).not.toContain('.where(eq(purchaseOrders.id,data.purchaseOrderId))');
  });
});
