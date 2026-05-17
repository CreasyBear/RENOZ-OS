import { isReadQueryError } from '@/lib/read-path-policy';

export const CREDIT_NOTE_LIST_READ_FALLBACK_MESSAGE =
  'Credit notes are temporarily unavailable. Please refresh and try again.';

export const CREDIT_NOTE_DETAIL_READ_FALLBACK_MESSAGE =
  'Credit note details are temporarily unavailable. Please refresh and try again.';

function getCreditNoteReadErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function getCreditNoteListReadErrorMessage(error: unknown): string {
  return getCreditNoteReadErrorMessage(error, CREDIT_NOTE_LIST_READ_FALLBACK_MESSAGE);
}

export function getCreditNoteDetailReadErrorMessage(error: unknown): string {
  return getCreditNoteReadErrorMessage(error, CREDIT_NOTE_DETAIL_READ_FALLBACK_MESSAGE);
}
