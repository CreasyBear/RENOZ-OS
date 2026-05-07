import { isReadQueryError } from '@/lib/read-path-policy';

export const INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE =
  'Installer availability is temporarily unavailable. Please refresh and try again.';

export function getInstallerAvailabilityReadErrorMessage(error: unknown): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE;
}
