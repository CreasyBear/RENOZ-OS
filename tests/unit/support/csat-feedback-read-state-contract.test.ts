import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('CSAT feedback read-state contract', () => {
  it('keeps issue-detail CSAT feedback hard and stale states operator-safe', () => {
    const displayCard = read('src/components/domain/support/csat/csat-display-card.tsx');
    const container = read('src/components/domain/support/issues/issue-detail-container.tsx');
    const view = read('src/components/domain/support/issues/issue-detail-view.tsx');
    const hook = read('src/hooks/support/use-csat.ts');
    const queryKeys = read('src/lib/query-keys.ts');
    const readErrorMessages = read('src/lib/support/read-error-messages.ts');

    expect(displayCard).toContain('formatSupportReadError');
    expect(displayCard).toContain('Unable to load customer feedback');
    expect(displayCard).toContain(
      'Issue feedback is temporarily unavailable. Please refresh and try again.'
    );
    expect(displayCard).toContain('feedbackRefreshWarning');
    expect(displayCard).toContain(
      'Showing the most recent customer feedback while refresh is unavailable.'
    );
    expect(displayCard).toContain('Customer feedback refresh unavailable');
    expect(displayCard).toContain('onClick={onRefresh}');
    expect(displayCard).not.toContain('error.message');

    expect(container).toContain('useIssueFeedback');
    expect(container).toContain('csatFeedbackError instanceof Error ? csatFeedbackError : null');
    expect(view).toContain("import { CsatDisplayCard } from '@/components/domain/support/csat'");
    expect(view).toContain('<CsatDisplayCard');
    expect(view).toContain('feedback={csatFeedback ?? null}');
    expect(view).toContain('error={csatFeedbackError}');
    expect(hook).toContain('useIssueFeedback');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'nullable-by-design'");
    expect(hook).toContain('Issue feedback is temporarily unavailable. Please refresh and try again.');
    expect(queryKeys).toContain('csatDetail');
    expect(readErrorMessages).toContain('formatSupportReadError');
  });
});
