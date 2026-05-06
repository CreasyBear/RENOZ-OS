import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatInstallerProfileMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('installer profile mutation contract', () => {
  it('formats installer profile mutation failures without leaking unsafe internals', () => {
    expect(
      formatInstallerProfileMutationError(
        new Error('duplicate key violates installer_profiles_user_idx postgres stack'),
        'create'
      )
    ).toBe('Installer profile creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatInstallerProfileMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'statusBatch'
      )
    ).toBe('You do not have permission to manage installers.');

    expect(
      formatInstallerProfileMutationError(
        {
          statusCode: 400,
          errors: {
            maxJobsPerDay: ['Max jobs per day must be at least 1'],
          },
        },
        'update'
      )
    ).toBe('Max jobs per day must be at least 1');
  });

  it('keeps installer profile mutations scoped, cache-safe, and operator-safe', () => {
    const listPage = read('src/routes/_authenticated/installers/installers-page.tsx');
    const detailPage = read('src/routes/_authenticated/installers/installer-detail-page.tsx');
    const hooks = read('src/hooks/jobs/use-installers.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/installers.ts');
    const compactListPage = compact(listPage);
    const compactDetailPage = compact(detailPage);
    const compactHooks = compact(hooks);
    const compactServer = compact(server);

    expect(jobsIndex).toContain('formatInstallerProfileMutationError');
    expect(listPage).toContain("formatInstallerProfileMutationError(error, 'create')");
    expect(listPage).toContain("formatInstallerProfileMutationError(error, 'statusBatch')");
    expect(detailPage).toContain("formatInstallerProfileMutationError(error, 'update')");
    expect(compactListPage).not.toContain(
      "errorinstanceofError?error.message:'Failedtocreateinstallerprofile'"
    );
    expect(compactListPage).not.toContain(
      "errorinstanceofError?error.message:'Failedtoupdateinstallers'"
    );
    expect(compactDetailPage).not.toContain(
      "errorinstanceofError?error.message:'Failedtoupdateinstallerprofile'"
    );

    expect(hooks).toContain('invalidateInstallerMutationViews');
    expect(compactHooks).toContain('queryKey:queryKeys.installers.lists()');
    expect(compactHooks).toContain(
      "query.queryKey[0]==='installers'&&query.queryKey[1]==='suggestions'"
    );
    expect(compactHooks).toContain('queryKeys.installers.detail(installerId)');
    expect(compactHooks).toContain(
      'invalidateInstallerMutationViews(queryClient,data.installerIds)'
    );
    expect(compactHooks).not.toContain('queryKey:queryKeys.installers.details()');

    expect(compactServer).toContain(
      'eq(installerProfiles.id,id),eq(installerProfiles.organizationId,ctx.organizationId),isNull(installerProfiles.deletedAt)'
    );
    expect(compactServer).toContain(
      'eq(installerProfiles.organizationId,ctx.organizationId),inArray(installerProfiles.id,data.installerIds),isNull(installerProfiles.deletedAt)'
    );
    expect(compactServer).toContain('if(result.length!==data.installerIds.length)');
    expect(server).toContain("return profile;");
    expect(server).not.toContain('return { success: true };');
  });
});
