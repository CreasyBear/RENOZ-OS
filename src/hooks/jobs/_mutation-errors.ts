import { formatMutationError } from '@/lib/mutation-error-feedback';

const JOB_TEMPLATE_MUTATION_FALLBACKS = {
  create: 'Job template creation is temporarily unavailable. Please refresh and try again.',
  update: 'Job template update is temporarily unavailable. Please refresh and try again.',
  delete: 'Job template deletion is temporarily unavailable. Please refresh and try again.',
  duplicate:
    'Job template duplication is temporarily unavailable. Please refresh and try again.',
} as const;

const JOB_TEMPLATE_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing job templates.',
  CONFLICT: 'Job template details conflict with the current workspace state.',
  NOT_FOUND: 'The job template could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage job templates.',
  RATE_LIMIT: 'Too many job template changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the job template details and try again.',
};

const PROJECT_NOTE_MUTATION_FALLBACKS = {
  create: 'Project note creation is temporarily unavailable. Please refresh and try again.',
  update: 'Project note update is temporarily unavailable. Please refresh and try again.',
  delete: 'Project note deletion is temporarily unavailable. Please refresh and try again.',
} as const;

const PROJECT_NOTE_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing project notes.',
  CONFLICT: 'Project note details conflict with the current workspace state.',
  NOT_FOUND: 'The project note could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage project notes.',
  RATE_LIMIT: 'Too many project note changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the project note details and try again.',
};

const PROJECT_FILE_MUTATION_FALLBACKS = {
  upload: 'Project file upload is temporarily unavailable. Please refresh and try again.',
  update: 'Project file update is temporarily unavailable. Please refresh and try again.',
  delete: 'Project file deletion is temporarily unavailable. Please refresh and try again.',
} as const;

const PROJECT_FILE_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing project files.',
  CONFLICT: 'Project file details conflict with the current workspace state.',
  NOT_FOUND: 'The project file could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage project files.',
  RATE_LIMIT: 'Too many project file changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the project file details and try again.',
};

const PROJECT_WORKSTREAM_MUTATION_FALLBACKS = {
  create: 'Project workstream creation is temporarily unavailable. Please refresh and try again.',
  update: 'Project workstream update is temporarily unavailable. Please refresh and try again.',
  delete: 'Project workstream deletion is temporarily unavailable. Please refresh and try again.',
  reorder: 'Project workstream reorder is temporarily unavailable. Please refresh and try again.',
} as const;

const PROJECT_WORKSTREAM_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing project workstreams.',
  CONFLICT: 'Project workstream details conflict with the current workspace state.',
  NOT_FOUND: 'The project workstream could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage project workstreams.',
  RATE_LIMIT: 'Too many project workstream changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the project workstream details and try again.',
};

const PROJECT_TASK_MUTATION_FALLBACKS = {
  create: 'Project task creation is temporarily unavailable. Please refresh and try again.',
  update: 'Project task update is temporarily unavailable. Please refresh and try again.',
  delete: 'Project task deletion is temporarily unavailable. Please refresh and try again.',
  reorder: 'Project task reorder is temporarily unavailable. Please refresh and try again.',
  status: 'Project task status update is temporarily unavailable. Please refresh and try again.',
} as const;

const PROJECT_TASK_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing project tasks.',
  CONFLICT: 'Project task details conflict with the current workspace state.',
  NOT_FOUND: 'The project task could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage project tasks.',
  RATE_LIMIT: 'Too many project task changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the project task details and try again.',
};

const PROJECT_BOM_MUTATION_FALLBACKS = {
  create: 'Project BOM creation is temporarily unavailable. Please refresh and try again.',
  addItem: 'Project BOM item creation is temporarily unavailable. Please refresh and try again.',
  updateItem: 'Project BOM item update is temporarily unavailable. Please refresh and try again.',
  removeItem: 'Project BOM item removal is temporarily unavailable. Please refresh and try again.',
  removeItems: 'Project BOM item removal is temporarily unavailable. Please refresh and try again.',
  updateStatus:
    'Project BOM status update is temporarily unavailable. Please refresh and try again.',
  importCsv: 'Project BOM CSV import is temporarily unavailable. Please refresh and try again.',
  importOrder:
    'Project BOM order import is temporarily unavailable. Please refresh and try again.',
} as const;

const PROJECT_BOM_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing project materials.',
  CONFLICT: 'Project BOM details conflict with the current workspace state.',
  NOT_FOUND: 'The project BOM item could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage project materials.',
  RATE_LIMIT: 'Too many project BOM changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the project BOM details and try again.',
};

export type JobTemplateMutationAction = keyof typeof JOB_TEMPLATE_MUTATION_FALLBACKS;
export type ProjectNoteMutationAction = keyof typeof PROJECT_NOTE_MUTATION_FALLBACKS;
export type ProjectFileMutationAction = keyof typeof PROJECT_FILE_MUTATION_FALLBACKS;
export type ProjectWorkstreamMutationAction =
  keyof typeof PROJECT_WORKSTREAM_MUTATION_FALLBACKS;
export type ProjectTaskMutationAction = keyof typeof PROJECT_TASK_MUTATION_FALLBACKS;
export type ProjectBomMutationAction = keyof typeof PROJECT_BOM_MUTATION_FALLBACKS;

export function formatJobTemplateMutationError(
  error: unknown,
  action: JobTemplateMutationAction
): string {
  return formatMutationError(error, JOB_TEMPLATE_MUTATION_FALLBACKS[action], {
    codeMessages: JOB_TEMPLATE_MUTATION_CODE_MESSAGES,
  });
}

export function formatProjectNoteMutationError(
  error: unknown,
  action: ProjectNoteMutationAction
): string {
  return formatMutationError(error, PROJECT_NOTE_MUTATION_FALLBACKS[action], {
    codeMessages: PROJECT_NOTE_MUTATION_CODE_MESSAGES,
  });
}

export function formatProjectFileMutationError(
  error: unknown,
  action: ProjectFileMutationAction
): string {
  return formatMutationError(error, PROJECT_FILE_MUTATION_FALLBACKS[action], {
    codeMessages: PROJECT_FILE_MUTATION_CODE_MESSAGES,
  });
}

export function formatProjectWorkstreamMutationError(
  error: unknown,
  action: ProjectWorkstreamMutationAction
): string {
  return formatMutationError(error, PROJECT_WORKSTREAM_MUTATION_FALLBACKS[action], {
    codeMessages: PROJECT_WORKSTREAM_MUTATION_CODE_MESSAGES,
  });
}

export function formatProjectTaskMutationError(
  error: unknown,
  action: ProjectTaskMutationAction
): string {
  return formatMutationError(error, PROJECT_TASK_MUTATION_FALLBACKS[action], {
    codeMessages: PROJECT_TASK_MUTATION_CODE_MESSAGES,
  });
}

export function formatProjectBomMutationError(
  error: unknown,
  action: ProjectBomMutationAction
): string {
  return formatMutationError(error, PROJECT_BOM_MUTATION_FALLBACKS[action], {
    codeMessages: PROJECT_BOM_MUTATION_CODE_MESSAGES,
  });
}
