/**
 * OAuth State Management Server Functions
 *
 * Server-side functions for OAuth state validation, cleanup, and persistence.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  validateOAuthStateWithDatabase,
  cleanupOAuthStates,
  getOAuthStateCleanupStats,
  createPersistentOAuthState,
  getPersistentOAuthState,
  updatePersistentOAuthState,
} from '@/lib/oauth/state-management';

export interface ValidateOAuthStateRequest {
  encryptedState: string;
  expectedOrganizationId?: string;
}

export interface ValidateOAuthStateResponseSuccess {
  success: true;
  state: any;
}

export interface ValidateOAuthStateResponseError {
  success: false;
  error: string;
}

export type ValidateOAuthStateResponse =
  | ValidateOAuthStateResponseSuccess
  | ValidateOAuthStateResponseError;

/**
 * Server function to validate OAuth state.
 */
export async function validateOAuthStateServer(
  db: PostgresJsDatabase<any>,
  request: ValidateOAuthStateRequest
): Promise<ValidateOAuthStateResponse> {
  try {
    const validation = await validateOAuthStateWithDatabase(
      db,
      request.encryptedState,
      request.expectedOrganizationId
    );

    if (validation.isValid && validation.state) {
      return {
        success: true,
        state: {
          organizationId: validation.state.organizationId,
          userId: validation.state.userId,
          provider: validation.state.provider,
          services: validation.state.services,
          redirectUrl: validation.state.redirectUrl,
          timestamp: validation.state.timestamp,
          nonce: validation.state.nonce,
        },
      };
    } else {
      return {
        success: false,
        error: validation.error || 'State validation failed',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Validation error: ${errorMessage}`,
    };
  }
}

export interface CleanupOAuthStatesResponseSuccess {
  success: true;
  result: {
    expiredStates: number;
    failedConnections: number;
    orphanedLogs: number;
    totalCleaned: number;
  };
}

export interface CleanupOAuthStatesResponseError {
  success: false;
  error: string;
}

export type CleanupOAuthStatesResponse =
  | CleanupOAuthStatesResponseSuccess
  | CleanupOAuthStatesResponseError;

/**
 * Server function to clean up expired OAuth states and failed connections.
 */
export async function cleanupOAuthStatesServer(
  db: PostgresJsDatabase<any>
): Promise<CleanupOAuthStatesResponse> {
  try {
    const result = await cleanupOAuthStates(db);

    return {
      success: true,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Cleanup failed: ${errorMessage}`,
    };
  }
}

export interface GetOAuthStateCleanupStatsResponseSuccess {
  success: true;
  stats: {
    expiredStates: number;
    failedConnections: number;
    orphanedLogs: number;
  };
}

export interface GetOAuthStateCleanupStatsResponseError {
  success: false;
  error: string;
}

export type GetOAuthStateCleanupStatsResponse =
  | GetOAuthStateCleanupStatsResponseSuccess
  | GetOAuthStateCleanupStatsResponseError;

/**
 * Server function to get cleanup statistics without performing cleanup.
 */
export async function getOAuthStateCleanupStatsServer(
  db: PostgresJsDatabase<any>
): Promise<GetOAuthStateCleanupStatsResponse> {
  try {
    const stats = await getOAuthStateCleanupStats(db);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to get stats: ${errorMessage}`,
    };
  }
}

export interface CreatePersistentOAuthStateRequest {
  organizationId: string;
  userId: string;
  provider: 'google_workspace' | 'microsoft_365';
  services: ('calendar' | 'email' | 'contacts')[];
  redirectUrl: string;
  encryptedState: string;
  pkceVerifier?: string;
  pkceChallenge?: string;
  pkceMethod?: string;
  metadata?: Record<string, any>;
}

export interface CreatePersistentOAuthStateResponseSuccess {
  success: true;
  stateId: string;
}

export interface CreatePersistentOAuthStateResponseError {
  success: false;
  error: string;
}

export type CreatePersistentOAuthStateResponse =
  | CreatePersistentOAuthStateResponseSuccess
  | CreatePersistentOAuthStateResponseError;

/**
 * Server function to create a persistent OAuth state.
 */
export async function createPersistentOAuthStateServer(
  db: PostgresJsDatabase<any>,
  request: CreatePersistentOAuthStateRequest
): Promise<CreatePersistentOAuthStateResponse> {
  try {
    const state = await createPersistentOAuthState(db, request);

    return {
      success: true,
      stateId: state.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to create persistent state: ${errorMessage}`,
    };
  }
}

export interface GetPersistentOAuthStateRequest {
  stateId: string;
}

export interface GetPersistentOAuthStateResponseSuccess {
  success: true;
  state: any;
}

export interface GetPersistentOAuthStateResponseError {
  success: false;
  error: string;
}

export type GetPersistentOAuthStateResponse =
  | GetPersistentOAuthStateResponseSuccess
  | GetPersistentOAuthStateResponseError;

/**
 * Server function to retrieve a persistent OAuth state.
 */
export async function getPersistentOAuthStateServer(
  db: PostgresJsDatabase<any>,
  request: GetPersistentOAuthStateRequest
): Promise<GetPersistentOAuthStateResponse> {
  try {
    const state = await getPersistentOAuthState(db, request.stateId);

    if (!state) {
      return {
        success: false,
        error: 'Persistent state not found',
      };
    }

    return {
      success: true,
      state: {
        id: state.id,
        organizationId: state.organizationId,
        userId: state.userId,
        provider: state.provider,
        services: state.services,
        redirectUrl: state.redirectUrl,
        status: state.status,
        expiresAt: state.expiresAt,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
        metadata: state.metadata,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to get persistent state: ${errorMessage}`,
    };
  }
}

export interface UpdatePersistentOAuthStateRequest {
  stateId: string;
  status?: 'pending' | 'active' | 'completed' | 'failed' | 'expired';
  metadata?: Record<string, any>;
}

export interface UpdatePersistentOAuthStateResponseSuccess {
  success: true;
}

export interface UpdatePersistentOAuthStateResponseError {
  success: false;
  error: string;
}

export type UpdatePersistentOAuthStateResponse =
  | UpdatePersistentOAuthStateResponseSuccess
  | UpdatePersistentOAuthStateResponseError;

/**
 * Server function to update a persistent OAuth state.
 */
export async function updatePersistentOAuthStateServer(
  db: PostgresJsDatabase<any>,
  request: UpdatePersistentOAuthStateRequest
): Promise<UpdatePersistentOAuthStateResponse> {
  try {
    const state = await updatePersistentOAuthState(db, request.stateId, {
      status: request.status,
      metadata: request.metadata,
    });

    if (!state) {
      return {
        success: false,
        error: 'Persistent state not found',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to update persistent state: ${errorMessage}`,
    };
  }
}
