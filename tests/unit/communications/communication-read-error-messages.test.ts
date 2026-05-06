import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  COMMUNICATION_READ_MESSAGES,
  formatCommunicationReadError,
} from '@/lib/communications/read-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('communication read error messages', () => {
  it('uses normalized read-query copy and rejects raw error messages', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'postgres database timeout',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: COMMUNICATION_READ_MESSAGES.preferences,
      }
    );

    expect(formatCommunicationReadError(normalized, 'Fallback copy')).toBe(
      COMMUNICATION_READ_MESSAGES.preferences
    );
    expect(formatCommunicationReadError(new Error('postgres database timeout'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });

  it('keeps preference read states behind communications-owned copy', () => {
    const preferences = read(
      'src/components/domain/communications/communication-preferences.tsx'
    );
    const formatter = read('src/lib/communications/read-error-messages.ts');

    expect(preferences).toContain('formatCommunicationReadError(');
    expect(preferences).toContain('COMMUNICATION_READ_MESSAGES.preferences');
    expect(preferences).toContain('COMMUNICATION_READ_MESSAGES.preferenceHistory');
    expect(preferences).not.toContain('<span>{error.message}</span>');
    expect(formatter).toContain('isReadQueryError(error)');
  });
});
