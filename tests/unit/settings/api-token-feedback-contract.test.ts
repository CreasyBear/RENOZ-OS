import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  formatApiTokenMutationError,
  SETTINGS_MUTATION_MESSAGES,
} from '@/lib/settings/mutation-error-messages';
import {
  formatSettingsReadError,
  SETTINGS_READ_MESSAGES,
} from '@/lib/settings/read-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('API token settings feedback contract', () => {
  it('keeps API token read failures behind settings-owned copy', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 503, code: 'INTERNAL_ERROR', message: 'database timeout' },
      {
        contractType: 'always-shaped',
        fallbackMessage: SETTINGS_READ_MESSAGES.apiTokens,
      }
    );

    expect(formatSettingsReadError(normalized, 'Fallback copy')).toBe(
      SETTINGS_READ_MESSAGES.apiTokens
    );

    const unsafeMessage = formatSettingsReadError(
      new Error('select hashed_token from api_tokens failed with provider stack'),
      SETTINGS_READ_MESSAGES.apiTokens
    );

    expect(unsafeMessage).toBe(SETTINGS_READ_MESSAGES.apiTokens);
    expect(unsafeMessage).not.toContain('hashed_token');
    expect(unsafeMessage).not.toContain('provider stack');
  });

  it('keeps API token mutation failures behind safe operator copy', () => {
    expect(
      formatApiTokenMutationError(
        new Error('bcrypt hash database stack leaked token_prefix'),
        'create'
      )
    ).toBe(SETTINGS_MUTATION_MESSAGES.apiTokenCreate);

    expect(
      formatApiTokenMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw permission detail' },
        'revoke'
      )
    ).toBe('You do not have permission to manage API tokens.');
  });

  it('keeps the API token settings route, hook, and server spine reviewable', () => {
    const route = read('src/routes/_authenticated/settings/api-tokens.tsx');
    const hook = read('src/hooks/settings/use-api-tokens.ts');
    const server = read('src/server/functions/settings/api-tokens.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(route).toContain('formatSettingsReadError(');
    expect(route).toContain('SETTINGS_READ_MESSAGES.apiTokens');
    expect(route).toContain('SETTINGS_READ_MESSAGES.apiTokensCached');
    expect(route).toContain("formatApiTokenMutationError(createMutation.error, 'create')");
    expect(route).toContain("toast.error(formatApiTokenMutationError(error, 'revoke'))");
    expect(route).not.toContain('error.message ||');
    expect(route).not.toContain('createMutation.error?.message');
    expect(route).not.toContain('err instanceof Error');

    expect(hook).toContain('useApiTokens');
    expect(hook).toContain('queryKeys.apiTokens.list()');
    expect(hook).toContain('normalizeReadQueryError(error, {');
    expect(hook).toContain('SETTINGS_READ_MESSAGES.apiTokens');

    expect(queryKeys).toContain('apiTokens: {');
    expect(server).toContain('export const listApiTokens');
    expect(server).toContain('eq(apiTokens.organizationId, ctx.organizationId)');
    expect(server).toContain('db.transaction');
  });
});
