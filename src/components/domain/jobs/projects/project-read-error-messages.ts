import { isReadQueryError } from '@/lib/read-path-policy';

export const PROJECT_LIST_READ_FALLBACK_MESSAGE =
  'Projects are temporarily unavailable. Please refresh and try again.';

export const PROJECT_NOTES_READ_FALLBACK_MESSAGE =
  'Project notes are temporarily unavailable. Please refresh and try again.';

export const PROJECT_FILES_READ_FALLBACK_MESSAGE =
  'Project files are temporarily unavailable. Please refresh and try again.';

export const PROJECT_MATERIALS_READ_FALLBACK_MESSAGE =
  'Project materials are temporarily unavailable. Please refresh and try again.';

export const PROJECT_SITE_VISITS_READ_FALLBACK_MESSAGE =
  'Project site visits are temporarily unavailable. Please refresh and try again.';

export const PROJECT_ALERTS_READ_FALLBACK_MESSAGE =
  'Project alerts are temporarily unavailable. Please refresh and try again.';

export const PROJECT_DOCUMENTS_READ_FALLBACK_MESSAGE =
  'Documents are temporarily unavailable. Showing the most recent documents.';

function getProjectReadErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function getProjectListReadErrorMessage(error: unknown): string {
  return getProjectReadErrorMessage(error, PROJECT_LIST_READ_FALLBACK_MESSAGE);
}

export function getProjectNotesReadErrorMessage(error: unknown): string {
  return getProjectReadErrorMessage(error, PROJECT_NOTES_READ_FALLBACK_MESSAGE);
}

export function getProjectFilesReadErrorMessage(error: unknown): string {
  return getProjectReadErrorMessage(error, PROJECT_FILES_READ_FALLBACK_MESSAGE);
}

export function getProjectMaterialsReadErrorMessage(error: unknown): string {
  return getProjectReadErrorMessage(error, PROJECT_MATERIALS_READ_FALLBACK_MESSAGE);
}

export function getProjectSiteVisitsReadErrorMessage(error: unknown): string {
  return getProjectReadErrorMessage(error, PROJECT_SITE_VISITS_READ_FALLBACK_MESSAGE);
}

export function getProjectAlertsReadErrorMessage(error: unknown): string {
  return getProjectReadErrorMessage(error, PROJECT_ALERTS_READ_FALLBACK_MESSAGE);
}

export function getProjectDocumentsReadErrorMessage(error: unknown): string {
  return getProjectReadErrorMessage(error, PROJECT_DOCUMENTS_READ_FALLBACK_MESSAGE);
}
