import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getNotificationReadErrorMessage,
  NOTIFICATIONS_CACHED_READ_FALLBACK_MESSAGE,
  NOTIFICATIONS_READ_FALLBACK_MESSAGE,
} from '@/components/domain/notifications/notification-read-error-messages';
import { formatNotificationMutationError } from '@/hooks/notifications/_mutation-errors';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('notification feedback contract', () => {
  it('formats notification read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from notifications violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: NOTIFICATIONS_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getNotificationReadErrorMessage(normalized)).toBe(
      NOTIFICATIONS_READ_FALLBACK_MESSAGE
    );
    expect(
      getNotificationReadErrorMessage(normalized, { hasCachedNotifications: true })
    ).toBe(NOTIFICATIONS_CACHED_READ_FALLBACK_MESSAGE);
    expect(
      getNotificationReadErrorMessage(
        new Error('duplicate key violates notifications_org_user_idx postgres stack'),
        { hasCachedNotifications: true }
      )
    ).toBe(NOTIFICATIONS_CACHED_READ_FALLBACK_MESSAGE);
  });

  it('formats mark-read mutation failures without leaking unsafe internals', () => {
    expect(
      formatNotificationMutationError(
        new Error('duplicate key violates notifications_org_user_idx postgres stack'),
        'markRead'
      )
    ).toBe(
      'Marking notification as read is temporarily unavailable. Please refresh and try again.'
    );

    expect(
      formatNotificationMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw RLS detail' },
        'markRead'
      )
    ).toBe('You do not have permission to manage notifications.');

    expect(
      formatNotificationMutationError(
        { statusCode: 404, code: 'NOT_FOUND', message: 'raw missing notification id' },
        'markRead'
      )
    ).toBe('The notification could not be found. Refresh and try again.');
  });

  it('keeps notification read warnings and mutation toasts behind formatters', () => {
    const popover = read(
      'src/components/domain/notifications/notification-center-popover.tsx'
    );
    const hook = read('src/hooks/notifications/use-notifications.ts');
    const index = read('src/hooks/notifications/index.ts');

    expect(popover).toContain(
      "import { getNotificationReadErrorMessage } from './notification-read-error-messages';"
    );
    expect(popover).toContain('getNotificationReadErrorMessage(error, {');
    expect(popover).not.toContain("error.message || 'Notifications are temporarily unavailable");

    expect(hook).toContain("toast.error(formatNotificationMutationError(error, 'markRead'))");
    expect(hook).not.toContain("toast.error(error.message || 'Failed to mark notification as read')");
    expect(index).toContain('formatNotificationMutationError');
  });
});
