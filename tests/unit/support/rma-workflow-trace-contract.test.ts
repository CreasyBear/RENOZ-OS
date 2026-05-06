import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('RMA workflow trace contract', () => {
  it('keeps RMA create, update, and process permissions explicit', () => {
    const server = read('src/server/functions/orders/rma.ts');
    const createTrace = read('docs/code-traces/14-rma-create.md');
    const processTrace = read('docs/code-traces/15-rma-process-resolution.md');
    const updateTrace = read('docs/code-traces/18-rma-field-update.md');

    expect(server).toContain('withAuth({ permission: PERMISSIONS.support.create })');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.support.update })');

    expect(createTrace).toContain('PERMISSIONS.support.create');
    expect(processTrace).toContain('PERMISSIONS.support.update');
    expect(updateTrace).toContain('PERMISSIONS.support.update');

    expect(createTrace).not.toContain('withAuth() **only**');
    expect(processTrace).not.toContain('withAuth() **without** explicit permission');
    expect(updateTrace).not.toContain('withAuth()` **without** `PERMISSIONS`');
  });

  it('keeps processRma documented as remedy execution, not metadata-only closeout', () => {
    const server = read('src/server/functions/orders/rma.ts');
    const remedyExecution = read('src/server/functions/orders/_shared/rma-remedy-execution.ts');
    const processTrace = read('docs/code-traces/15-rma-process-resolution.md');

    expect(server).toContain('const execution = await executeRmaRemedy({');
    expect(remedyExecution).toContain("if (input.resolution === 'refund')");
    expect(remedyExecution).toContain("if (input.resolution === 'credit')");
    expect(remedyExecution).toContain("if (input.resolution === 'replacement')");

    expect(processTrace).toContain('executeRmaRemedy');
    expect(processTrace).toContain('refund payment');
    expect(processTrace).toContain('credit note');
    expect(processTrace).toContain('replacement order');
    expect(processTrace).not.toContain('metadata-only');
    expect(processTrace).not.toContain('no automatic refund transaction');
  });

  it('keeps RMA refund remedies on the financial ledger safety contract', () => {
    const remedyExecution = read('src/server/functions/orders/_shared/rma-remedy-execution.ts');
    const refundSource = remedyExecution.slice(
      remedyExecution.indexOf('async function createRefundArtifact')
    );
    const insertIndex = refundSource.indexOf('.insert(orderPayments)');
    const guardIndex = refundSource.indexOf("throw new ValidationError('Refund could not be recorded.')");
    const projectionIndex = refundSource.indexOf('await updateOrderPaymentStatus');

    expect(refundSource).toContain('requirePermission(ctx, PERMISSIONS.financial.update)');
    expect(refundSource).toContain(".for('update')");
    expect(insertIndex).toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeGreaterThan(insertIndex);
    expect(projectionIndex).toBeGreaterThan(guardIndex);
  });

  it('keeps updateRma documented as a permissioned non-workflow patch', () => {
    const schema = read('src/lib/schemas/support/rma.ts');
    const updateTrace = read('docs/code-traces/18-rma-field-update.md');

    expect(schema).toContain('rmaWorkflowOwnedUpdateFieldValues');
    expect(schema).not.toContain('inspectionNotes: rmaInspectionNotesSchema.nullable().optional()');
    expect(schema).not.toContain('resolution: rmaResolutionSchema.nullable().optional()');
    expect(schema).not.toContain('resolutionDetails: rmaResolutionDetailsSchema.nullable().optional()');

    expect(updateTrace).toContain('PERMISSIONS.support.update');
    expect(updateTrace).toContain('Workflow-owned fields rejected');
  });
});
