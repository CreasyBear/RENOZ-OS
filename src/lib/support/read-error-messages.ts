import { isReadQueryError } from '@/lib/read-path-policy';

export function formatSupportReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function isSupportReadNotFound(error: unknown): boolean {
  return isReadQueryError(error) && error.failureKind === 'not-found';
}
