import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  formatSettingsReadError,
  SETTINGS_READ_MESSAGES,
} from '@/lib/settings/read-error-messages';

const root = process.cwd();

const settingsReadErrorConsumerPaths = [
  'src/components/domain/settings/organization-settings-container.tsx',
  'src/components/domain/settings/scheduled-reports-list-container.tsx',
  'src/components/domain/settings/scheduled-reports-list-presenter.tsx',
  'src/components/domain/settings/win-loss-reasons-manager.tsx',
  'src/components/layout/settings-dialog.tsx',
  'src/routes/_authenticated/settings/index.tsx',
];

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('settings read error messages', () => {
  it('shows normalized read-query copy and hides arbitrary raw errors', () => {
    const unsafeError = new Error(
      'duplicate key violates settings access_token provider stack'
    );
    const fallback = SETTINGS_READ_MESSAGES.organizationSettings;

    expect(formatSettingsReadError(unsafeError, fallback)).toBe(fallback);
    expect(JSON.stringify(formatSettingsReadError(unsafeError, fallback))).not.toContain(
      'duplicate key'
    );
    expect(JSON.stringify(formatSettingsReadError(unsafeError, fallback))).not.toContain(
      'access_token'
    );
    expect(JSON.stringify(formatSettingsReadError(unsafeError, fallback))).not.toContain(
      'provider stack'
    );

    const normalized = normalizeReadQueryError(new Error('postgres timeout'), {
      fallbackMessage: SETTINGS_READ_MESSAGES.scheduledReports,
      contractType: 'always-shaped',
    });

    expect(formatSettingsReadError(normalized, 'Fallback copy')).toBe(
      SETTINGS_READ_MESSAGES.scheduledReports
    );
  });

  it('keeps settings read-error UI behind the settings formatter contract', () => {
    const hook = read('src/hooks/settings/use-win-loss-reasons.ts');

    for (const path of settingsReadErrorConsumerPaths) {
      const source = read(path);

      expect(source, path).toContain('formatSettingsReadError(');
      expect(source, path).not.toContain('<p className="text-sm mt-1">{error.message}</p>');
      expect(source, path).not.toContain(
        '<p className="text-muted-foreground">{error.message}</p>'
      );
      expect(source, path).not.toContain('<span>{error.message}</span>');
      expect(source, path).not.toContain(
        "description={error.message ?? 'An unexpected error occurred'}"
      );
      expect(source, path).not.toContain('message={error.message}');
    }

    expect(hook).toContain('SETTINGS_READ_MESSAGES.winLossReasons');
    expect(hook).toContain('normalizeReadQueryError(error, {');
    expect(hook).toContain("contractType: 'always-shaped'");
  });
});
