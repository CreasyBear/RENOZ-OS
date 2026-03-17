export const OAUTH_PROVIDERS = ['google_workspace', 'microsoft_365', 'xero'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_SERVICE_TYPES = ['calendar', 'email', 'contacts', 'accounting'] as const;
export type OAuthServiceType = (typeof OAUTH_SERVICE_TYPES)[number];

export const OAUTH_INTERACTIVE_PROVIDERS = ['google_workspace', 'microsoft_365', 'xero'] as const;

export function isMessagingOAuthService(
  service: OAuthServiceType
): service is 'calendar' | 'email' | 'contacts' {
  return service === 'calendar' || service === 'email' || service === 'contacts';
}
