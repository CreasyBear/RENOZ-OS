import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { formatUserMutationError } from '@/hooks/users/user-mutation-error-messages';
import {
  formatUserReadError,
  USER_READ_MESSAGES,
} from '@/lib/users/read-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('preference settings feedback contract', () => {
  it('keeps preference read and save failures behind user-owned copy', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 503, code: 'INTERNAL_ERROR', message: 'database timeout' },
      {
        contractType: 'always-shaped',
        fallbackMessage: USER_READ_MESSAGES.preferences,
      }
    );

    expect(formatUserReadError(normalized, 'Fallback copy')).toBe(
      USER_READ_MESSAGES.preferences
    );
    expect(
      formatUserReadError(
        new Error('select user_preferences.value failed with provider stack'),
        USER_READ_MESSAGES.preferences
      )
    ).toBe(USER_READ_MESSAGES.preferences);
    expect(
      formatUserMutationError(
        new Error('duplicate key violates user_preferences_org_user_key_idx stack'),
        'updatePreference'
      )
    ).toBe('Preference update is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps the preferences route, hook, and server spine reviewable', () => {
    const route = read('src/routes/_authenticated/settings/preferences.tsx');
    const hook = read('src/hooks/users/use-preferences.ts');
    const server = read('src/server/functions/users/user-preferences.ts');
    const queryKeys = read('src/lib/query-keys.ts');
    const usersIndex = read('src/lib/users/index.ts');

    expect(route).toContain('formatUserReadError');
    expect(route).toContain('USER_READ_MESSAGES.preferences');
    expect(route).toContain('USER_READ_MESSAGES.preferencesCached');
    expect(route).toContain("formatUserMutationError(error, 'updatePreference')");
    expect(route).toContain('preferencesError && !preferences');
    expect(route).not.toContain("toast.error('Failed to save preference')");

    expect(hook).toContain('normalizeReadQueryError(error, {');
    expect(hook).toContain('USER_READ_MESSAGES.preferences');
    expect(hook).toContain('queryKeys.user.preferences(category)');
    expect(hook).toContain('data: category ? { category } : {}');

    expect(queryKeys).toContain('preferences: (category?: string)');
    expect(server).toContain('export const getPreferences');
    expect(server).toContain('export const setPreference');
    expect(server).toContain('eq(userPreferences.userId, ctx.user.id)');
    expect(server).toContain('eq(userPreferences.organizationId, ctx.organizationId)');
    expect(usersIndex).toContain('read-error-messages');
  });
});
