import { describe, expect, it } from 'vitest';

import {
  buildManualActivityLogPresentation,
} from '@/lib/activities/build-manual-activity-log';
import { logEntityActivitySchema } from '@/lib/schemas/activities';

describe('buildManualActivityLogPresentation', () => {
  it('accepts structured note payloads and preserves note metadata', () => {
    const parsed = logEntityActivitySchema.parse({
      entityType: 'order',
      entityId: '64f93295-5ed4-4ca2-9717-735039132698',
      activityType: 'note',
      description: 'Configured standby timeout to 1440 minutes.',
      title: 'Battery configuration updated',
      body: 'Configured standby timeout to 1440 minutes.\nCustomer approved the change.',
      category: 'decision',
      importance: 'important',
      isFollowUp: true,
      scheduledAt: new Date('2026-04-11T01:00:00.000Z'),
    });

    const result = buildManualActivityLogPresentation(parsed);

    expect(result.action).toBe('note_added');
    expect(result.description).toBe('Configured standby timeout to 1440 minutes.\nCustomer approved the change.');
    expect(result.metadata.fullNotes).toContain('Customer approved the change.');
    expect(result.metadata.contentPreview).toContain('Configured standby timeout');
    expect(result.metadata.logType).toBe('decision');
    expect(result.metadata.noteImportance).toBe('important');
    expect(result.metadata.customFields?.noteTitle).toBe('Battery configuration updated');
    expect(result.metadata.customFields?.noteImportance).toBe('important');
    expect(result.metadata.reason).toBe('follow_up');
    expect(result.metadata.scheduledDate).toBe('2026-04-11T01:00:00.000Z');
  });

  it('keeps legacy call logging behavior intact', () => {
    const result = buildManualActivityLogPresentation({
      activityType: 'call',
      description: 'Discussed delivery timing and install access.',
      outcome: 'Customer confirmed Friday access.',
      isFollowUp: false,
    });

    expect(result.action).toBe('call_logged');
    expect(result.description).toBe('Call: Discussed delivery timing and install access.');
    expect(result.metadata.fullNotes).toBe('Discussed delivery timing and install access.');
    expect(result.metadata.contentPreview).toBeUndefined();
    expect(result.metadata.noteTitle).toBeUndefined();
    expect(result.metadata.noteImportance).toBeUndefined();
    expect(result.metadata.notes).toBe('Customer confirmed Friday access.');
    expect(result.metadata.logType).toBe('call');
  });
});
