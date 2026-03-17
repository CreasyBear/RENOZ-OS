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
import {
  decryptOAuthToken,
  encryptOAuthState,
  encryptOAuthToken,
  type OAuthStatePayload,
} from '@/lib/oauth/token-encryption';
import {
  validateOAuthStateWithDatabase,
  createPersistentOAuthState,
  getPersistentOAuthState,
  updatePersistentOAuthState,
} from '@/lib/oauth/state-management';
import { createOAuthConnections } from '@/lib/oauth/connections';
import { isAllowedExternalRedirect } from '@/lib/auth/redirects';
import { logger } from '@/lib/logger';
import {
  type OAuthProvider,
  type OAuthServiceType,
} from '@/lib/oauth/constants';

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
  provider: OAuthProvider;
  services: OAuthServiceType[];
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
    case 'xero':
      authorizationUrl = await generateXeroAuthUrl(encryptedState, pkce, services);
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

export interface XeroTenantDescriptor {
  tenantId: string;
  tenantType?: string;
}

export interface OAuthCallbackResultTenantSelection {
  success: false;
  error: 'TENANT_SELECTION_REQUIRED';
  errorDescription?: string;
  redirectUrl: string;
  stateId: string;
  provider: 'xero';
  tenants: XeroTenantDescriptor[];
}

export type OAuthCallbackResult =
  | OAuthCallbackResultSuccess
  | OAuthCallbackResultError
  | OAuthCallbackResultTenantSelection;

interface OAuthCallbackTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  externalAccountId?: string;
}

interface PendingXeroTenantSelectionMetadata {
  kind: 'xero_tenant_selection';
  encryptedAccessToken: string;
  encryptedRefreshToken: string | null;
  expiresAtIso: string;
  scopes: string[];
  tenants: XeroTenantDescriptor[];
}

function isPendingXeroTenantSelectionMetadata(
  value: unknown
): value is PendingXeroTenantSelectionMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as PendingXeroTenantSelectionMetadata;
  return (
    candidate.kind === 'xero_tenant_selection' &&
    typeof candidate.encryptedAccessToken === 'string' &&
    (typeof candidate.encryptedRefreshToken === 'string' || candidate.encryptedRefreshToken === null) &&
    typeof candidate.expiresAtIso === 'string' &&
    Array.isArray(candidate.scopes) &&
    Array.isArray(candidate.tenants)
  );
}

