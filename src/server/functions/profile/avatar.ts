/**
 * Avatar Upload Functions
 *
 * Server functions for handling user avatar uploads.
 * Follows Drizzle ORM patterns - no raw SQL, proper error classes.
 *
 * @lastReviewed 2026-02-10
 * @see src/hooks/profile/use-avatar-upload.ts
 * @see .claude/skills/drizzle-orm/SKILL.md
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/server/protected";
import { createClient } from "@/lib/supabase/server";
import {
  isOurStorageUrl,
  extractStoragePathFromPublicUrl,
} from "@/lib/storage/storage-url-utils";
import { extractAvatarUrl } from "@/lib/users";
import { ServerError, NotFoundError } from "@/lib/server/errors";
import { createActivityLoggerWithContext } from "@/server/middleware/activity-context";
import { completeOnboardingStep } from "@/server/functions/users/onboarding";
import { authLogger } from "@/lib/logger";

const uploadAvatarSchema = z.object({
  filename: z.string(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().max(2 * 1024 * 1024), // 2MB max
});

const confirmAvatarSchema = z.object({
  avatarUrl: z.string().url(),
});

/**
 * Get a presigned upload URL for avatar.
 *
 * @param data.filename - Original filename
 * @param data.mimeType - MIME type (image/jpeg, image/png, image/webp)
 * @param data.sizeBytes - File size in bytes (max 2MB)
 * @returns Upload token, storage path, and public URL
 */
export const getAvatarUploadUrl = createServerFn({ method: "POST" })
  .inputValidator(uploadAvatarSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const supabase = await createClient();

    // Generate a unique path for the avatar
    const fileExt = data.filename.split(".").pop() || "jpg";
    const storagePath = `avatars/${ctx.user.id}-${Date.now()}.${fileExt}`;

    // Get presigned URL (30 seconds expiration for avatar uploads)
    const { data: uploadData, error } = await supabase.storage
      .from("public")
      .createSignedUploadUrl(storagePath);

    if (error) {
      throw new ServerError(`Failed to create upload URL: ${error.message}`, 500, 'UPLOAD_URL_ERROR');
    }

    // Return both the upload token and the public URL path
    const {
      data: { publicUrl },
    } = supabase.storage.from("public").getPublicUrl(storagePath);

    return {
      token: uploadData.token,
      path: storagePath,
      publicUrl,
    };
  });

/**
 * Upload avatar file to Supabase Storage and update user profile.
 * Handles the entire upload flow server-side for security.
 *
 * Uses object merge pattern for JSONB updates (no raw SQL).
 * Follows pattern from users.ts:280-285.
 *
 * @param data.base64Content - Base64-encoded file content
 * @param data.filename - Original filename
 * @param data.mimeType - MIME type (image/jpeg, image/png, image/webp)
 * @param data.sizeBytes - File size in bytes (max 2MB)
 * @returns Updated avatar URL and public URL
 */
