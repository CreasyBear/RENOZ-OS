/**
 * Organization Data for PDF Generation
 *
 * Centralized fetch and preparation of organization data for document generation.
 * Fetches org from DB, validates branding, and pre-fetches logo to data URL
 * to avoid runtime network failures during PDF rendering.
 *
 * @see PDF-DOCUMENT-STANDARDS.md
 * @see fetch-image-as-data-url.ts
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { organizations } from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';
import { logger } from '@/lib/logger';
import { createAdminSupabase } from '@/lib/supabase/server';
import { fetchImageAsDataUrl } from '@/lib/documents/fetch-image-as-data-url';
import {
  isOurStorageUrl,
  extractStoragePathFromPublicUrl,
} from '@/lib/storage/storage-url-utils';
import type { DocumentOrganization } from '@/lib/documents';

const addressSchema = z
  .object({
    street1: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  })
  .nullable();

const brandingSchema = z
  .object({
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    websiteUrl: z.string().optional(),
  })
  .nullable();

const settingsSchema = z
  .object({
    defaultPaymentTerms: z.number().optional(),
    defaultTaxRate: z.number().optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.string().optional(),
  })
  .nullable();

/**
 * Fetch organization and prepare for PDF document generation.
 * Pre-fetches logo to data URL; falls back to logoUrl if fetch fails.
 *
 * @param organizationId - Organization UUID
 * @returns DocumentOrganization with logoDataUrl when logo exists
 */
export async function fetchOrganizationForDocument(
  organizationId: string
): Promise<DocumentOrganization> {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      email: organizations.email,
      phone: organizations.phone,
      website: organizations.website,
      abn: organizations.abn,
      address: organizations.address,
      currency: organizations.currency,
      locale: organizations.locale,
      branding: organizations.branding,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new NotFoundError('Organization not found', 'organization');
  }

  const addressResult = addressSchema.safeParse(org.address);
  const brandingResult = brandingSchema.safeParse(org.branding);
  const settingsResult = settingsSchema.safeParse(org.settings);

  const address = addressResult.success ? addressResult.data : null;
  const branding = brandingResult.success ? brandingResult.data : null;
  const settings = settingsResult.success ? settingsResult.data : null;

  let logoDataUrl: string | null = null;
  if (branding?.logoUrl) {
    // Prefer Supabase storage download for our logos (bypasses fetch/CORS issues)
    if (isOurStorageUrl(branding.logoUrl)) {
      const storagePath = extractStoragePathFromPublicUrl(branding.logoUrl, 'public');
      if (storagePath) {
        try {
          const supabase = createAdminSupabase();
          const { data, error } = await supabase.storage
            .from('public')
            .download(storagePath);
          if (!error && data) {
            const buffer = Buffer.from(await data.arrayBuffer());
            const base64 = buffer.toString('base64');
            const ext = storagePath.endsWith('.jpg') || storagePath.endsWith('.jpeg')
              ? 'jpeg'
              : 'png';
            logoDataUrl = `data:image/${ext};base64,${base64}`;
          }
        } catch (err) {
          logger.warn('[fetchOrganizationForDocument] Supabase storage download failed', {
            storagePath,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    if (!logoDataUrl) {
      logoDataUrl = await fetchImageAsDataUrl(branding.logoUrl);
    }
    if (!logoDataUrl) {
      logger.warn('[fetchOrganizationForDocument] Logo could not be loaded', {
        organizationId,
        logoUrl: branding.logoUrl?.slice(0, 80),
      });
    }
  }

  return {
    id: org.id,
    name: org.name,
    email: org.email,
    phone: org.phone,
    website: org.website || branding?.websiteUrl || undefined,
    taxId: org.abn,
    currency: org.currency || 'AUD',
    locale: org.locale || 'en-AU',
    address: address
      ? {
          addressLine1: address.street1,
          addressLine2: address.street2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode ?? address.postcode,
          country: address.country,
        }
      : undefined,
    branding: {
      logoUrl: branding?.logoUrl,
      logoDataUrl: logoDataUrl ?? undefined,
      primaryColor: branding?.primaryColor,
      secondaryColor: branding?.secondaryColor,
      websiteUrl: branding?.websiteUrl,
    },
    settings: settings
      ? {
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          timeFormat: settings.timeFormat as '12h' | '24h' | undefined,
          defaultPaymentTerms: settings.defaultPaymentTerms,
          defaultTaxRate: settings.defaultTaxRate,
        }
      : undefined,
  };
}
