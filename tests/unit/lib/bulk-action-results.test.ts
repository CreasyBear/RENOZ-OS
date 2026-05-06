import { describe, expect, it } from 'vitest';
import {
  BULK_ACTION_FAILURE_MESSAGE,
  executeBulkAction,
  formatBulkActionFailureMessage,
  summarizeBulkFailures,
} from '@/lib/actions/bulk-action-results';

describe('bulk action result feedback', () => {
  it('suppresses unsafe default failure messages', () => {
    expect(
      formatBulkActionFailureMessage(
        new Error('duplicate key value violates unique constraint bulk_actions_pkey')
      )
    ).toBe(BULK_ACTION_FAILURE_MESSAGE);

    expect(
      formatBulkActionFailureMessage({
        message: 'TypeError: Cannot read properties of undefined (reading id)',
      })
    ).toBe(BULK_ACTION_FAILURE_MESSAGE);
  });

  it('keeps safe default validation messages when no domain formatter is supplied', () => {
    expect(formatBulkActionFailureMessage('Status must be active before updating.')).toBe(
      'Status must be active before updating.'
    );

    expect(formatBulkActionFailureMessage({ error: 'Item is already archived.' })).toBe(
      'Item is already archived.'
    );
  });

  it('uses safe default feedback for unformatted rejected bulk actions', async () => {
    const result = await executeBulkAction({
      items: [{ id: 'row-1', label: 'Row 1' }],
      getId: (item) => item.id,
      getLabel: (item) => item.label,
      run: async () => {
        throw new Error('postgres duplicate key violates bulk_action_rows_key');
      },
    });

    expect(result.failed).toEqual([
      {
        id: 'row-1',
        label: 'Row 1',
        message: BULK_ACTION_FAILURE_MESSAGE,
      },
    ]);

    expect(summarizeBulkFailures(result.failed)).toBe(
      `Row 1: ${BULK_ACTION_FAILURE_MESSAGE}`
    );
  });

  it('preserves caller-owned formatters for domain-specific copy', async () => {
    const result = await executeBulkAction({
      items: ['campaign-1'],
      getId: (id) => id,
      getLabel: () => 'Autumn dealer follow-up',
      run: async () => {
        throw new Error('duplicate key value violates unique constraint campaign_recipients_pkey');
      },
      formatError: () => 'Unable to pause communication campaign.',
    });

    expect(result.failed[0]?.message).toBe('Unable to pause communication campaign.');
  });
});
