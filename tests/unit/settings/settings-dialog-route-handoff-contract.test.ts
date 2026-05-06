import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('settings dialog route handoff contract', () => {
  it('keeps non-persisted settings panes from pretending to save', () => {
    const dialog = read('src/components/layout/settings-dialog.tsx');

    expect(dialog).toContain('SettingsRouteShortcutPane');
    expect(dialog).toContain("void navigate({ to: '/settings/preferences' })");
    expect(dialog).toContain("void navigate({ to: '/settings/security' })");
    expect(dialog).toContain("void navigate({ to: '/settings/api-tokens' })");
    expect(dialog).toContain("void navigate({ to: '/settings/targets' })");
    expect(dialog).toContain("void navigate({ to: '/profile' })");
    expect(dialog).toContain('onClose={() => onOpenChange(false)}');
    expect(dialog.match(/onClose\(\)/g)).toHaveLength(5);

    expect(dialog).not.toContain('PreferencesSettingsSection');
    expect(dialog).not.toContain('SecuritySettingsSection');
    expect(dialog).not.toContain('TargetsSettingsSection');
    expect(dialog).not.toContain('ApiTokensSettingsSection');
    expect(dialog).not.toContain('NotificationRow');
    expect(dialog).not.toContain('role="switch"');
    expect(dialog).not.toContain("toast.success('Preference saved')");
    expect(dialog).not.toContain("toast.success('Setting saved')");
    expect(dialog).not.toContain("toast.success('Targets saved')");
    expect(dialog).not.toContain('Notification enabled');
    expect(dialog).not.toContain('tokens={[]}');
  });

  it('keeps canonical settings routes present for delegated workflows', () => {
    expect(read('src/routes/_authenticated/settings/preferences.tsx')).toContain(
      "createFileRoute('/_authenticated/settings/preferences')"
    );
    expect(read('src/routes/_authenticated/settings/security.tsx')).toContain(
      "createFileRoute('/_authenticated/settings/security')"
    );
    expect(read('src/routes/_authenticated/settings/api-tokens.tsx')).toContain(
      'createFileRoute("/_authenticated/settings/api-tokens")'
    );
    expect(read('src/routes/_authenticated/settings/targets.tsx')).toContain(
      "createFileRoute('/_authenticated/settings/targets')"
    );
  });
});
