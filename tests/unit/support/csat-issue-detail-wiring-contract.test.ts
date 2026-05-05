import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('CSAT issue detail wiring contract', () => {
  it('wires CSAT feedback through the issue detail container and sidebar', () => {
    const container = read('src/components/domain/support/issues/issue-detail-container.tsx');
    const view = read('src/components/domain/support/issues/issue-detail-view.tsx');
    const displayCard = read('src/components/domain/support/csat/csat-display-card.tsx');

    expect(container).toContain('useIssueFeedback');
    expect(container).toContain('useGenerateFeedbackToken');
    expect(container).toContain('useSubmitInternalFeedback');
    expect(container).toContain('csatFeedback={csatFeedback ?? null}');
    expect(container).toContain('csatFeedbackError={csatFeedbackError instanceof Error ? csatFeedbackError : null}');
    expect(container).toContain('expiresInDays: 7');
    expect(container).toContain('onGenerateFeedbackLink={handleGenerateFeedbackLink}');
    expect(container).toContain('onSubmitCsatFeedback={handleSubmitCsatFeedback}');

    expect(view).toContain("import { CsatDisplayCard } from '@/components/domain/support/csat'");
    expect(view).toContain('<CsatDisplayCard');
    expect(view).toContain('feedback={csatFeedback ?? null}');
    expect(view).toContain('error={csatFeedbackError}');
    expect(view).toContain('onGenerateFeedbackLink={onGenerateFeedbackLink}');
    expect(view).toContain('onSubmitFeedback={onSubmitCsatFeedback}');

    expect(displayCard).toContain('error?: Error | null');
    expect(displayCard).toContain('Unable to load customer feedback');
    expect(displayCard).toContain('<Button type="button" variant="outline" size="sm" onClick={onRefresh}>');
  });
});
