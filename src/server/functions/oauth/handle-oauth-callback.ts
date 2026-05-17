/**
 * Handle OAuth Callback Server Function
 *
 * Server action to handle OAuth callback from external providers.
 */

import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { logger } from '@/lib/logger';
import { formatOAuthConnectionError } from '@/lib/oauth/oauth-error-messages';
import {
  handleOAuthCallback as handleOAuthCallbackLib,
  type OAuthCallbackResult,
} from '@/lib/oauth/flow';

export interface HandleOAuthCallbackRequest {
  code?: string;
  state?: string;
  pkceVerifier?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Server function to handle OAuth callback.
 * Exchanges authorization code for tokens and creates/updates connection.
 */
export async function handleOAuthCallback(
  db: OAuthDatabase,
  request: HandleOAuthCallbackRequest
): Promise<OAuthCallbackResult> {
  try {
    // Validate required parameters
    if (!request.state) {
      return {
        success: false,
        error: 'invalid_request',
        errorDescription: 'Missing OAuth state parameter',
      };
    }

    // Handle OAuth callback
    const result = await handleOAuthCallbackLib({
      db,
      ...request,
    });

    return result;
  } catch (error) {
    logger.error('[oauth] handleOAuthCallback failed', error as Error, {});

    return {
      success: false,
      error: 'server_error',
      errorDescription: formatOAuthConnectionError(error, 'callback'),
    };
  }
}
