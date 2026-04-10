import { describe, expect, it } from 'vitest';

import { readAuditNote } from '@/lib/activities/read-audit-note';

describe('readAuditNote', () => {
  it('extracts structured note presentation from audit note metadata', () => {
    const note = readAuditNote({
      action: 'note_added',
      description: 'Preview fallback',
      metadata: {
        fullNotes: 'Full note body',
        contentPreview: 'Preview body',
        noteTitle: 'Structured note title',
        noteImportance: 'important',
        logType: 'decision',
      },
    });

    expect(note).toEqual({
      title: 'Structured note title',
      preview: 'Preview body',
      fullBody: 'Full note body',
      category: 'decision',
      importance: 'important',
    });
  });

  it('falls back to legacy description when note metadata is absent', () => {
    const note = readAuditNote({
      action: 'note_added',
      description: 'Legacy note description',
      metadata: null,
    });

    expect(note).toEqual({
      title: undefined,
      preview: 'Legacy note description',
      fullBody: 'Legacy note description',
      category: undefined,
      importance: undefined,
    });
  });

  it('returns null for non-note activities', () => {
    expect(
      readAuditNote({
        action: 'updated',
        description: 'Entity updated',
        metadata: null,
      })
    ).toBeNull();
  });
});
