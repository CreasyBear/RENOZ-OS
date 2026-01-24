/**
 * Handle OAuth Callback Server Function
 *
 * Server action to handle OAuth callback from external providers.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
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
  db: PostgresJsDatabase<any>,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: 'server_error',
      errorDescription: `Internal server error: ${errorMessage}`,
    };
  }
}
