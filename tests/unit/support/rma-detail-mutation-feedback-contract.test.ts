import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function section(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex, `Missing section start: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `Missing section end: ${end}`).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('RMA detail mutation feedback contract', () => {
  it('keeps RMA detail mutation failures formatted and propagated by the hook', () => {
    const hook = read('src/hooks/support/use-rma-detail.ts');

    expect(hook).not.toContain("import { toastSuccess, toastError } from '@/hooks'");
    expect(hook).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(hook).toContain("import { formatSupportMutationError } from './_mutation-errors'");
    expect(hook).toContain('const RMA_MUTATION_CODE_MESSAGES');
    expect(hook).toContain('function formatRmaMutationError');
    expect(hook).toContain('function formatRmaExecutionBlockedFeedback');

    const approve = section(hook, 'const handleApprove', 'const handleReject');
    const reject = section(hook, 'const handleReject', 'const handleReceive');
    const receive = section(hook, 'const handleReceive', 'const handleProcess');
    const process = section(hook, 'const handleProcess', 'const handleCancel');
    const cancel = section(hook, 'const handleCancel', 'const handleCancelClick');

    expect(approve).toContain("toast.error(formatRmaMutationError(err, 'Failed to approve RMA'))");
    expect(reject).toContain("toast.error(formatRmaMutationError(err, 'Failed to reject RMA'))");
    expect(receive).toContain(
      "toast.error(formatRmaMutationError(err, 'Failed to mark RMA as received'))"
    );
    expect(process).toContain(
      "toast.error(formatRmaMutationError(err, 'Failed to execute remedy'))"
    );
    expect(cancel).toContain("toast.error(formatRmaMutationError(err, 'Failed to cancel RMA'))");

    expect(approve).toContain('throw err;');
    expect(reject).toContain('throw err;');
    expect(receive).toContain('throw err;');
    expect(process).toContain('throw err;');
  });

  it('keeps RMA detail presenters from surfacing raw server mutation errors', () => {
    const workflowActions = read('src/components/domain/support/rma/rma-workflow-actions.tsx');
    const receiveDialog = read('src/components/domain/support/rma/rma-receive-dialog.tsx');
    const remedyDialog = read('src/components/domain/support/rma/rma-execute-remedy-dialog.tsx');

    for (const source of [workflowActions, receiveDialog, remedyDialog]) {
      expect(source).not.toContain('error instanceof Error ? error.message');
      expect(source).not.toContain('err instanceof Error ? err.message');
    }

    expect(workflowActions).not.toContain('Failed to approve RMA');
    expect(workflowActions).not.toContain('Failed to reject RMA');
    expect(receiveDialog).not.toContain('Failed to mark received');
    expect(remedyDialog).not.toContain('Failed to execute remedy');
    expect(receiveDialog).toContain(
      "toastError('Choose a receiving location before marking the RMA as received')"
    );
    expect(remedyDialog).toContain("toastError('Choose the source payment to refund.')");
  });
});
