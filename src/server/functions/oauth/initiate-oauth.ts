/**
 * Initiate OAuth Flow Server Function
 *
 * Server action to initiate OAuth flow for external service integration.
 */

import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { initiateOAuthFlow } from '@/lib/oauth/flow';
import type { OAuthProvider, OAuthServiceType } from '@/lib/oauth/constants';
import { logger } from '@/lib/logger';
import { formatOAuthConnectionError } from '@/lib/oauth/oauth-error-messages';

export interface InitiateOAuthFlowRequest {
  organizationId: string;
  userId: string;
  provider: OAuthProvider;
  services: OAuthServiceType[];
  redirectUrl: string;
}

export interface InitiateOAuthFlowResponseSuccess {
  success: true;
  authorizationUrl: string;
  state: string;
}

export interface InitiateOAuthFlowResponseError {
  success: false;
  error: string;
}

export type InitiateOAuthFlowResponse =
  | InitiateOAuthFlowResponseSuccess
  | InitiateOAuthFlowResponseError;

/**
 * Server function to initiate OAuth flow.
 * Validates permissions and generates authorization URL.
 */
export async function initiateOAuth(
  db: OAuthDatabase,
  request: InitiateOAuthFlowRequest,
  userId: string // From auth context
): Promise<InitiateOAuthFlowResponse> {
  try {
    // Validate user permissions
    if (request.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized: User ID mismatch',
      };
    }

    // Validate organization access (would need org membership check)
    // For now, assume user has access to their organization

    // Validate services array
    if (!request.services.length || request.services.length > 3) {
      return {
        success: false,
        error: 'Invalid services: Must specify 1-3 services',
      };
    }

    // Validate provider
    if (!['google_workspace', 'microsoft_365', 'xero'].includes(request.provider)) {
      return {
        success: false,
        error: 'Invalid provider: Must be google_workspace, microsoft_365, or xero',
      };
    }

    // Initiate OAuth flow
    const flowResult = await initiateOAuthFlow({
      ...request,
      db,
    });

    return {
      success: true,
      authorizationUrl: flowResult.authorizationUrl,
      state: flowResult.state,
    };
  } catch (error) {
    logger.error('[oauth] initiateOAuth failed', error as Error, {});

    return {
      success: false,
      error: formatOAuthConnectionError(error, 'initiate'),
    };
  }
}
