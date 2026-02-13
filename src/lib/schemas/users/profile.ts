/**
 * Profile Component Types
 *
 * Type definitions for profile-related UI components.
 * These types are used across multiple components and should be centralized here.
 *
 * @lastReviewed 2026-02-10
 * @see SCHEMA-TRACE.md for type flow patterns
 */

import type { UserWithGroups } from './users';
import type { UserProfile } from '@/lib/schemas/auth/auth';

// Re-export profile form schema for convenience
export type { ProfileFormData } from './profile-form-schema';
export { profileFormSchema } from './profile-form-schema';

// ============================================================================
// PROFILE FORM
// ============================================================================

/**
 * Profile update payload
 * Uses proper UserProfile type with flexibility for additional JSONB fields
 * Note: Some fields like timezone/language may be stored but aren't in canonical schema
 */
export interface ProfileUpdateData {
  name?: string;
  profile?: Partial<UserProfile> & Record<string, unknown>;
}

export interface ProfileFormProps {
  /** @source useUser hook in profile.tsx */
  user: UserWithGroups;
  /** @source useAuth hook in profile.tsx */
  currentUser: { email?: string } | null;
  /** @source useUpdateUser mutation in profile.tsx */
  onUpdate: (data: ProfileUpdateData) => Promise<void>;
  /** @source useUpdateUser mutation state in profile.tsx */
  isUpdating: boolean;
}

// ============================================================================
// AVATAR UPLOAD
// ============================================================================

export interface AvatarUploadProps {
  name: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

export interface AvatarUploadPresenterProps {
  name: string | null;
  avatarUrl?: string | null;
  preview: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  isDragging: boolean;
  isUploading: boolean;
  isSuccess: boolean;
  isRemoving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onClick: () => void;
  onCancel: () => void;
  onRemove?: () => void;
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

// Note: NotificationPreferences interface is defined in use-notification-preferences.ts hook
// This presenter props type references it but doesn't duplicate it
export interface NotificationPreferencesFormPresenterProps {
  preferences: {
    email: boolean;
    push: boolean;
    digestFrequency: "daily" | "weekly" | "realtime";
    orderUpdates: boolean;
    customerMessages: boolean;
    inventoryAlerts: boolean;
    taskReminders: boolean;
    mentions: boolean;
    systemAnnouncements: boolean;
  };
  isLoading: boolean;
  isPending: boolean;
  onToggle: (key: keyof NotificationPreferencesFormPresenterProps["preferences"]) => void;
  onDigestChange: (value: "daily" | "weekly" | "realtime") => void;
}