function buildPendingXeroTenantSelectionMetadata(params: {
  organizationId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  tenants: XeroTenantDescriptor[];
}): PendingXeroTenantSelectionMetadata {
  return {
    kind: 'xero_tenant_selection',
    encryptedAccessToken: encryptOAuthToken(params.accessToken, params.organizationId),
    encryptedRefreshToken: params.refreshToken
      ? encryptOAuthToken(params.refreshToken, params.organizationId)
      : null,
    expiresAtIso: params.expiresAt.toISOString(),
    scopes: params.scopes,
    tenants: params.tenants,
  };
}

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
    let tokens: OAuthCallbackTokens;

    switch (provider) {
      case 'google_workspace':
        tokens = await exchangeGoogleWorkspaceCode(code, services, stateRecord.pkceVerifier);
        break;

      case 'microsoft_365':
        tokens = await exchangeMicrosoft365Code(code, services, stateRecord.pkceVerifier);
        break;
      case 'xero':
        tokens = await exchangeXeroCode(
          code,
          services,
          stateRecord.pkceVerifier,
          organizationId,
          stateRecord.id,
          redirectUrl,
          db
        );
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
      externalAccountId: tokens.externalAccountId,
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
    if (
      error &&
      typeof error === 'object' &&
      (error as { code?: string }).code === 'TENANT_SELECTION_REQUIRED'
    ) {
      return {
        success: false,
        error: 'TENANT_SELECTION_REQUIRED',
        errorDescription: 'Select which Xero tenant to connect before finishing OAuth setup',
        redirectUrl,
        stateId: (error as { stateId: string }).stateId,
        provider: 'xero',
        tenants: (error as { tenants: XeroTenantDescriptor[] }).tenants,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed OAuth completion
    return {
      success: false,
      error: 'token_exchange_failed',
      errorDescription: errorMessage,
    };
  }
}

export async function getPendingXeroTenantSelection(params: {
  db: OAuthDatabase;
  stateId: string;
  organizationId: string;
  userId: string;
}) {
  const state = await getPersistentOAuthState(params.db, params.stateId);
  if (!state) {
    throw new Error('OAuth tenant selection state was not found');
  }

  if (state.organizationId !== params.organizationId || state.userId !== params.userId) {
    throw new Error('You are not authorized to access this OAuth tenant selection');
  }

  const metadata = state.metadata?.xeroTenantSelection;
  if (!isPendingXeroTenantSelectionMetadata(metadata)) {
    throw new Error('OAuth tenant selection is not available for this state');
  }

  return {
    stateId: state.id,
    redirectUrl: state.redirectUrl,
    tenants: metadata.tenants,
  };
}

export async function completePendingXeroTenantSelection(params: {
  db: OAuthDatabase;
  stateId: string;
  organizationId: string;
  userId: string;
  tenantId: string;
}): Promise<OAuthCallbackResultSuccess> {
  const state = await getPersistentOAuthState(params.db, params.stateId);
  if (!state) {
    throw new Error('OAuth tenant selection state was not found');
  }

  if (state.organizationId !== params.organizationId || state.userId !== params.userId) {
    throw new Error('You are not authorized to complete this OAuth tenant selection');
  }

  if (state.provider !== 'xero') {
    throw new Error('OAuth tenant selection is only supported for Xero connections');
  }

  const metadata = state.metadata?.xeroTenantSelection;
  if (!isPendingXeroTenantSelectionMetadata(metadata)) {
    throw new Error('OAuth tenant selection metadata is missing or invalid');
  }

  const selectedTenant = metadata.tenants.find((tenant) => tenant.tenantId === params.tenantId);
  if (!selectedTenant) {
    throw new Error('Selected Xero tenant is not valid for this OAuth state');
  }

  const connectionIds = await createOAuthConnections(params.db, {
    organizationId: params.organizationId,
    userId: params.userId,
    provider: 'xero',
    services: state.services,
    tokens: {
      accessToken: decryptOAuthToken(metadata.encryptedAccessToken, params.organizationId),
      refreshToken: metadata.encryptedRefreshToken
        ? decryptOAuthToken(metadata.encryptedRefreshToken, params.organizationId)
        : undefined,
      expiresAt: new Date(metadata.expiresAtIso),
      scopes: metadata.scopes,
    },
    externalAccountId: selectedTenant.tenantId,
  });

  await updatePersistentOAuthState(params.db, params.stateId, {
    status: 'completed',
    metadata: {
      xeroTenantSelection: null,
      selectedTenantId: selectedTenant.tenantId,
      connectionIds,
    },
  });

  await params.db.insert(oauthSyncLogs).values({
    organizationId: params.organizationId,
    connectionId: connectionIds[0],
    serviceType: state.services[0],
    operation: 'oauth_completion',
    status: 'completed',
    recordCount: connectionIds.length,
    metadata: {
      connectionIds,
      provider: 'xero',
      services: state.services,
      scopes: metadata.scopes,
      selectedTenantId: selectedTenant.tenantId,
    },
    startedAt: new Date(),
    completedAt: new Date(),
  });

  return {
    success: true,
    connectionIds,
    provider: 'xero',
    services: state.services,
    organizationId: params.organizationId,
    userId: params.userId,
    redirectUrl: state.redirectUrl,
  };
}

// ============================================================================
// Provider-Specific URL Generation
// ============================================================================

async function generateGoogleWorkspaceAuthUrl(
  state: string,
  pkce: PKCEChallenge,
  services: OAuthServiceType[] = ['calendar', 'email', 'contacts']
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
  services: OAuthServiceType[] = ['calendar', 'email', 'contacts']
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
  services: OAuthServiceType[],
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
  services: OAuthServiceType[],
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

function generateGoogleScopes(services: OAuthServiceType[]): string[] {
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

function generateMicrosoftScopes(services: OAuthServiceType[]): string[] {
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

function generateXeroScopes(services: OAuthServiceType[]): string[] {
  const scopes = ['openid', 'profile', 'email', 'offline_access'];

  if (services.includes('accounting')) {
    scopes.push('accounting.transactions', 'accounting.contacts', 'accounting.settings');
  }

  return scopes;
}

async function fetchXeroTenants(accessToken: string): Promise<Array<{ tenantId: string; tenantType?: string }>> {
  const response = await fetch('https://api.xero.com/connections', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Xero tenant lookup failed after token exchange');
  }

  const connections = (await response.json().catch(() => null)) as
    | Array<{ tenantId?: string; tenantType?: string }>
    | null;

  const tenants = (connections ?? [])
    .filter((connection): connection is { tenantId: string; tenantType?: string } =>
      typeof connection.tenantId === 'string' && connection.tenantId.trim().length > 0
    )
    .map((connection) => ({
      tenantId: connection.tenantId,
      tenantType: connection.tenantType,
    }));

  if (tenants.length === 0) {
    throw new Error('Xero OAuth completed but no tenant connection was returned');
  }

  return tenants;
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
async function generateXeroAuthUrl(
  state: string,
  pkce: PKCEChallenge,
  services: OAuthServiceType[] = ['accounting']
): Promise<string> {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Xero OAuth credentials not configured');
  }

  const scopes = generateXeroScopes(services);
  const baseUrl = 'https://login.xero.com/identity/connect/authorize';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
  });

  return `${baseUrl}?${params.toString()}`;
}

async function exchangeXeroCode(
  code: string,
  services: OAuthServiceType[],
  pkceVerifier: string | undefined,
  organizationId: string,
  stateId: string,
  redirectUrl: string,
  db: OAuthDatabase
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  externalAccountId?: string;
}> {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Xero OAuth credentials not configured');
  }

  const scopes = generateXeroScopes(services);
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: pkceVerifier || '',
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Xero token exchange failed: ${errorData.error_description || response.statusText}`);
  }

  const tokenData = await response.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  const tenants = await fetchXeroTenants(tokenData.access_token);
  if (tenants.length !== 1) {
    await updatePersistentOAuthState(db, stateId, {
      status: 'selection_required',
      metadata: {
        redirectUrl,
        xeroTenantSelection: buildPendingXeroTenantSelectionMetadata({
          organizationId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          scopes,
          tenants,
        }),
      },
    });

    throw Object.assign(new Error('Xero tenant selection required'), {
      code: 'TENANT_SELECTION_REQUIRED',
      stateId,
      tenants,
    });
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    scopes,
    externalAccountId: tenants[0]?.tenantId,
  };
}
