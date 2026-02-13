import { z } from 'zod';

/**
 * OAuth provider enum for connection filtering.
 */
export const OAuthProviderSchema = z.enum(['google_workspace', 'microsoft_365']);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

/**
 * OAuth service type enum for connection filtering.
 */
export const OAuthServiceTypeSchema = z.enum(['calendar', 'email', 'contacts']);
export type OAuthServiceType = z.infer<typeof OAuthServiceTypeSchema>;
