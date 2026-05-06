import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOGO_ERROR_MESSAGES } from '@/lib/organization-logo';
import {
  formatOrganizationLogoMutationError,
  formatOrganizationMutationError,
} from '@/hooks/organizations/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('organization settings feedback contract', () => {
  it('keeps organization mutation failures behind safe operator copy', () => {
    expect(
      formatOrganizationMutationError(
        new Error('duplicate key violates organizations_slug_key postgres stack'),
        'updateSettings'
      )
    ).toBe('Organization settings update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatOrganizationMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw permission detail' },
        'updateBranding'
      )
    ).toBe('You do not have permission to manage organization settings.');

    expect(
      formatOrganizationLogoMutationError(
        { statusCode: 400, code: 'INVALID_FILE_TYPE', message: 'raw upload detail' },
        'upload'
      )
    ).toBe(LOGO_ERROR_MESSAGES.invalidType);
  });

  it('keeps the organization settings route, hook, logo, and cache spine reviewable', () => {
    const settingsContainer = read(
      'src/components/domain/settings/organization-settings-container.tsx'
    );
    const settingsSections = read('src/components/domain/settings/settings-sections.tsx');
    const organizationHook = read('src/hooks/organizations/use-organization.ts');
    const logoHook = read('src/hooks/organizations/use-organization-logo-upload.ts');
    const organizationsIndex = read('src/hooks/organizations/index.ts');
    const organizationServer = read('src/server/functions/settings/organizations.ts');
    const logoServer = read('src/server/functions/settings/organization-logo.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(settingsContainer).toContain('formatSettingsReadError');
    expect(settingsContainer).toContain('SETTINGS_READ_MESSAGES.organizationSettings');

    expect(organizationHook).toContain('formatOrganizationMutationError');
    expect(organizationHook).toContain(
      "description: formatOrganizationMutationError(error, 'updateOrganization')"
    );
    expect(organizationHook).toContain(
      "description: formatOrganizationMutationError(error, 'updateSettings')"
    );
    expect(organizationHook).toContain(
      "description: formatOrganizationMutationError(error, 'updateBranding')"
    );
    expect(organizationHook).not.toContain('error instanceof Error ? error.message');

    expect(logoHook).toContain("toast.error(formatOrganizationLogoMutationError(error, 'upload'))");
    expect(logoHook).toContain("toast.error(formatOrganizationLogoMutationError(error, 'remove'))");
    expect(logoHook).not.toContain('error.message ||');

    expect(settingsSections).toContain(
      'formatOrganizationLogoMutationError(uploadError, "upload")'
    );
    expect(settingsSections).toContain(
      'formatOrganizationLogoMutationError(removeError, "remove")'
    );
    expect(settingsSections).not.toContain('logoUpload.error?.message');
    expect(settingsSections).not.toContain('removeLogo.error?.message');

    expect(organizationsIndex).toContain('formatOrganizationMutationError');
    expect(organizationsIndex).toContain('formatOrganizationLogoMutationError');

    expect(queryKeys).toContain('organizations: {');
    expect(queryKeys).toContain("current: () => [...queryKeys.organizations.all, 'current']");
    expect(queryKeys).toContain("settings: () => [...queryKeys.organizations.all, 'settings']");
    expect(queryKeys).toContain("branding: () => [...queryKeys.organizations.all, 'branding']");

    expect(organizationServer).toContain('withAuth({ permission: PERMISSIONS.organization.update })');
    expect(organizationServer).toContain('eq(organizations.id, ctx.organizationId)');
    expect(logoServer).toContain('withAuth({ permission: PERMISSIONS.organization.update })');
    expect(logoServer).toContain('eq(organizations.id, ctx.organizationId)');
    expect(logoServer).toContain('organizations/${ctx.organizationId}/branding/logo.${ext}');
  });
});
