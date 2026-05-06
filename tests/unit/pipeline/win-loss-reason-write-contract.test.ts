import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe('pipeline win/loss reason write contract', () => {
  it('keeps settings writes on returned-row evidence and tenant-scoped usage checks', () => {
    const source = read('src/server/functions/pipeline/win-loss-reasons.ts');
    const hook = read('src/hooks/settings/use-win-loss-reasons.ts');
    const manager = read('src/components/domain/settings/win-loss-reasons-manager.tsx');

    const createBody = sliceBetween(
      source,
      'export const createWinLossReason = createServerFn',
      'export const updateWinLossReason = createServerFn'
    );
    const updateBody = sliceBetween(
      source,
      'export const updateWinLossReason = createServerFn',
      'export const deleteWinLossReason = createServerFn'
    );
    const deleteBody = sliceBetween(
      source,
      'export const deleteWinLossReason = createServerFn',
      'export const winLossAnalysisQuerySchema = normalizeObjectInput'
    );

    expect(source).toContain("import { NotFoundError, ConflictError, ServerError }");
    expect(createBody).toContain('const [createdReason] = await db');
    expect(createBody).toContain("'PIPELINE_WIN_LOSS_REASON_CREATE_FAILED'");
    expect(createBody).toContain('return { reason: createdReason };');
    expect(createBody).not.toContain('return { reason: result[0] };');

    expect(updateBody).toContain('const [updatedReason] = await db');
    expect(updateBody).toContain('eq(winLossReasons.version, existing[0].version)');
    expect(updateBody).toContain('return { reason: updatedReason };');
    expect(updateBody).not.toContain('return { reason: result[0] };');

    expect(deleteBody).toContain('eq(opportunities.winLossReasonId, id)');
    expect(deleteBody).toContain('eq(opportunities.organizationId, ctx.organizationId)');
    expect(deleteBody).toContain('isNull(opportunities.deletedAt)');
    expect(deleteBody).toContain('const [deactivatedReason] = await tx');
    expect(deleteBody).toContain('const [deletedReason] = await tx');
    expect(deleteBody).toContain('.returning({ id: winLossReasons.id })');
    expect(deleteBody).not.toContain('.where(eq(opportunities.winLossReasonId, id))');

    expect(hook).toContain('queryKeys.settings.winLossReasons()');
    expect(manager).toContain('toastSuccess("Reason updated successfully")');
    expect(manager).toContain('toastSuccess("Reason created successfully")');
    expect(manager).toContain('result.deactivated');
  });
});