const uploadAvatarFileSchema = z.object({
  /** Base64-encoded file content */
  base64Content: z.string(),
  filename: z.string(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().max(2 * 1024 * 1024), // 2MB max
});

export const uploadAvatarFile = createServerFn({ method: "POST" })
  .inputValidator(uploadAvatarFileSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const supabase = await createClient();

    // Generate a unique path for the avatar
    const fileExt = data.filename.split(".").pop() || "jpg";
    const storagePath = `avatars/${ctx.user.id}-${Date.now()}.${fileExt}`;

    // Decode base64 to ArrayBuffer
    // Use Buffer in Node.js environment, atob in browser
    let binaryString: string;
    if (typeof Buffer !== 'undefined') {
      binaryString = Buffer.from(data.base64Content, 'base64').toString('binary');
    } else {
      // Browser environment - atob is available on globalThis
      const atobFn = globalThis.atob;
      if (typeof atobFn !== 'function') {
        throw new ServerError('atob is not available in this environment', 500, 'ENVIRONMENT_ERROR');
      }
      binaryString = atobFn(data.base64Content);
    }
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("public")
      .upload(storagePath, bytes.buffer, {
        contentType: data.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new ServerError(`Failed to upload avatar: ${uploadError.message}`, 500, 'UPLOAD_ERROR');
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("public").getPublicUrl(storagePath);

    // Fetch existing user to merge profile JSONB (following pattern from users.ts:280-285)
    const [existingUser] = await db
      .select({ profile: users.profile })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!existingUser) {
      throw new NotFoundError('User not found', 'user');
    }

    // Update the avatarUrl in the profile JSONB field using object merge pattern (no raw SQL)
    const [user] = await db
      .update(users)
      .set({
        profile: {
          ...(existingUser.profile || {}),
          avatarUrl: publicUrl,
        },
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(users.id, ctx.user.id))
      .returning({
        profile: users.profile,
      });

    if (!user) {
      throw new NotFoundError('User not found', 'user');
    }

    // Log activity for avatar upload
    const logger = createActivityLoggerWithContext(ctx);
    await logger.log({
      entityType: 'user',
      entityId: ctx.user.id,
      action: 'updated',
      changes: {
        before: {
          avatarUrl: extractAvatarUrl(existingUser.profile) || null,
        },
        after: {
          avatarUrl: extractAvatarUrl(user.profile) || null,
        },
        fields: ['avatarUrl'],
      },
      description: 'Avatar uploaded',
    });

    // Check if profile is now complete enough for onboarding step
    const { calculateProfileCompleteness } = await import('@/lib/users/profile-helpers');
    const [userForCompleteness] = await db
      .select({ name: users.name, profile: users.profile })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (userForCompleteness) {
      const completeness = calculateProfileCompleteness({
        name: userForCompleteness.name,
        profile: userForCompleteness.profile,
      });

      // Mark onboarding step complete if profile is 70%+ complete
      if (completeness.isComplete) {
        try {
          await completeOnboardingStep({ data: { stepKey: 'profile_complete' } });
        } catch (error) {
          // Don't fail the upload if onboarding step completion fails
          authLogger.error('[uploadAvatarFile] Failed to mark onboarding step complete', error);
        }
      }
    }

    return {
      avatarUrl: extractAvatarUrl(user.profile),
      publicUrl,
    };
  });

/**
 * Update user's avatar URL after successful upload.
 * Stores the avatar URL in the profile JSONB field.
 * 
 * @deprecated Use uploadAvatarFile instead for server-side upload
 */
export const confirmAvatarUpload = createServerFn({ method: "POST" })
  .inputValidator(confirmAvatarSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Fetch existing user to merge profile JSONB (following pattern from users.ts:280-285)
    const [existingUser] = await db
      .select({ profile: users.profile })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!existingUser) {
      throw new NotFoundError('User not found', 'user');
    }

    // Update the avatarUrl in the profile JSONB field using object merge pattern (no raw SQL)
    const [user] = await db
      .update(users)
      .set({
        profile: {
          ...(existingUser.profile || {}),
          avatarUrl: data.avatarUrl,
        },
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(users.id, ctx.user.id))
      .returning({
        profile: users.profile,
      });

    if (!user) {
      throw new NotFoundError('User not found', 'user');
    }

    // Log activity for avatar confirmation
    const logger = createActivityLoggerWithContext(ctx);
    await logger.log({
      entityType: 'user',
      entityId: ctx.user.id,
      action: 'updated',
      changes: {
        before: {
          avatarUrl: extractAvatarUrl(existingUser.profile) || null,
        },
        after: {
          avatarUrl: extractAvatarUrl(user.profile) || null,
        },
        fields: ['avatarUrl'],
      },
      description: 'Avatar confirmed',
    });

    return {
      avatarUrl: extractAvatarUrl(user.profile),
      publicUrl: data.avatarUrl,
    };
  });

/**
 * Remove user's avatar (delete from storage and clear from profile).
 * 
 * @returns Success status
 */
export const removeAvatar = createServerFn({ method: "POST" })
  .handler(async () => {
    const ctx = await withAuth();
    const supabase = await createClient();

    // Fetch existing user to get current avatar URL
    const [existingUser] = await db
      .select({ profile: users.profile })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!existingUser) {
      throw new NotFoundError('User not found', 'user');
    }

    const currentAvatarUrl = extractAvatarUrl(existingUser.profile);

    // Delete file from Supabase Storage if it exists (only for our storage URLs)
    if (currentAvatarUrl && isOurStorageUrl(currentAvatarUrl)) {
      try {
        const storagePath = extractStoragePathFromPublicUrl(currentAvatarUrl, "public");
        if (storagePath) {
          const { error: deleteError } = await supabase.storage
            .from("public")
            .remove([storagePath]);

          if (deleteError) {
            // Log error but continue - file might already be deleted
            authLogger.error('[removeAvatar] Failed to delete file from storage', deleteError);
          }
        }
      } catch (error) {
        // Log error but continue - clearing profile field is more important
        authLogger.error('[removeAvatar] Error deleting file', error);
      }
    }

    // Clear avatarUrl from profile JSONB
    const profileUpdate: Record<string, unknown> = {};
    if (existingUser.profile && typeof existingUser.profile === "object") {
      Object.assign(profileUpdate, existingUser.profile);
    }
    delete profileUpdate.avatarUrl;

    const [user] = await db
      .update(users)
      .set({
        profile: profileUpdate,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(users.id, ctx.user.id))
      .returning({
        profile: users.profile,
      });

    if (!user) {
      throw new NotFoundError('User not found', 'user');
    }

    // Log activity for avatar removal
    const logger = createActivityLoggerWithContext(ctx);
    await logger.log({
      entityType: 'user',
      entityId: ctx.user.id,
      action: 'updated',
      changes: {
        before: {
          avatarUrl: currentAvatarUrl || null,
        },
        after: {
          avatarUrl: null,
        },
        fields: ['avatarUrl'],
      },
      description: 'Avatar removed',
    });

    return { success: true };
  });
