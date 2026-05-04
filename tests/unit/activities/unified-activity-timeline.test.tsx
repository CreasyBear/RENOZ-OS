import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UnifiedActivityTimeline } from '@/components/shared/activity/unified-activity-timeline';
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

describe('UnifiedActivityTimeline', () => {
  it('renders note and document events as operational history instead of metadata cards', () => {
    render(
      <UnifiedActivityTimeline
        activities={[
          makeActivity({
            metadata: {
              fullNotes: 'Configured standby timeout to 1440 minutes.',
              contentPreview: 'Configured standby timeout to 1440 minutes.',
              customFields: { noteTitle: 'Battery configuration updated' },
            },
          }),
          makeActivity({
            id: 'activity-2',
            type: 'exported',
            description: 'Generated invoice PDF',
            metadata: {
              documentType: 'invoice',
              filename: 'invoice-ORD-20260407-0001-2026-04-08.pdf',
              fileSize: 23337,
              isRegeneration: false,
            },
          }),
        ]}
        showFilters={false}
        asCard={false}
      />
    );

    expect(screen.getByText('Battery configuration updated')).toBeTruthy();
    expect(screen.getByText('Invoice generated')).toBeTruthy();
    expect(screen.queryByText('FULL NOTES')).toBeNull();
    expect(screen.queryByText('FILE SIZE')).toBeNull();
  });

  it('reveals detailed note content behind a disclosure instead of showing it inline by default', () => {
    render(
      <UnifiedActivityTimeline
        activities={[
          makeActivity({
            metadata: {
              fullNotes: 'Configured standby timeout to 1440 minutes.\nCustomer approved the installation plan.',
              contentPreview: 'Configured standby timeout to 1440 minutes.',
              customFields: { noteTitle: 'Battery configuration updated' },
            },
          }),
        ]}
        showFilters={false}
        asCard={false}
      />
    );

    expect(screen.queryByText('Full note')).toBeNull();
    expect(screen.getByText('Configured standby timeout to 1440 minutes.')).toBeTruthy();
    expect(screen.queryByText(/Customer approved the installation plan/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));

    expect(screen.getByText('Full note')).toBeTruthy();
    expect(screen.getByText(/Customer approved the installation plan/)).toBeTruthy();
  });

  it('preserves grouped timeline rendering with the new item layout', () => {
    render(
      <UnifiedActivityTimeline
        activities={[
          makeActivity({
            id: 'activity-today',
            createdAt: new Date().toISOString(),
            description: 'Today activity',
          }),
          makeActivity({
            id: 'activity-yesterday',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            description: 'Yesterday activity',
          }),
        ]}
        showFilters={false}
        asCard={false}
        groupByDate
      />
    );

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
    expect(screen.getByText('Today activity')).toBeTruthy();
    expect(screen.getByText('Yesterday activity')).toBeTruthy();
  });
});
