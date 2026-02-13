import { logger } from "@/lib/logger";

/**
 * Fetch Image as Data URL
 *
 * Pre-fetches an image from a URL and converts it to a base64 data URL.
 * Used before PDF rendering to avoid runtime network fetches (CORS, timeout in trigger jobs).
 *
 * @see PDF-DOCUMENT-STANDARDS.md
 * @see organization-for-pdf.ts
 */

/**
 * Fetch an image from URL and return as data URL.
 * Returns null on failure (caller should fall back to org name or logoUrl).
 *
 * @param url - Image URL (e.g. Supabase storage public URL)
 * @returns data URL (e.g. "data:image/png;base64,...") or null if fetch fails
 */
export async function fetchImageAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      logger.warn('[fetchImageAsDataUrl] Failed to fetch', { url, status: response.status });
      return null;
    }

    const contentType = response.headers.get('content-type') ?? 'image/png';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    logger.warn('[fetchImageAsDataUrl] Error fetching', { url, error });
    return null;
  }
}
