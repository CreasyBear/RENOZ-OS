import { isReadQueryError } from '@/lib/read-path-policy';

export function formatWarrantyReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
