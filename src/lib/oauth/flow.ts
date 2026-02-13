'use server'

/**
 * OAuth Flow Implementation
 *
 * Handles OAuth initiation and callback flows for external service integrations.
 * Supports Google Workspace and Microsoft 365 with PKCE for enhanced security.
 */

import crypto from 'node:crypto';
import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { oauthSyncLogs } from 'drizzle/schema/oauth';
import { encryptOAuthState, type OAuthStatePayload } from '@/lib/oauth/token-encryption';
import {
  validateOAuthStateWithDatabase,
  createPersistentOAuthState,
} from '@/lib/oauth/state-management';
import { createOAuthConnections } from '@/lib/oauth/connections';
import { isAllowedExternalRedirect } from '@/lib/auth/redirects';
import { logger } from '@/lib/logger';

// ============================================================================
// PKCE (Proof Key for Code Exchange) Implementation
// ============================================================================

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generates a PKCE challenge for enhanced OAuth security.
 * @returns PKCE challenge with verifier and method
 */
export function generatePKCEChallenge(): PKCEChallenge {
  // Generate random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');

  // Create code challenge using SHA256 hash
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = hash.toString('base64url');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Validates a PKCE verifier against a challenge.
 * @param verifier The code verifier from the callback
 * @param challenge The original challenge
 * @returns Whether the verifier is valid
 */
export function validatePKCEVerifier(verifier: string, challenge: string): boolean {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  const expectedChallenge = hash.toString('base64url');
  return crypto.timingSafeEqual(Buffer.from(expectedChallenge), Buffer.from(challenge));
}

// ============================================================================
// OAuth Flow Initiation
// ============================================================================

export interface InitiateOAuthFlowParams {
  organizationId: string;
  userId: string;
  provider: 'google_workspace' | 'microsoft_365';
  services: ('calendar' | 'email' | 'contacts')[];
  redirectUrl: string;
  db: OAuthDatabase;
}

export interface OAuthFlowUrls {
  authorizationUrl: string;
  state: string;
  pkce?: PKCEChallenge;
}

/**
 * Initiates an OAuth flow for external service integration.
 * Creates encrypted state and generates authorization URL.
 */
export async function initiateOAuthFlow(params: InitiateOAuthFlowParams): Promise<OAuthFlowUrls> {
  const { organizationId, userId, provider, services, redirectUrl, db } = params;

  if (!isAllowedRedirectUrl(redirectUrl)) {
    logger.warn('[oauth] rejected redirect URL during initiation', {
      provider,
      organizationId,
      redirectUrl,
    });
    throw new Error('Redirect URL is not allowed');
  }

  // Generate secure nonce and PKCE challenge
  const nonce = crypto.randomBytes(16).toString('hex');
  const pkce = generatePKCEChallenge();

  // Create state payload
  const statePayload: OAuthStatePayload = {
    organizationId,
    userId,
    provider,
    services,
    redirectUrl,
    timestamp: Date.now(),
    nonce,
  };

  // Encrypt the state
  const encryptedState = encryptOAuthState(statePayload);

  // Store state record for PKCE verification and replay protection
  await createPersistentOAuthState(db, {
    organizationId,
    userId,
    provider,
    services,
    redirectUrl,
    encryptedState,
    pkceVerifier: pkce.codeVerifier,
    pkceChallenge: pkce.codeChallenge,
    pkceMethod: pkce.codeChallengeMethod,
    metadata: {
      nonce,
    },
  });

  // Generate provider-specific authorization URL
  let authorizationUrl: string;

  switch (provider) {
    case 'google_workspace':
      authorizationUrl = await generateGoogleWorkspaceAuthUrl(encryptedState, pkce, services);
      break;

    case 'microsoft_365':
      authorizationUrl = await generateMicrosoft365AuthUrl(encryptedState, pkce, services);
      break;

    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  return {
    authorizationUrl,
    state: encryptedState,
    pkce,
  };
}

// ============================================================================
// OAuth Callback Handling
// ============================================================================

export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  db: OAuthDatabase;
}

export interface OAuthCallbackResultSuccess {
  success: true;
  connectionIds: string[];
  provider: string;
  services: string[];
  organizationId: string;
  userId: string;
  redirectUrl: string;
}

export interface OAuthCallbackResultError {
  success: false;
  error: string;
  errorDescription?: string;
}

export type OAuthCallbackResult = OAuthCallbackResultSuccess | OAuthCallbackResultError;

/**
 * Handles OAuth callback from external providers.
 * Exchanges authorization code for tokens and creates connection.
 */
export async function handleOAuthCallback(
  params: OAuthCallbackParams
): Promise<OAuthCallbackResult> {
  const { code, state, error, errorDescription, db } = params;

  // Check for OAuth errors
  if (error) {
    return {
      success: false,
      error,
      errorDescription,
    };
  }

  if (!code) {
    return {
      success: false,
      error: 'invalid_request',
      errorDescription: 'Authorization code is required',
    };
  }

  if (!state) {
    return {
      success: false,
      error: 'invalid_request',
      errorDescription: 'OAuth state is required',
    };
  }

  // Enhanced state validation with database checks
  const stateValidation = await validateOAuthStateWithDatabase(db, state);

  if (!stateValidation.isValid || !stateValidation.state) {
    logger.warn('[oauth] callback state validation failed', {
      error: stateValidation.error,
    });
    return {
      success: false,
      error: 'invalid_state',
      errorDescription: stateValidation.error || 'Invalid or expired OAuth state',
    };
  }

  const { organizationId, userId, provider, services, redirectUrl } = stateValidation.state;
  const stateRecord = stateValidation.record;

  // Validate PKCE using stored verifier/challenge
  if (!stateRecord?.pkceVerifier) {
    return {
      success: false,
      error: 'invalid_state',
      errorDescription: 'PKCE verifier missing from state record',
    };
  }

  try {
    // Exchange code for tokens based on provider
    let tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: Date;
      scopes: string[];
    };

    switch (provider) {
      case 'google_workspace':
        tokens = await exchangeGoogleWorkspaceCode(code, services, stateRecord.pkceVerifier);
        break;

      case 'microsoft_365':
        tokens = await exchangeMicrosoft365Code(code, services, stateRecord.pkceVerifier);
        break;

      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    // Create OAuth connections for each service
    const connectionIds = await createOAuthConnections(db, {
      organizationId,
      userId,
      provider,
      services,
      tokens,
    });

    // Log successful OAuth completion
    await db.insert(oauthSyncLogs).values({
      organizationId,
      connectionId: connectionIds[0],
      serviceType: services[0],
      operation: 'oauth_completion',
      status: 'completed',
      recordCount: connectionIds.length,
      metadata: {
        connectionIds,
        provider,
        services,
        scopes: tokens.scopes,
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return {
      success: true,
      connectionIds,
      provider,
      services,
      organizationId,
      userId,
      redirectUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed OAuth completion
    return {
      success: false,
      error: 'token_exchange_failed',
      errorDescription: errorMessage,
    };
  }
}

// ============================================================================
// Provider-Specific URL Generation
// ============================================================================

async function generateGoogleWorkspaceAuthUrl(
  state: string,
  pkce: PKCEChallenge,
  services: ('calendar' | 'email' | 'contacts')[] = ['calendar', 'email', 'contacts']
): Promise<string> {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_WORKSPACE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Google Workspace OAuth credentials not configured');
  }

  const scopes = generateGoogleScopes(services);
  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
  });

  return `${baseUrl}?${params.toString()}`;
}

async function generateMicrosoft365AuthUrl(
  state: string,
  pkce: PKCEChallenge,
  services: ('calendar' | 'email' | 'contacts')[] = ['calendar', 'email', 'contacts']
): Promise<string> {
  const clientId = process.env.MICROSOFT365_CLIENT_ID;
  const tenantId = process.env.MICROSOFT365_TENANT_ID || 'common';
  const redirectUri = process.env.MICROSOFT365_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Microsoft 365 OAuth credentials not configured');
  }

  const scopes = generateMicrosoftScopes(services);
  const baseUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
  });

  return `${baseUrl}?${params.toString()}`;
}

