import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  ACTIVITY_READ_MESSAGES,
  formatActivityReadError,
} from '@/lib/activities/read-error-messages';

describe('activity read error messages', () => {
  it('uses normalized read-query copy and rejects raw activity errors', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 503, code: 'INTERNAL_ERROR', message: 'activity table timeout' },
      {
        contractType: 'always-shaped',
        fallbackMessage: ACTIVITY_READ_MESSAGES.feed,
      }
    );

    expect(formatActivityReadError(normalized, 'Fallback copy')).toBe(
      ACTIVITY_READ_MESSAGES.feed
    );
    expect(formatActivityReadError(new Error('activity table timeout'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });

  it('keeps activity history copy centralized for timeline reads', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 500, code: 'INTERNAL_ERROR', message: 'audit timeline failed' },
      {
        contractType: 'always-shaped',
        fallbackMessage: ACTIVITY_READ_MESSAGES.history,
      }
    );

    expect(formatActivityReadError(normalized, 'Fallback copy')).toBe(
      ACTIVITY_READ_MESSAGES.history
    );
    expect(formatActivityReadError(new Error('audit timeline failed'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });
});
