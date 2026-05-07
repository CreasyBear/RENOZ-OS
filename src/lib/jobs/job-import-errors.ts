export const JOB_IMPORT_ERROR_MESSAGES = {
  date: 'Date could not be parsed. Use a supported date format.',
  time: 'Time could not be parsed. Use a supported time format.',
  amount: 'Amount could not be parsed. Use a supported currency or number format.',
  jobNumber: 'Job number could not be parsed. Use a supported job reference format.',
  rowParse: 'Row could not be parsed. Check the mapped columns and values.',
  missingRelations: 'Select a customer and installer before importing this row.',
  rowImport: 'Job import failed for this row. Please check the row data and try again.',
} as const;

export type JobFieldParseErrorKind = 'date' | 'time' | 'amount' | 'jobNumber';

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
};

const MISSING_RELATION_VALIDATION_MESSAGES = new Set<string>([
  JOB_IMPORT_ERROR_MESSAGES.missingRelations,
]);

export function formatJobFieldParseError(kind: JobFieldParseErrorKind): string {
  return JOB_IMPORT_ERROR_MESSAGES[kind];
}

export function formatBulkJobRowParseError(): string {
  return JOB_IMPORT_ERROR_MESSAGES.rowParse;
}

export function formatJobImportRowError(error: unknown): string {
  const candidate = typeof error === 'object' && error !== null ? (error as ErrorLike) : null;

  if (
    candidate &&
    (candidate.name === 'ValidationError' || candidate.code === 'VALIDATION_ERROR') &&
    typeof candidate.message === 'string' &&
    MISSING_RELATION_VALIDATION_MESSAGES.has(candidate.message)
  ) {
    return JOB_IMPORT_ERROR_MESSAGES.missingRelations;
  }

  return JOB_IMPORT_ERROR_MESSAGES.rowImport;
}
