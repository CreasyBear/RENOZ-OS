import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('issue escalation current-state contract', () => {
  it('uses issue status, not historical escalation timestamp, for current queues', () => {
    const issuesServer = read('src/server/functions/support/issues.ts');
    const supportMetrics = read('src/server/functions/support/support-metrics.ts');

    expect(issuesServer).not.toContain('conditions.push(isNotNull(issues.escalatedAt))');
    expect(supportMetrics).not.toContain('isNotNull(issues.escalatedAt)');

    expect(issuesServer).toContain("conditions.push(eq(issues.status, 'escalated'))");
    expect(supportMetrics).toContain("eq(issues.status, 'escalated')");
  });

  it('routes issue detail de-escalation through the dedicated workflow', () => {
    const detailHook = read('src/hooks/support/use-issue-detail.ts');
    const detailView = read('src/components/domain/support/issues/issue-detail-view.tsx');

    expect(detailHook).toContain('useDeEscalateIssue');
    expect(detailHook).toContain("issue?.status === 'escalated' && newStatus === 'in_progress'");
    expect(detailHook).toContain('deEscalateMutation.mutateAsync');
    expect(detailHook).toContain("action: 'de_escalate'");

    expect(detailView).toContain("isEscalated={escalationDialogMode === 'de_escalate'}");
    expect(detailView).toContain('De-escalate');
  });
});
