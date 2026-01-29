/**
 * Avatar Upload Functions
 *
 * Server functions for handling user avatar uploads.
 *
 * @see src/hooks/profile/use-avatar-upload.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { withAuth } from "@/lib/server/protected";
import { createClient } from "@/lib/supabase/server";

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
      throw new Error(`Failed to create upload URL: ${error.message}`);
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
 * Update user's avatar URL after successful upload.
 * Stores the avatar URL in the profile JSONB field.
 */
export const confirmAvatarUpload = createServerFn({ method: "POST" })
  .inputValidator(confirmAvatarSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Update the avatarUrl in the profile JSONB field
    const [user] = await db
      .update(users)
      .set({
        profile: sql`jsonb_set(COALESCE(profile, '{}'), '{avatarUrl}', ${JSON.stringify(data.avatarUrl)})`,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(users.id, ctx.user.id))
      .returning({
        profile: users.profile,
      });

    if (!user) {
      throw new Error("Failed to update avatar");
    }

    return {
      avatarUrl: (user.profile as { avatarUrl?: string })?.avatarUrl,
    };
  });
