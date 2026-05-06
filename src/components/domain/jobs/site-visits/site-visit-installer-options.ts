import type { InstallerListItem } from '@/lib/schemas/jobs/installers';

export const CURRENT_USER_INSTALLER_OPTION_VALUE = 'current-user';

export function createSiteVisitInstallerOptions(installers: InstallerListItem[]) {
  return [
    { value: CURRENT_USER_INSTALLER_OPTION_VALUE, label: 'Assign to me' },
    ...installers.flatMap((installer) => {
      const userId = installer.user?.id;
      if (!userId) return [];

      return {
        value: userId,
        label: installer.user?.name || installer.user?.email || 'Unknown installer',
      };
    }),
  ];
}

export function resolveSiteVisitInstallerId(installerId?: string | null) {
  if (!installerId || installerId === CURRENT_USER_INSTALLER_OPTION_VALUE) {
    return undefined;
  }

  return installerId;
}

export function formatInstallerDirectoryReadError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Installer directory is temporarily unavailable. Please refresh and try again.';
}
