import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getGenericIssueStatusUpdateBlocker } from '@/lib/support/issue-status-transitions';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('generic issue status transition contract', () => {
  it('blocks generic escalation so escalation history is captured', () => {
    expect(
      getGenericIssueStatusUpdateBlocker({
        existingStatus: 'open',
        nextStatus: 'escalated',
      })
    ).toMatchObject({
      message: expect.stringContaining('Escalate issues through the escalation workflow'),
    });
  });

  it('blocks generic status changes away from escalated state', () => {
    expect(
      getGenericIssueStatusUpdateBlocker({
        existingStatus: 'escalated',
        nextStatus: 'in_progress',
      })
    ).toMatchObject({
      message: expect.stringContaining('De-escalate this issue before changing status'),
    });
  });

  it('allows non-escalation generic status transitions', () => {
    expect(
      getGenericIssueStatusUpdateBlocker({
        existingStatus: 'open',
        nextStatus: 'in_progress',
      })
    ).toBeNull();
    expect(
      getGenericIssueStatusUpdateBlocker({
        existingStatus: 'escalated',
        nextStatus: 'escalated',
      })
    ).toBeNull();
    expect(
      getGenericIssueStatusUpdateBlocker({
        existingStatus: 'open',
      })
    ).toBeNull();
  });

  it('wires server and board callers to the escalation workflow boundary', () => {
    const server = read('src/server/functions/support/issues.ts');
    const board = read('src/routes/_authenticated/support/issues-board.tsx');

    expect(server).toContain('getGenericIssueStatusUpdateBlocker');
    expect(server).toContain("createSerializedMutationError(statusUpdateBlocker.message, 'transition_blocked')");

    expect(board).toContain("event.toStatus === 'escalated'");
    expect(board).toContain("search: { escalate: 'true' }");
    expect(board).toContain("event.fromStatus === 'escalated'");
  });
});
