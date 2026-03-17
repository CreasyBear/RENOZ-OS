import { z } from 'zod';
import { OAUTH_PROVIDERS, OAUTH_SERVICE_TYPES } from '@/lib/oauth/constants';

/**
 * OAuth provider enum for connection filtering.
 */
export const OAuthProviderSchema = z.enum(OAUTH_PROVIDERS);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

/**
 * OAuth service type enum for connection filtering.
 */
export const OAuthServiceTypeSchema = z.enum(OAUTH_SERVICE_TYPES);
export type OAuthServiceType = z.infer<typeof OAuthServiceTypeSchema>;
