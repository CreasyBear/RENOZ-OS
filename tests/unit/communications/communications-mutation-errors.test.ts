import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatCommunicationCampaignMutationError,
  formatCommunicationInboxAccountMutationError,
  formatCommunicationInboxMutationError,
  formatCommunicationPreferenceMutationError,
  formatCommunicationQuickLogMutationError,
  formatCommunicationScheduledCallMutationError,
  formatCommunicationScheduledEmailMutationError,
  formatCommunicationSignatureMutationError,
  formatCommunicationSuppressionMutationError,
  formatCommunicationTemplateMutationError,
} from '@/hooks/communications/_mutation-errors';
import { executeBulkAction } from '@/lib/actions/bulk-action-results';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('communications mutation error formatting', () => {
  it('suppresses infrastructure messages and keeps safe recovery copy', () => {
    expect(
      formatCommunicationTemplateMutationError(
        new Error('duplicate key value violates unique constraint email_templates_name_key'),
        'save'
      )
    ).toBe('Unable to save communication template.');

    expect(
      formatCommunicationTemplateMutationError(
        new Error('A communication template with this name already exists.'),
        'save'
      )
    ).toBe('A communication template with this name already exists.');

    expect(
      formatCommunicationTemplateMutationError(
        new Error('postgres database stack trace while restoring template version'),
        'restore'
      )
    ).toBe('Unable to restore communication template version.');

    expect(
      formatCommunicationCampaignMutationError(
        { statusCode: 403, message: 'permission denied by communications policy' },
        'create'
      )
    ).toBe("You don't have permission to perform this action.");

    expect(
      formatCommunicationCampaignMutationError(
        new Error('postgres internal server error with stack trace'),
        'delete'
      )
    ).toBe('Unable to delete communication campaign.');

    expect(
      formatCommunicationCampaignMutationError(
        new Error('supabase database constraint failed while sending campaign'),
        'send'
      )
    ).toBe('Unable to send communication campaign.');

    expect(
      formatCommunicationCampaignMutationError(
        new Error('postgres database stack trace while updating campaign recipients'),
        'populate'
      )
    ).toBe('Unable to populate communication campaign recipients.');

    expect(
      formatCommunicationInboxMutationError(
        new Error('supabase database constraint failed while archiving inbox item'),
        'archive'
      )
    ).toBe('Unable to archive email.');

    expect(
      formatCommunicationInboxAccountMutationError(
        new Error('oauth invalid_client client_secret mismatch for redirect_uri'),
        'callback'
      )
    ).toBe('Unable to connect email account.');

    expect(
      formatCommunicationScheduledEmailMutationError(
        new Error('postgres database stack trace while cancelling scheduled email'),
        'cancel'
      )
    ).toBe('Unable to cancel scheduled email.');

    expect(
      formatCommunicationScheduledCallMutationError(
        new Error('supabase database stack trace while completing scheduled call'),
        'complete'
      )
    ).toBe('Unable to complete scheduled call.');

    expect(
      formatCommunicationSignatureMutationError(
        new Error('postgres duplicate key constraint while setting default signature'),
        'setDefault'
      )
    ).toBe('Unable to set default email signature.');

    expect(
      formatCommunicationSuppressionMutationError(
        new Error('supabase database stack trace while removing suppression'),
        'remove'
      )
    ).toBe('Unable to remove email from suppression list.');

    expect(
      formatCommunicationQuickLogMutationError(
        new Error('postgres database stack trace while creating quick log activity'),
        'create'
      )
    ).toBe('Unable to save quick log.');

    expect(
      formatCommunicationPreferenceMutationError(
        new Error('supabase database stack trace while updating communication preferences'),
        'update'
      )
    ).toBe('Unable to update communication preferences.');
  });

  it('suppresses implementation-shaped communications mutation messages', () => {
    expect(
      formatCommunicationTemplateMutationError(
        new Error('TypeError: Cannot read properties of undefined (reading templateId)'),
        'save'
      )
    ).toBe('Unable to save communication template.');

    expect(
      formatCommunicationCampaignMutationError(
        new Error('SQL syntax error at or near "recipient_status"'),
        'testSend'
      )
    ).toBe('Unable to send communication campaign test email.');

    expect(
      formatCommunicationCampaignMutationError(
        new Error('ReferenceError: campaignPayload is not defined'),
        'update'
      )
    ).toBe('Unable to update communication campaign.');

    expect(
      formatCommunicationInboxAccountMutationError(
        new Error('ReferenceError: providerToken is not defined'),
        'sync'
      )
    ).toBe('Unable to sync email account.');
  });

  it('keeps customer communications mutation feedback on communications-owned formatters', () => {
    const container = read(
      'src/components/domain/customers/containers/communications-container.tsx'
    );
    const index = read('src/hooks/communications/index.ts');

    expect(index).toContain("export * from './_mutation-errors'");
    expect(container).toContain("formatCommunicationTemplateMutationError(error, 'save')");
    expect(container).toContain("formatCommunicationTemplateMutationError(error, 'delete')");
    expect(container).toContain("formatCommunicationCampaignMutationError(error, 'create')");
    expect(container).not.toContain(
      "error instanceof Error ? error.message : 'Failed to save template'"
    );
    expect(container).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(container).not.toContain("toast.error('Failed to delete template'");
    expect(container).not.toContain("toast.error('Failed to create campaign'");
  });

  it('keeps communications template mutations on communications-owned formatters', () => {
    const editor = read('src/components/domain/communications/template-editor.tsx');
    const pageHook = read(
      'src/routes/_authenticated/communications/emails/templates/use-templates-page.ts'
    );

    expect(editor).toContain('formatCommunicationTemplateMutationError(error, "update")');
    expect(editor).toContain('formatCommunicationTemplateMutationError(error, "create")');
    expect(editor).toContain('formatCommunicationTemplateMutationError(createTemplate.error, "create")');
    expect(editor).toContain('formatCommunicationTemplateMutationError(updateTemplate.error, "update")');
    expect(pageHook).toContain('formatCommunicationTemplateMutationError(error, "delete")');
    expect(pageHook).toContain('formatCommunicationTemplateMutationError(error, "clone")');
    expect(pageHook).toContain('formatCommunicationTemplateMutationError(error, "restore")');
    expect(editor).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(editor).not.toContain('toast.error("Failed to update template"');
    expect(editor).not.toContain('toast.error("Failed to create template"');
    expect(editor).not.toContain('(createTemplate.error ?? updateTemplate.error)?.message');
    expect(pageHook).not.toContain('toastError("Failed to delete template")');
    expect(pageHook).not.toContain('toastError("Failed to clone template")');
    expect(pageHook).not.toContain('toastError("Failed to restore template version")');
    expect(pageHook).not.toContain('throw new Error("Failed to restore template version")');
  });

  it('keeps communications campaign actions on communications-owned formatters', () => {
    const route = read('src/routes/_authenticated/communications/campaigns/campaigns-page.tsx');
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const wizard = read(
      'src/components/domain/communications/campaigns/campaign-wizard.tsx'
    );

    expect(route).toContain('formatCommunicationCampaignMutationError(error, "cancel")');
    expect(route).toContain('formatCommunicationCampaignMutationError(error, "delete")');
    expect(route).toContain('formatCommunicationCampaignMutationError(error, "duplicate")');
    expect(route).toContain('formatCommunicationCampaignMutationError(error, "testSend")');
    expect(route).toContain('formatCommunicationCampaignMutationError(error, "pause")');
    expect(route).toContain('formatCommunicationCampaignMutationError(error, "resume")');
    expect(route).toContain('formatError: (error) => formatCommunicationCampaignMutationError');
    expect(route).not.toContain('error instanceof Error ? error.message : "Failed to cancel campaign"');
    expect(route).not.toContain('error instanceof Error ? error.message : "Failed to delete campaign"');
    expect(route).not.toContain('error instanceof Error ? error.message : "Failed to duplicate campaign"');
    expect(route).not.toContain('error instanceof Error ? error.message : "Failed to send test email"');

    expect(detailPanel).toContain('formatCommunicationCampaignMutationError(error, "send")');
    expect(detailPanel).toContain('formatCommunicationCampaignMutationError(error, "pause")');
    expect(detailPanel).toContain('formatCommunicationCampaignMutationError(error, "resume")');
    expect(detailPanel).toContain('formatCommunicationCampaignMutationError(error, "testSend")');
    expect(detailPanel).not.toContain('getUserFriendlyMessage(normalizeError(error))');

    expect(wizard).toContain('formatCommunicationCampaignMutationError(error, "populate")');
    expect(wizard).toContain('formatCommunicationCampaignMutationError(error, "send")');
    expect(wizard).toContain('isEditMode ? "update" : "create"');
    expect(wizard).not.toContain('getUserFriendlyMessage(error as Error)');
  });

  it('keeps communications inbox actions on communications-owned formatters', () => {
    const hook = read('src/hooks/communications/use-inbox-actions.ts');

    expect(hook).toContain('formatCommunicationInboxMutationError(error, "markRead")');
    expect(hook).toContain('formatCommunicationInboxMutationError(error, "markAllRead")');
    expect(hook).toContain('formatCommunicationInboxMutationError(error, "toggleStarred")');
    expect(hook).toContain('formatCommunicationInboxMutationError(error, "archive")');
    expect(hook).toContain('formatCommunicationInboxMutationError(error, "delete")');
    expect(hook).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(hook).not.toContain('toast.error("Failed to mark email as read"');
    expect(hook).not.toContain('toast.error("Failed to mark emails as read"');
    expect(hook).not.toContain('toast.error("Failed to update starred status"');
    expect(hook).not.toContain('toast.error("Failed to archive email"');
    expect(hook).not.toContain('toast.error("Failed to delete email"');
  });

  it('keeps communications inbox account actions on communications-owned formatters', () => {
    const hook = read('src/hooks/communications/use-inbox-email-accounts.ts');
    const settings = read(
      'src/components/domain/communications/inbox/inbox-email-accounts-settings.tsx'
    );
    const callback = read(
      'src/routes/_authenticated/communications/settings/inbox-accounts_.callback.tsx'
    );

    expect(hook).toContain('formatCommunicationInboxAccountMutationError(error, "connect")');
    expect(hook).toContain('formatCommunicationInboxAccountMutationError(error, "sync")');
    expect(settings).toContain('formatCommunicationInboxAccountMutationError(error, "delete")');
    expect(callback).toContain('formatCommunicationInboxAccountMutationError(');
    expect(callback).toContain('"providerCallback"');
    expect(callback).toContain('"callback"');
    expect(callback).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(settings).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(hook).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(callback).not.toContain('description: search.error_description');
    expect(callback).not.toContain('error_description: error.message');
    expect(hook).not.toContain("toast.error('Failed to connect email account'");
    expect(hook).not.toContain("toast.error('Sync failed'");
    expect(settings).not.toContain('toast.error("Disconnect Failed"');
  });

  it('keeps communications scheduled email mutations on communications-owned formatters', () => {
    const page = read('src/routes/_authenticated/communications/emails/scheduled-emails-page.tsx');
    const dialog = read('src/components/domain/communications/emails/schedule-email-dialog.tsx');

    expect(page).toContain('formatCommunicationScheduledEmailMutationError(error, "cancel")');
    expect(dialog).toContain('formatCommunicationScheduledEmailMutationError(');
    expect(dialog).toContain('isEditing ? "update" : "schedule"');
    expect(page).not.toContain('error instanceof Error ? error.message : "Failed to cancel email"');
    expect(dialog).not.toContain('setSubmitError(getUserFriendlyMessage(error as Error))');
  });

  it('keeps communications scheduled call mutations on communications-owned formatters', () => {
    const page = read('src/routes/_authenticated/communications/calls/calls-page.tsx');
    const scheduleDialog = read(
      'src/components/domain/communications/calls/schedule-call-dialog.tsx'
    );
    const outcomeDialog = read(
      'src/components/domain/communications/calls/call-outcome-dialog.tsx'
    );
    const actionMenu = read(
      'src/components/domain/communications/calls/scheduled-call-action-menu.tsx'
    );

    expect(page).toContain('formatCommunicationScheduledCallMutationError(error, "complete")');
    expect(page).toContain('formatCommunicationScheduledCallMutationError(error, "cancel")');
    expect(page).toContain('formatCommunicationScheduledCallMutationError(error, "reschedule")');
    expect(scheduleDialog).toContain(
      'formatCommunicationScheduledCallMutationError(error, "schedule")'
    );
    expect(scheduleDialog).toContain(
      'formatCommunicationScheduledCallMutationError(scheduleMutation.error, "schedule")'
    );
    expect(outcomeDialog).toContain(
      'formatCommunicationScheduledCallMutationError(error, "outcome")'
    );
    expect(outcomeDialog).toContain(
      'formatCommunicationScheduledCallMutationError(completeMutation.error, "outcome")'
    );
    expect(actionMenu).toContain('formatCommunicationScheduledCallMutationError(error, "snooze")');
    expect(actionMenu).toContain('formatCommunicationScheduledCallMutationError(error, "cancel")');
    expect(scheduleDialog).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(scheduleDialog).not.toContain('submitError={scheduleMutation.error?.message ?? null}');
    expect(outcomeDialog).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(outcomeDialog).not.toContain('submitError={completeMutation.error?.message ?? null}');
    expect(actionMenu).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(page).not.toContain('toastError("Failed to complete call")');
    expect(page).not.toContain('toastError("Failed to cancel call")');
    expect(page).not.toContain('toastError("Failed to reschedule call")');
  });

  it('keeps communications signature mutations on communications-owned formatters', () => {
    const page = read('src/routes/_authenticated/communications/signatures/signatures-page.tsx');
    const editor = read('src/components/domain/communications/signatures/signature-editor.tsx');

    expect(editor).toContain('formatCommunicationSignatureMutationError(error, "update")');
    expect(editor).toContain('formatCommunicationSignatureMutationError(error, "create")');
    expect(page).toContain('formatCommunicationSignatureMutationError(error, "delete")');
    expect(page).toContain('formatCommunicationSignatureMutationError(error, "setDefault")');
    expect(editor).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(editor).not.toContain('toast.error("Failed to update signature"');
    expect(page).not.toContain('toastError("Failed to delete signature")');
    expect(page).not.toContain('toastError("Failed to set default signature")');
  });

  it('keeps communications suppression mutations on communications-owned formatters', () => {
    const addDialog = read(
      'src/components/domain/communications/settings/add-suppression-dialog.tsx'
    );
    const table = read(
      'src/components/domain/communications/settings/suppression-list-table.tsx'
    );

    expect(addDialog).toContain('formatCommunicationSuppressionMutationError(error, "add")');
    expect(addDialog).toContain(
      'formatCommunicationSuppressionMutationError(addMutation.error, "add")'
    );
    expect(table).toContain('formatCommunicationSuppressionMutationError(err, "remove")');
    expect(addDialog).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(addDialog).not.toContain('submitError={addMutation.error?.message ?? null}');
    expect(addDialog).not.toContain('toast.error("Failed to add to suppression list"');
    expect(table).not.toContain('getUserFriendlyMessage(err as Error)');
    expect(table).not.toContain('toast.error("Failed to remove from suppression list"');
  });

  it('keeps communications quick log mutations on communications-owned formatters', () => {
    const dialog = read('src/components/domain/communications/quick-log-dialog.tsx');

    expect(dialog).toContain('formatCommunicationQuickLogMutationError(error, "create")');
    expect(dialog).toContain('formatCommunicationQuickLogMutationError(retryError, "create")');
    expect(dialog).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(dialog).not.toContain("toast.error('Failed to save log'");
    expect(dialog).not.toContain('description: getUserFriendlyMessage');
  });

  it('keeps communication preference mutations on communications-owned formatters', () => {
    const preferences = read(
      'src/components/domain/communications/communication-preferences.tsx'
    );

    expect(preferences).toContain(
      'formatCommunicationPreferenceMutationError(error, "update")'
    );
    expect(preferences).toContain(
      'formatCommunicationPreferenceMutationError(updateMutation.error, "update")'
    );
    expect(preferences).not.toContain('getUserFriendlyMessage(error as Error)');
    expect(preferences).not.toContain('toast.error("Failed to update preferences"');
    expect(preferences).not.toContain('submitError={updateMutation.error?.message ?? null}');
  });

  it('formats campaign bulk action failure items before summarizing them', async () => {
    const result = await executeBulkAction({
      items: ['campaign-1'],
      getId: (id) => id,
      getLabel: () => 'Autumn dealer follow-up',
      run: async () => {
        throw new Error('duplicate key value violates unique constraint campaign_recipients_pkey');
      },
      formatError: (error) => formatCommunicationCampaignMutationError(error, 'pause'),
    });

    expect(result.failed).toEqual([
      {
        id: 'campaign-1',
        label: 'Autumn dealer follow-up',
        message: 'Unable to pause communication campaign.',
      },
    ]);
  });
});
