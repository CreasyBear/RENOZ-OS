/**
 * Users Domain Components
 *
 * Barrel export for user-related UI components.
 */

export { ProfileForm } from './profile-form';
export { AvatarUpload } from './avatar-upload';
export { NotificationPreferencesForm } from './notification-preferences-form';
export { ProfileErrorBoundary } from './profile-error-boundary';

// Re-export component prop types from schemas
export type {
  ProfileFormProps,
  AvatarUploadProps,
  AvatarUploadPresenterProps,
  NotificationPreferencesFormPresenterProps,
  UserWithGroups,
} from '@/lib/schemas/users';

export {
  UserInviteDialog,
  type UserInviteDialogProps,
} from './user-invite-dialog';