// ============================================================================
// Token Exchange Implementation
// ============================================================================

async function exchangeGoogleWorkspaceCode(
  code: string,
  services: ('calendar' | 'email' | 'contacts')[],
  pkceVerifier?: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
}> {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_WORKSPACE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Workspace OAuth credentials not configured');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const scopes = generateGoogleScopes(services);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: pkceVerifier || '',
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Google token exchange failed: ${errorData.error_description || response.statusText}`
    );
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    scopes,
  };
}

async function exchangeMicrosoft365Code(
  code: string,
  services: ('calendar' | 'email' | 'contacts')[],
  pkceVerifier?: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
}> {
  const clientId = process.env.MICROSOFT365_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT365_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT365_TENANT_ID || 'common';
  const redirectUri = process.env.MICROSOFT365_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Microsoft 365 OAuth credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const scopes = generateMicrosoftScopes(services);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      code_verifier: pkceVerifier || '',
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Microsoft token exchange failed: ${errorData.error_description || response.statusText}`
    );
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    scopes,
  };
}

// ============================================================================
// Scope Generation
// ============================================================================

function generateGoogleScopes(services: ('calendar' | 'email' | 'contacts')[]): string[] {
  const scopes = ['openid', 'email', 'profile'];

  if (services.includes('calendar')) {
    scopes.push('https://www.googleapis.com/auth/calendar');
  }

  if (services.includes('email')) {
    scopes.push('https://www.googleapis.com/auth/gmail.readonly');
  }

  if (services.includes('contacts')) {
    scopes.push('https://www.googleapis.com/auth/contacts');
  }

  return scopes;
}

function generateMicrosoftScopes(services: ('calendar' | 'email' | 'contacts')[]): string[] {
  const scopes = ['openid', 'email', 'profile'];

  if (services.includes('calendar')) {
    scopes.push('https://graph.microsoft.com/Calendars.ReadWrite');
  }

  if (services.includes('email')) {
    scopes.push('https://graph.microsoft.com/Mail.Read');
  }

  if (services.includes('contacts')) {
    scopes.push('https://graph.microsoft.com/Contacts.Read');
  }

  return scopes;
}

// ============================================================================
// Redirect URL validation
// ============================================================================

export function isAllowedRedirectUrl(redirectUrl: string): boolean {
  const allowlist = (process.env.OAUTH_REDIRECT_ALLOWLIST || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return isAllowedExternalRedirect(redirectUrl, {
    allowlist,
    appUrl: process.env.APP_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}
