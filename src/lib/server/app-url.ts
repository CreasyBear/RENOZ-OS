/**
 * Server-side app URL resolution.
 *
 * Throws in production if VITE_APP_URL and APP_URL are both unset.
 * Use for invitation links, portal auth, email tracking, unsubscribe tokens.
 */
export function getAppUrl(): string {
  const url = process.env.VITE_APP_URL || process.env.APP_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error(
      'VITE_APP_URL or APP_URL environment variable is required in production.'
    );
  }
  return url || 'http://localhost:3000';
}
