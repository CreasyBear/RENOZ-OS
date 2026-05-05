import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('CSAT feedback link contract', () => {
  it('formats generation failures and preserves generated links when copy fails', () => {
    const displayCard = read('src/components/domain/support/csat/csat-display-card.tsx');

    expect(displayCard).not.toContain("import { toast } from 'sonner'");
    expect(displayCard).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(displayCard).toContain("import { formatSupportMutationError } from '@/hooks/support'");
    expect(displayCard).toContain('function formatCsatLinkError');
    expect(displayCard).toContain('CSAT_LINK_ERROR_MESSAGES');
    expect(displayCard).toContain("setGeneratedFeedbackUrl(result.feedbackUrl)");
    expect(displayCard).toContain('await copyFeedbackLink(result.feedbackUrl)');
    expect(displayCard).toContain(
      "toast.error(formatCsatLinkError(err, 'Failed to generate feedback link'))"
    );
    expect(displayCard).toContain(
      "toast.error('Feedback link is ready, but clipboard access was blocked. Copy it manually.')"
    );
    expect(displayCard).toContain('value={generatedFeedbackUrl}');
    expect(displayCard).not.toContain(
      "err instanceof Error ? err.message : 'Failed to generate link'"
    );
  });
});
