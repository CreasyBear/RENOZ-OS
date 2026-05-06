import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatUserMutationError } from '@/hooks/users/user-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('profile mutation feedback', () => {
  it('keeps safe local validation copy and suppresses unsafe profile infrastructure messages', () => {
    expect(
      formatUserMutationError(
        new Error('Invalid file type. Please upload JPEG, PNG, or WebP.'),
        'updateAvatar'
      )
    ).toBe('Invalid file type. Please upload JPEG, PNG, or WebP.');

    expect(
      formatUserMutationError(
        new Error('supabase storage token stack trace while uploading avatar'),
        'updateAvatar'
      )
    ).toBe('Avatar update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatUserMutationError(
        {
          statusCode: 400,
          message: 'TypeError: Cannot read properties of undefined (reading preferenceKey)',
        },
        'updateNotificationPreference'
      )
    ).toBe('Notification preference update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatUserMutationError(
        {
          statusCode: 400,
          errors: {
            profile: ['SQL syntax error at or near "user_profiles"'],
          },
        },
        'updateProfile'
      )
    ).toBe('Profile update is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps profile hooks and page behind user-owned feedback helpers', () => {
    const profileHook = read('src/hooks/profile/use-profile.ts');
    const avatarHook = read('src/hooks/profile/use-avatar-upload.ts');
    const preferenceHook = read('src/hooks/profile/use-notification-preferences.ts');
    const profilePage = read('src/routes/_authenticated/-profile-page.tsx');
    const notificationForm = read('src/components/domain/users/notification-preferences-form.tsx');

    expect(profileHook).toContain('formatUserMutationError(error, "updateProfile")');
    expect(profileHook).not.toContain('error.message || "Failed to update profile"');

    expect(avatarHook).toContain('formatUserMutationError(error, "updateAvatar")');
    expect(avatarHook).toContain('formatUserMutationError(error, "removeAvatar")');
    expect(avatarHook).not.toContain('error.message || "Failed to update avatar"');
    expect(avatarHook).not.toContain('error.message || "Failed to remove avatar"');

    expect(preferenceHook).toContain(
      'formatUserMutationError(error, "updateNotificationPreference")'
    );
    expect(preferenceHook).toContain(
      'formatUserMutationError(error, "updateNotificationPreferences")'
    );
    expect(preferenceHook).not.toContain('error.message || "Failed to update preference"');
    expect(preferenceHook).not.toContain('error.message || "Failed to update preferences"');

    expect(profilePage).toContain('formatUserMutationError(err, "updateProfile")');
    expect(profilePage).toContain('Profile is temporarily unavailable. Please refresh and try again.');
    expect(profilePage).not.toContain('err instanceof Error ? err.message : "Unknown error"');
    expect(profilePage).not.toContain('error?.message || "Failed to load profile. Please try again."');

    expect(notificationForm).toContain(
      'Notification preferences are temporarily unavailable. Please refresh and try again.'
    );
    expect(notificationForm).not.toContain('error={error instanceof Error ? error.message : null}');
  });
});
