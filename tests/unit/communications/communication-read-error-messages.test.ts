import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  COMMUNICATION_READ_MESSAGES,
  formatCommunicationReadError,
} from '@/lib/communications/read-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('communication read error messages', () => {
  it('uses normalized read-query copy and rejects raw error messages', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'postgres database timeout',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: COMMUNICATION_READ_MESSAGES.preferences,
      }
    );

    expect(formatCommunicationReadError(normalized, 'Fallback copy')).toBe(
      COMMUNICATION_READ_MESSAGES.preferences
    );
    expect(formatCommunicationReadError(new Error('postgres database timeout'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });

  it('keeps communications read states behind communications-owned copy', () => {
    const preferences = read(
      'src/components/domain/communications/communication-preferences.tsx'
    );
    const suppression = read(
      'src/components/domain/communications/settings/suppression-list-table.tsx'
    );
    const inboxAccounts = read(
      'src/components/domain/communications/inbox/inbox-email-accounts-settings.tsx'
    );
    const inbox = read('src/components/domain/communications/inbox/inbox.tsx');
    const templates = read(
      'src/routes/_authenticated/communications/emails/templates/templates-page.tsx'
    );
    const signatures = read(
      'src/routes/_authenticated/communications/signatures/signatures-page.tsx'
    );
    const campaigns = read(
      'src/routes/_authenticated/communications/campaigns/campaigns-page.tsx'
    );
    const emailHistory = read(
      'src/routes/_authenticated/communications/emails/-email-history-page.tsx'
    );
    const scheduledEmails = read(
      'src/routes/_authenticated/communications/emails/scheduled-emails-page.tsx'
    );
    const scheduledEmailsList = read(
      'src/components/domain/communications/emails/scheduled-emails-list.tsx'
    );
    const scheduledCalls = read(
      'src/routes/_authenticated/communications/calls/calls-page.tsx'
    );
    const upcomingCalls = read(
      'src/components/domain/communications/calls/upcoming-calls-widget.tsx'
    );
    const formatter = read('src/lib/communications/read-error-messages.ts');

    expect(preferences).toContain('formatCommunicationReadError(');
    expect(preferences).toContain('COMMUNICATION_READ_MESSAGES.preferences');
    expect(preferences).toContain('COMMUNICATION_READ_MESSAGES.preferenceHistory');
    expect(preferences).not.toContain('<span>{error.message}</span>');
    expect(suppression).toContain('formatCommunicationReadError(');
    expect(suppression).toContain('COMMUNICATION_READ_MESSAGES.suppressionList');
    expect(suppression).not.toContain('<span>{error.message}</span>');
    expect(inboxAccounts).toContain('formatCommunicationReadError(');
    expect(inboxAccounts).toContain('COMMUNICATION_READ_MESSAGES.inboxEmailAccounts');
    expect(inboxAccounts).toContain('COMMUNICATION_READ_MESSAGES.inboxEmailAccountsCached');
    expect(inboxAccounts).not.toContain('Failed to load email accounts: {error.message}');
    expect(inboxAccounts).not.toContain('error.message ||');
    expect(inbox).toContain('formatCommunicationReadError(');
    expect(inbox).toContain('COMMUNICATION_READ_MESSAGES.inboxItems');
    expect(inbox).not.toContain('? error.message');
    expect(inbox).not.toContain(
      'Inbox data is temporarily unavailable. Please refresh and try again."'
    );
    expect(templates).toContain('formatCommunicationReadError(');
    expect(templates).toContain('COMMUNICATION_READ_MESSAGES.emailTemplates');
    expect(templates).not.toContain('<span>{error.message}</span>');
    expect(signatures).toContain('formatCommunicationReadError(');
    expect(signatures).toContain('COMMUNICATION_READ_MESSAGES.emailSignatures');
    expect(signatures).not.toContain('<span>{error.message}</span>');
    expect(campaigns).toContain('formatCommunicationReadError(');
    expect(campaigns).toContain('COMMUNICATION_READ_MESSAGES.emailCampaigns');
    expect(campaigns).not.toContain('<span>{error.message}</span>');
    expect(emailHistory).toContain('formatCommunicationReadError(');
    expect(emailHistory).toContain('COMMUNICATION_READ_MESSAGES.emailHistory');
    expect(emailHistory).not.toContain('? error.message');
    expect(emailHistory).not.toContain(
      'Email history is temporarily unavailable. Please refresh and try again."'
    );
    expect(scheduledEmails).toContain('formatCommunicationReadError(');
    expect(scheduledEmails).toContain('COMMUNICATION_READ_MESSAGES.scheduledEmails');
    expect(scheduledEmails).not.toContain('? error.message');
    expect(scheduledEmails).not.toContain(
      'Scheduled emails are temporarily unavailable. Please refresh and try again."'
    );
    expect(scheduledEmailsList).toContain('formatCommunicationReadError(');
    expect(scheduledEmailsList).toContain('COMMUNICATION_READ_MESSAGES.scheduledEmails');
    expect(scheduledEmailsList).not.toContain('error instanceof Error ? error.message');
    expect(scheduledEmailsList).not.toContain('"An error occurred"');
    expect(scheduledCalls).toContain('formatCommunicationReadError(');
    expect(scheduledCalls).toContain('COMMUNICATION_READ_MESSAGES.scheduledCalls');
    expect(scheduledCalls).not.toContain('? error.message');
    expect(scheduledCalls).not.toContain(
      'Scheduled calls are temporarily unavailable. Please refresh and try again."'
    );
    expect(upcomingCalls).toContain('formatCommunicationReadError(');
    expect(upcomingCalls).toContain('COMMUNICATION_READ_MESSAGES.upcomingCalls');
    expect(upcomingCalls).not.toContain('? error.message');
    expect(upcomingCalls).not.toContain(
      'Upcoming calls are temporarily unavailable. Please refresh and try again."'
    );
    expect(formatter).toContain('isReadQueryError(error)');
    expect(formatter).toContain('suppressionList');
    expect(formatter).toContain('inboxEmailAccounts');
    expect(formatter).toContain('inboxItems');
    expect(formatter).toContain('emailTemplates');
    expect(formatter).toContain('emailSignatures');
    expect(formatter).toContain('emailCampaigns');
    expect(formatter).toContain('emailHistory');
    expect(formatter).toContain('scheduledEmails');
    expect(formatter).toContain('scheduledCalls');
    expect(formatter).toContain('upcomingCalls');
  });
});
