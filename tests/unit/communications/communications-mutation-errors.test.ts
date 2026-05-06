import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatCommunicationCampaignMutationError,
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

  it('keeps communications campaign route actions on communications-owned formatters', () => {
    const route = read('src/routes/_authenticated/communications/campaigns/campaigns-page.tsx');

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
