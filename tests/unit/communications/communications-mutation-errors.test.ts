import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatCommunicationCampaignMutationError,
  formatCommunicationTemplateMutationError,
} from '@/hooks/communications/_mutation-errors';

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
});
