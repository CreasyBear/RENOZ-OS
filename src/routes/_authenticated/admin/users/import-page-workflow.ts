import type { BatchInvitationItem, BatchInvitationResult } from '@/lib/schemas/users';
import { formatUserMutationError } from '@/hooks/users/user-mutation-error-messages';

export type ImportStep = 'upload' | 'map' | 'validate' | 'import' | 'complete';
export type UserImportRole = 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
export type UserImportField = 'email' | 'firstName' | 'lastName' | 'role' | 'message';

export interface ParsedUserImportRow {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  message?: string;
  [key: string]: string | undefined;
}

export interface UserImportValidationResult {
  row: number;
  email: string;
  valid: boolean;
  errors: string[];
}

export interface ParsedUserImportCsv {
  headers: string[];
  rows: string[][];
}

export const REQUIRED_USER_IMPORT_FIELDS: UserImportField[] = ['email'];
export const OPTIONAL_USER_IMPORT_FIELDS: UserImportField[] = ['firstName', 'lastName', 'role', 'message'];
export const ALL_USER_IMPORT_FIELDS = [
  ...REQUIRED_USER_IMPORT_FIELDS,
  ...OPTIONAL_USER_IMPORT_FIELDS,
] as const;
export const VALID_USER_IMPORT_ROLES: UserImportRole[] = [
  'admin',
  'manager',
  'sales',
  'operations',
  'support',
  'viewer',
];

const USER_IMPORT_PARSE_FALLBACK =
  'CSV could not be read. Check the file format and try again.';
const USER_IMPORT_EMPTY_MESSAGE = 'CSV must have at least a header row and one data row';
const USER_IMPORT_UNCLOSED_QUOTE_MESSAGE = 'CSV contains an unclosed quoted value.';
const USER_IMPORT_SAFE_PARSE_MESSAGES = new Set([
  USER_IMPORT_EMPTY_MESSAGE,
  USER_IMPORT_UNCLOSED_QUOTE_MESSAGE,
]);

export function isUserImportCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
}

function hasContent(row: string[]): boolean {
  return row.some((value) => value.trim().length > 0);
}

export function parseUserImportCsv(text: string): ParsedUserImportCsv {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = '';
  };

  const pushRow = () => {
    pushCell();
    if (hasContent(row)) {
      records.push(row);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      pushRow();
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new Error(USER_IMPORT_UNCLOSED_QUOTE_MESSAGE);
  }

  if (cell.length > 0 || row.length > 0) {
    pushRow();
  }

  if (records.length < 2) {
    throw new Error(USER_IMPORT_EMPTY_MESSAGE);
  }

  const [headers, ...rows] = records;
  return { headers, rows };
}

export function formatUserImportParseError(error: unknown): string {
  if (
    error instanceof Error &&
    USER_IMPORT_SAFE_PARSE_MESSAGES.has(error.message)
  ) {
    return error.message;
  }

  return USER_IMPORT_PARSE_FALLBACK;
}

export function createUserImportColumnMapping(headers: string[]): Record<string, string> {
  const autoMapping: Record<string, string> = {};

  headers.forEach((header) => {
    const normalized = header.toLowerCase().replace(/[_\s-]/g, '');
    if (normalized.includes('email')) autoMapping.email = header;
    else if (normalized.includes('firstname') || normalized === 'first') {
      autoMapping.firstName = header;
    } else if (normalized.includes('lastname') || normalized === 'last') {
      autoMapping.lastName = header;
    } else if (normalized.includes('role')) {
      autoMapping.role = header;
    } else if (normalized.includes('message') || normalized.includes('note')) {
      autoMapping.message = header;
    }
  });

  return autoMapping;
}

export function buildParsedUserImportRows(
  rows: string[][],
  headers: string[],
  columnMapping: Record<string, string>
): ParsedUserImportRow[] {
  return rows.map((row) => {
    const data: ParsedUserImportRow = { email: '' };

    Object.entries(columnMapping).forEach(([field, csvHeader]) => {
      const columnIndex = headers.indexOf(csvHeader);
      if (columnIndex >= 0) {
        data[field] = row[columnIndex]?.trim() ?? '';
      }
    });

    return data;
  });
}

export function validateUserImportRows(
  parsedRows: ParsedUserImportRow[]
): UserImportValidationResult[] {
  return parsedRows.map((row, index) => {
    const errors: string[] = [];
    const role = row.role?.toLowerCase();

    if (!row.email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push('Invalid email format');
    }

    if (role && !VALID_USER_IMPORT_ROLES.includes(role as UserImportRole)) {
      errors.push(`Invalid role: ${row.role}`);
    }

    return {
      row: index + 1,
      email: row.email || '(empty)',
      valid: errors.length === 0,
      errors,
    };
  });
}

export function buildBatchInvitationItems(
  validRows: UserImportValidationResult[],
  parsedRows: ParsedUserImportRow[]
): BatchInvitationItem[] {
  return validRows.map((result) => {
    const rowData = parsedRows[result.row - 1];
    return {
      email: rowData.email,
      role: (rowData.role?.toLowerCase() as UserImportRole) || 'viewer',
      personalMessage: rowData.message || undefined,
    };
  });
}

export function formatUserImportResultError(error: BatchInvitationResult['error']): string {
  if (!error || error.trim().length === 0 || error.toLowerCase() === 'unknown error') {
    return formatUserMutationError(
      { statusCode: 500, message: 'Internal server error' },
      'batchSendInvitations'
    );
  }

  return formatUserMutationError(
    { message: error },
    'batchSendInvitations'
  );
}
