import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('settings domain barrel contract', () => {
  it('keeps dead extended settings presenters out of the public settings barrel', () => {
    const barrel = read('src/components/domain/settings/index.ts');
    const schemas = read('src/lib/schemas/settings/settings.ts');

    expect(
      existsSync(join(root, 'src/components/domain/settings/settings-sections-extended.tsx'))
    ).toBe(false);
    expect(barrel).not.toContain('settings-sections-extended');
    expect(barrel).not.toContain('PreferencesSettingsSection');
    expect(barrel).not.toContain('EmailSettingsSection');
    expect(barrel).not.toContain('SecuritySettingsSection');
    expect(barrel).not.toContain('ApiTokensSettingsSection');
    expect(barrel).not.toContain('TargetsSettingsSection');
    expect(barrel).not.toContain('WinLossSettingsSection');
    expect(schemas).not.toContain('Used by settings-sections-extended.tsx');
  });
});
