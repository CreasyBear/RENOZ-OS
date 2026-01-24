/**
 * Initiate OAuth Flow Server Function
 *
 * Server action to initiate OAuth flow for external service integration.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { initiateOAuthFlow } from '@/lib/oauth/flow';

export interface InitiateOAuthFlowRequest {
  organizationId: string;
  userId: string;
  provider: 'google_workspace' | 'microsoft_365';
  services: ('calendar' | 'email' | 'contacts')[];
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
  db: PostgresJsDatabase<any>,
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
    if (!['google_workspace', 'microsoft_365'].includes(request.provider)) {
      return {
        success: false,
        error: 'Invalid provider: Must be google_workspace or microsoft_365',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: `Failed to initiate OAuth flow: ${errorMessage}`,
    };
  }
}
