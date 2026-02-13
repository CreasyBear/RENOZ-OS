/**
 * Organization Logo Upload Functions
 *
 * Server functions for organization logo uploads and removal.
 * Mirrors avatar.ts pattern; storage path: organizations/{orgId}/branding/logo.{ext}
 *
 * @see src/hooks/organizations/use-organization-logo-upload.ts
 * @see avatar.ts
 */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { organizations } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import {
  isOurStorageUrl,
  extractStoragePathFromPublicUrl,
} from '@/lib/storage/storage-url-utils';
import { ServerError, NotFoundError } from '@/lib/server/errors';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import {
  isAllowedLogoMimeType,
  MAX_SIZE_BYTES,
  LOGO_ERROR_MESSAGES,
} from '@/lib/organization-logo';

const uploadOrganizationLogoFileSchema = z.object({
  base64Content: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
});

function validateLogoInput(data: { mimeType: string; sizeBytes: number }): void {
  if (!isAllowedLogoMimeType(data.mimeType)) {
    throw new ServerError(LOGO_ERROR_MESSAGES.invalidType, 400, 'INVALID_FILE_TYPE');
  }
  if (data.sizeBytes > MAX_SIZE_BYTES) {
    throw new ServerError(LOGO_ERROR_MESSAGES.fileTooLarge, 400, 'FILE_TOO_LARGE');
  }
}

/**
 * Upload organization logo file to Supabase Storage and update organizations.branding.
 *
 * - Validates PNG/JPEG only, max 2MB
 * - Deletes old logo from storage if it was ours before uploading
 * - Updates organizations.branding.logoUrl only (single source of truth)
 */
export const uploadOrganizationLogoFile = createServerFn({ method: 'POST' })
  .inputValidator(uploadOrganizationLogoFileSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });
    validateLogoInput(data);

    const supabase = await createClient();

    // Fetch current org for existing logo and branding
    const [currentOrg] = await db
      .select({ branding: organizations.branding })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    if (!currentOrg) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    const currentBranding = (currentOrg.branding as Record<string, unknown>) ?? {};
    const currentLogoUrl = currentBranding.logoUrl as string | undefined;

    // Delete old file from storage if it's ours (before uploading new one)
    if (currentLogoUrl && isOurStorageUrl(currentLogoUrl)) {
      try {
        const storagePath = extractStoragePathFromPublicUrl(currentLogoUrl, 'public');
        if (storagePath) {
          const { error: deleteError } = await supabase.storage
            .from('public')
            .remove([storagePath]);

          if (deleteError) {
            logger.error('[uploadOrganizationLogoFile] Failed to delete old logo', deleteError);
          }
        }
      } catch (error) {
        logger.error('[uploadOrganizationLogoFile] Error deleting old logo', error);
      }
    }

    const ext = data.mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const storagePath = `organizations/${ctx.organizationId}/branding/logo.${ext}`;

    // Decode base64 to ArrayBuffer
    let binaryString: string;
    if (typeof Buffer !== 'undefined') {
      binaryString = Buffer.from(data.base64Content, 'base64').toString('binary');
    } else {
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

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(storagePath, bytes.buffer, {
        contentType: data.mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new ServerError(`Failed to upload logo: ${uploadError.message}`, 500, 'UPLOAD_ERROR');
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('public').getPublicUrl(storagePath);

    const newBranding = { ...currentBranding, logoUrl: publicUrl };

    const [updated] = await db
      .update(organizations)
      .set({ branding: newBranding })
      .where(eq(organizations.id, ctx.organizationId))
      .returning({ branding: organizations.branding });

    if (!updated) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'branding.update',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: ctx.organizationId,
      oldValues: { branding: currentOrg.branding },
      newValues: { branding: updated.branding },
    });

    return {
      logoUrl: publicUrl,
      publicUrl,
    };
  });

/**
 * Remove organization logo (clear branding.logoUrl and delete from storage if ours).
 */
export const removeOrganizationLogo = createServerFn({ method: 'POST' })
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });
    const supabase = await createClient();

    const [currentOrg] = await db
      .select({ branding: organizations.branding })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    if (!currentOrg) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    const currentBranding = (currentOrg.branding as Record<string, unknown>) ?? {};
    const currentLogoUrl = currentBranding.logoUrl as string | undefined;

    if (currentLogoUrl && isOurStorageUrl(currentLogoUrl)) {
      try {
        const storagePath = extractStoragePathFromPublicUrl(currentLogoUrl, 'public');
        if (storagePath) {
          const { error: deleteError } = await supabase.storage
            .from('public')
            .remove([storagePath]);

          if (deleteError) {
            logger.error('[removeOrganizationLogo] Failed to delete file from storage', deleteError);
          }
        }
      } catch (error) {
        logger.error('[removeOrganizationLogo] Error deleting file', error);
      }
    }

    const { logoUrl: _removed, ...restBranding } = currentBranding;
    const newBranding = restBranding;

    const [updated] = await db
      .update(organizations)
      .set({ branding: newBranding })
      .where(eq(organizations.id, ctx.organizationId))
      .returning({ branding: organizations.branding });

    if (!updated) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'branding.update',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: ctx.organizationId,
      oldValues: { branding: currentOrg.branding },
      newValues: { branding: updated.branding },
    });

    return { success: true };
  });
