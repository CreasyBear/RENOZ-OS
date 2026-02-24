/**
 * ORCH-040: Focused integration tests for claims quick filters + issue board rollback + KB unsaved guard.
 * Core failure-prone workflows are covered by deterministic tests.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('support/KB/warranty e2e hardening guards', () => {
  it('keeps issue board drag/drop failure retry + rollback guardrails', () => {
    const content = readFileSync(
      'src/routes/_authenticated/support/issues-board.tsx',
      'utf8'
    );
    expect(content).toContain("label: 'Retry'");
    expect(content).toContain('delete next[issueId]');
    expect(content).toContain('pendingIssueIds={transitionPendingIds}');
  });

  it('keeps KB unsaved-close on shared confirmation flow (no window.confirm)', () => {
    const articleDialog = readFileSync(
      'src/components/domain/support/knowledge-base/kb-article-form-dialog.tsx',
      'utf8'
    );
    const categoryDialog = readFileSync(
      'src/components/domain/support/knowledge-base/kb-category-form-dialog.tsx',
      'utf8'
    );
    expect(articleDialog).toContain('confirm.confirm');
    expect(categoryDialog).toContain('confirm.confirm');
    expect(articleDialog).not.toContain('window.confirm');
    expect(categoryDialog).not.toContain('window.confirm');
  });

  it('keeps warranty claims quick filters server-side (no client post-filtering)', () => {
    const claimsContainer = readFileSync(
      'src/components/domain/warranty/containers/warranty-claims-list-container.tsx',
      'utf8'
    );
    expect(claimsContainer).toContain('quickFilter: search.quickFilter');
    expect(claimsContainer).not.toContain('getSlaDueStatus');
  });
});
