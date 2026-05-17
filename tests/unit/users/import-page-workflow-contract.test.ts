import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildBatchInvitationItems,
  buildParsedUserImportRows,
  createUserImportColumnMapping,
  formatUserImportParseError,
  formatUserImportResultError,
  parseUserImportCsv,
  validateUserImportRows,
} from '@/routes/_authenticated/admin/users/import-page-workflow';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('admin user import workflow contract', () => {
  it('parses quoted CSV values and maps common headers', () => {
    const parsed = parseUserImportCsv(
      'Email,First Name,Role,Message\n"jane@example.com","Jane","Operations","Welcome, Jane"\n'
    );

    expect(parsed.headers).toEqual(['Email', 'First Name', 'Role', 'Message']);
    expect(parsed.rows).toEqual([
      ['jane@example.com', 'Jane', 'Operations', 'Welcome, Jane'],
    ]);
    expect(createUserImportColumnMapping(parsed.headers)).toEqual({
      email: 'Email',
      firstName: 'First Name',
      role: 'Role',
      message: 'Message',
    });
  });

  it('validates rows and builds batch invitation payloads through pure helpers', () => {
    const rows = [
      ['jane@example.com', 'operations', 'Welcome'],
      ['bad-email', 'owner', 'Nope'],
    ];
    const headers = ['email', 'role', 'message'];
    const mapping = createUserImportColumnMapping(headers);
    const parsedRows = buildParsedUserImportRows(rows, headers, mapping);
    const validation = validateUserImportRows(parsedRows);

    expect(validation).toEqual([
      { row: 1, email: 'jane@example.com', valid: true, errors: [] },
      {
        row: 2,
        email: 'bad-email',
        valid: false,
        errors: ['Invalid email format', 'Invalid role: owner'],
      },
    ]);
    expect(buildBatchInvitationItems(validation.filter((row) => row.valid), parsedRows)).toEqual([
      {
        email: 'jane@example.com',
        role: 'operations',
        personalMessage: 'Welcome',
      },
    ]);
  });

  it('keeps CSV parse and batch result failures operator-safe', () => {
    expect(formatUserImportParseError(new Error('CSV contains an unclosed quoted value.'))).toBe(
      'CSV contains an unclosed quoted value.'
    );
    expect(formatUserImportParseError(new Error('TypeError: parser crashed'))).toBe(
      'CSV could not be read. Check the file format and try again.'
    );
    expect(formatUserImportResultError('User already exists in organization')).toBe(
      'User already exists in organization'
    );
    expect(formatUserImportResultError('duplicate key violates users_email_key')).toBe(
      'Bulk invitation sending is temporarily unavailable. Please refresh and try again.'
    );
    expect(formatUserImportResultError('Unknown error')).toBe(
      'Bulk invitation sending is temporarily unavailable. Please refresh and try again.'
    );
  });

  it('keeps import page and server batch results behind safe helpers', () => {
    const page = read('src/routes/_authenticated/admin/users/import-page.tsx');
    const workflow = read('src/routes/_authenticated/admin/users/import-page-workflow.ts');
    const server = read('src/server/functions/users/invitations.ts');

    expect(page).toContain('parseUserImportCsv');
    expect(page).toContain('formatUserImportResultError(r.error)');
    expect(page).toContain("formatUserMutationError(err, 'batchSendInvitations')");
    expect(page).not.toContain("r.error || 'Unknown error'");
    expect(page).not.toContain('const lines = text.split');
    expect(workflow).toContain('formatUserImportResultError');
    expect(server).toContain('BATCH_INVITATION_ROW_FAILURE_MESSAGE');
    expect(server).not.toContain("err instanceof Error ? err.message : 'Database error'");
  });
});
