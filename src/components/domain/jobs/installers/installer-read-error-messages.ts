import { isReadQueryError } from '@/lib/read-path-policy';

export const INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE =
  'Installer availability is temporarily unavailable. Please refresh and try again.';

export const INSTALLER_DIRECTORY_READ_FALLBACK_MESSAGE =
  'Installer directory is temporarily unavailable. Please refresh and try again.';

function getInstallerReadErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function getInstallerAvailabilityReadErrorMessage(error: unknown): string {
  return getInstallerReadErrorMessage(error, INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE);
}

export function getInstallerDirectoryReadErrorMessage(error: unknown): string {
  return getInstallerReadErrorMessage(error, INSTALLER_DIRECTORY_READ_FALLBACK_MESSAGE);
}
