import { describe, expect, it } from 'vitest';

import { presentActivity } from '@/lib/activities/present-activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

function makeActivity(overrides: Partial<UnifiedActivity>): UnifiedActivity {
  return {
    id: 'activity-1',
    source: 'audit',
    entityType: 'order',
    entityId: '64f93295-5ed4-4ca2-9717-735039132698',
    type: 'note_added',
    description: 'Legacy description',
    userId: 'user-1',
    userName: 'Admin',
    createdAt: '2026-04-10T01:00:00.000Z',
    isCompleted: true,
    isOverdue: false,
    ...overrides,
  };
}

describe('presentActivity', () => {
  it('presents structured note activities with a note title and full-note disclosure', () => {
    const presented = presentActivity(
      makeActivity({
        metadata: {
          fullNotes: 'Configured standby timeout to 1440 minutes.\nCustomer approved the change.',
          contentPreview: 'Configured standby timeout to 1440 minutes.',
          logType: 'decision',
          noteImportance: 'important',
          customFields: {
            noteTitle: 'Battery configuration updated',
            noteImportance: 'important',
          },
        },
      })
    );

    expect(presented.title).toBe('Battery configuration updated');
    expect(presented.summary).toContain('Configured standby timeout');
    expect(presented.factChips.some((chip) => chip.value === 'Decision')).toBe(true);
    expect(presented.detailSections[0]).toMatchObject({
      type: 'note',
      label: 'Full note',
    });
  });

  it('presents document generation activities as named exports with file facts', () => {
    const presented = presentActivity(
      makeActivity({
        type: 'exported',
        description: 'Generated invoice PDF',
        metadata: {
          documentType: 'invoice',
          filename: 'invoice-ORD-20260407-0001-2026-04-08.pdf',
          fileSize: 23337,
          isRegeneration: false,
        },
      })
    );

    expect(presented.title).toBe('Invoice generated');
    expect(presented.summary).toBe('invoice-ORD-20260407-0001-2026-04-08.pdf');
    expect(presented.factChips.some((chip) => chip.value.includes('KB'))).toBe(true);
    expect(presented.detailSections[0]).toMatchObject({
      type: 'facts',
      label: 'Document details',
    });
  });

  it('derives a human status-change summary from before/after values', () => {
    const presented = presentActivity(
      makeActivity({
        type: 'updated',
        description: 'Order updated',
        changes: {
          fields: ['status'],
          before: { status: 'draft' },
          after: { status: 'picked' },
        },
      })
    );

    expect(presented.title).toBe('Status changed');
    expect(presented.summary).toBe('draft -> picked');
    expect(presented.detailSections[0]).toMatchObject({
      type: 'list',
      label: 'Changes',
    });
  });

  it('falls back cleanly for legacy activities with only a description', () => {
    const presented = presentActivity(
      makeActivity({
        type: 'legacy_event',
        description: 'Legacy activity with no structured metadata',
        metadata: null,
      })
    );

    expect(presented.title).toBe('Legacy activity with no structured metadata');
    expect(presented.summary).toBe('Legacy activity with no structured metadata');
  });
});
