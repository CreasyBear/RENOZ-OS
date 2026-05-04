import { describe, expect, it, vi } from 'vitest';

import {
  buildActivityExportCsv,
  buildFilterSummary,
  formatActivityExportFilename,
} from '@/server/functions/activities/export-utils';

describe('activity export utils', () => {
  it('serializes CSV rows with metadata and changes safely', () => {
    const csv = buildActivityExportCsv([
      {
        id: 'activity-1',
        organizationId: 'org-1',
        userId: 'user-1',
        entityType: 'customer',
        entityId: 'customer-1',
        entityName: 'Acme Solar',
        action: 'updated',
        changes: { fields: ['status'], after: { status: 'active' } },
        metadata: { customFields: { source: 'csv' } },
        ipAddress: null,
        userAgent: null,
        description: 'Customer updated',
        source: 'manual',
        sourceRef: null,
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        createdBy: 'user-1',
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      },
    ]);

    expect(csv).toContain('"Acme Solar"');
    expect(csv).toContain('""status"":""active""');
    expect(csv).toContain('""source"":""csv""');
  });

  it('exports structured notes using the preview body instead of the note title', () => {
    const csv = buildActivityExportCsv([
      {
        id: 'activity-note-1',
        organizationId: 'org-1',
        userId: 'user-1',
        entityType: 'customer',
        entityId: 'customer-1',
        entityName: 'Acme Solar',
        action: 'note_added',
        changes: null,
        metadata: {
          noteTitle: 'Battery configuration updated',
          contentPreview: 'Configured standby timeout to 1440 minutes.',
          fullNotes: 'Configured standby timeout to 1440 minutes.\nCustomer approved the change.',
        },
        ipAddress: null,
        userAgent: null,
        description: 'Configured standby timeout to 1440 minutes.',
        source: 'manual',
        sourceRef: null,
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        createdBy: 'user-1',
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      },
    ]);

    expect(csv).toContain('"Configured standby timeout to 1440 minutes."');
    expect(csv).toContain('"Battery configuration updated"');
  });

  it('builds a human-readable filter summary', () => {
    expect(
      buildFilterSummary({
        entityType: 'customer',
        entityId: 'customer-1',
        action: 'updated',
        dateFrom: new Date('2026-03-01T00:00:00.000Z'),
      })
    ).toEqual([
      'Entity type: customer',
      'Entity ID: customer-1',
      'Action: updated',
      'Date from: 2026-03-01',
    ]);
  });

  it('falls back to a no-filters label when no filters are applied', () => {
    expect(buildFilterSummary({})).toEqual(['No filters applied']);
  });

  it('formats filenames by date and format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T12:00:00.000Z'));

    expect(formatActivityExportFilename('pdf')).toBe('activity-export-2026-03-16.pdf');

    vi.useRealTimers();
  });
});
