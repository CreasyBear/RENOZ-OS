import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('public CSAT feedback error contract', () => {
  it('formats token validation and submission failures before display', () => {
    const route = read('src/routes/feedback.$token.tsx');

    expect(route).toContain('formatSupportMutationError');
    expect(route).toContain('formatPublicFeedbackError');
    expect(route).toContain('PUBLIC_FEEDBACK_ERROR_MESSAGES');
    expect(route).toContain("CONFLICT: 'Feedback has already been submitted for this support case.'");
    expect(route).toContain(
      "RATE_LIMIT: 'Too many feedback attempts were made. Wait a moment and try again.'"
    );
    expect(route).toContain("formatPublicFeedbackError(validationError, 'Invalid feedback link')");
    expect(route).toContain(
      "formatPublicFeedbackError(\n                  submitMutation.error,\n                  'Failed to submit feedback. Please try again.'"
    );
    expect(route).not.toContain(
      "validationError instanceof Error ? validationError.message : 'Invalid feedback link'"
    );
    expect(route).not.toContain('submitMutation.error instanceof Error');
    expect(route).not.toContain('submitMutation.error.message');
  });
});
