/**
 * OAuth Connection CRUD Operations
 *
 * Server functions for managing OAuth connections with full CRUD operations,
 * organization-scoped access, and comprehensive audit logging.
 */

import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { oauthConnections, oauthSyncLogs, oauthServicePermissions } from 'drizzle/schema/oauth';
import { createOAuthConnections } from '@/lib/oauth/connections';

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const CreateOAuthConnectionSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.enum(['google_workspace', 'microsoft_365']),
  services: z.array(z.enum(['calendar', 'email', 'contacts'])).min(1).max(3),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.date(),
  scopes: z.array(z.string()),
  externalAccountId: z.string().optional(),
});

export const UpdateOAuthConnectionSchema = z.object({
  scopes: z.array(z.string()).optional(),
  externalAccountId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const OAuthConnectionResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  provider: z.enum(['google_workspace', 'microsoft_365']),
  serviceType: z.enum(['calendar', 'email', 'contacts']),
  externalAccountId: z.string().optional(),
  scopes: z.array(z.string()),
  isActive: z.boolean(),
  lastSyncAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ListOAuthConnectionsResponseSchema = z.object({
  connections: z.array(OAuthConnectionResponseSchema),
  total: z.number(),
});

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

export interface CreateOAuthConnectionRequest {
  organizationId: string;
  userId: string;
  provider: 'google_workspace' | 'microsoft_365';
  services: ('calendar' | 'email' | 'contacts')[];
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  externalAccountId?: string;
}

export interface CreateOAuthConnectionResponseSuccess {
  success: true;
  connectionIds: string[];
}

export interface CreateOAuthConnectionResponseError {
  success: false;
  error: string;
}

export type CreateOAuthConnectionResponse =
  | CreateOAuthConnectionResponseSuccess
  | CreateOAuthConnectionResponseError;

/**
 * Creates a new OAuth connection with encrypted token storage.
 */
export async function createOAuthConnection(
  db: OAuthDatabase,
  request: CreateOAuthConnectionRequest
): Promise<CreateOAuthConnectionResponse> {
  try {
    // Validate input
    const validatedInput = CreateOAuthConnectionSchema.parse(request);

    // Check for existing active connection for each service
    for (const service of validatedInput.services) {
      const existingConnection = await db
        .select({ id: oauthConnections.id })
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.organizationId, validatedInput.organizationId),
            eq(oauthConnections.provider, validatedInput.provider),
            eq(oauthConnections.serviceType, service),
            eq(oauthConnections.isActive, true)
          )
        )
        .limit(1);

      if (existingConnection.length > 0) {
        return {
          success: false,
          error: `Active connection already exists for ${validatedInput.provider}/${service}`,
        };
      }
    }

    const connectionIds = await createOAuthConnections(db, {
      organizationId: validatedInput.organizationId,
      userId: validatedInput.userId,
      provider: validatedInput.provider,
      services: validatedInput.services,
      tokens: {
        accessToken: validatedInput.accessToken,
        refreshToken: validatedInput.refreshToken,
        expiresAt: validatedInput.expiresAt,
        scopes: validatedInput.scopes,
      },
      externalAccountId: validatedInput.externalAccountId,
    });

    return {
      success: true,
      connectionIds,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: `Failed to create OAuth connection: ${errorMessage}`,
    };
  }
}

export interface GetOAuthConnectionRequest {
  connectionId: string;
  organizationId: string;
}

export interface GetOAuthConnectionResponseSuccess {
  success: true;
  connection: {
    id: string;
    organizationId: string;
    provider: 'google_workspace' | 'microsoft_365';
    serviceType: 'calendar' | 'email' | 'contacts';
    externalAccountId?: string;
    scopes: string[];
    isActive: boolean;
    lastSyncAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface GetOAuthConnectionResponseError {
  success: false;
  error: string;
}

export type GetOAuthConnectionResponse =
  | GetOAuthConnectionResponseSuccess
  | GetOAuthConnectionResponseError;

/**
 * Retrieves an OAuth connection with decrypted token information.
 */
export async function getOAuthConnection(
  db: OAuthDatabase,
  request: GetOAuthConnectionRequest
): Promise<GetOAuthConnectionResponse> {
  try {
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.organizationId, request.organizationId)
        )
      )
      .limit(1);

    if (!connection) {
      return {
        success: false,
        error: 'OAuth connection not found',
      };
    }

    return {
      success: true,
      connection: {
        id: connection.id,
        organizationId: connection.organizationId,
        provider: connection.provider as 'google_workspace' | 'microsoft_365',
        serviceType: connection.serviceType as 'calendar' | 'email' | 'contacts',
        externalAccountId: connection.externalAccountId || undefined,
        scopes: connection.scopes,
        isActive: connection.isActive,
        lastSyncAt: connection.lastSyncedAt || undefined,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to retrieve OAuth connection: ${errorMessage}`,
    };
  }
}

export interface ListOAuthConnectionsRequest {
  organizationId: string;
  provider?: 'google_workspace' | 'microsoft_365';
  serviceType?: 'calendar' | 'email' | 'contacts';
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListOAuthConnectionsResponseSuccess {
  success: true;
  connections: Array<{
    id: string;
    organizationId: string;
    provider: 'google_workspace' | 'microsoft_365';
    serviceType: 'calendar' | 'email' | 'contacts';
    externalAccountId?: string;
    scopes: string[];
    isActive: boolean;
    lastSyncAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
}

export interface ListOAuthConnectionsResponseError {
  success: false;
  error: string;
}

export type ListOAuthConnectionsResponse =
  | ListOAuthConnectionsResponseSuccess
  | ListOAuthConnectionsResponseError;

/**
 * Lists OAuth connections for an organization with filtering options.
 */
export async function listOAuthConnections(
  db: OAuthDatabase,
  request: ListOAuthConnectionsRequest
): Promise<ListOAuthConnectionsResponse> {
  try {
    const limit = request.limit || 50;
    const offset = request.offset || 0;

    // Build where conditions
    const whereConditions = [eq(oauthConnections.organizationId, request.organizationId)];

    if (request.provider) {
      whereConditions.push(eq(oauthConnections.provider, request.provider));
    }

    if (request.serviceType) {
      whereConditions.push(eq(oauthConnections.serviceType, request.serviceType));
    }

    if (request.isActive !== undefined) {
      whereConditions.push(eq(oauthConnections.isActive, request.isActive));
    }

    // Get connections
    const connections = await db
      .select()
      .from(oauthConnections)
      .where(and(...whereConditions))
      .orderBy(desc(oauthConnections.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(oauthConnections)
      .where(and(...whereConditions));

    const total = countResult?.count ?? 0;

    return {
      success: true,
      connections: connections.map((conn) => ({
        id: conn.id,
        organizationId: conn.organizationId,
        provider: conn.provider as 'google_workspace' | 'microsoft_365',
        serviceType: conn.serviceType as 'calendar' | 'email' | 'contacts',
        externalAccountId: conn.externalAccountId || undefined,
        scopes: conn.scopes,
        isActive: conn.isActive,
        lastSyncAt: conn.lastSyncedAt || undefined,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      })),
      total,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to list OAuth connections: ${errorMessage}`,
    };
  }
}

export interface UpdateOAuthConnectionRequest {
  connectionId: string;
  organizationId: string;
  updates: {
    scopes?: string[];
    externalAccountId?: string;
    isActive?: boolean;
  };
}

export interface UpdateOAuthConnectionResponseSuccess {
  success: true;
}

export interface UpdateOAuthConnectionResponseError {
  success: false;
  error: string;
}

export type UpdateOAuthConnectionResponse =
  | UpdateOAuthConnectionResponseSuccess
  | UpdateOAuthConnectionResponseError;

/**
 * Updates an OAuth connection with validation and audit logging.
 */
export async function updateOAuthConnection(
  db: OAuthDatabase,
  request: UpdateOAuthConnectionRequest
): Promise<UpdateOAuthConnectionResponse> {
  try {
    // Validate input
    const validatedUpdates = UpdateOAuthConnectionSchema.parse(request.updates);

    // Get current connection
    const [currentConnection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.organizationId, request.organizationId)
        )
      )
      .limit(1);

    if (!currentConnection) {
      return {
        success: false,
        error: 'OAuth connection not found',
      };
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedUpdates.scopes) {
      updateData.scopes = validatedUpdates.scopes;
    }

    if (validatedUpdates.externalAccountId !== undefined) {
      updateData.externalAccountId = validatedUpdates.externalAccountId;
    }

    if (validatedUpdates.isActive !== undefined) {
      updateData.isActive = validatedUpdates.isActive;
    }

    // Update connection
    await db
      .update(oauthConnections)
      .set(updateData)
      .where(eq(oauthConnections.id, request.connectionId));

    // Update service permissions if scopes changed
    if (validatedUpdates.scopes) {
      await db
        .delete(oauthServicePermissions)
        .where(eq(oauthServicePermissions.connectionId, request.connectionId));

      for (const scope of validatedUpdates.scopes) {
        await db.insert(oauthServicePermissions).values({
          organizationId: request.organizationId,
          connectionId: request.connectionId,
          serviceType: currentConnection.serviceType as 'calendar' | 'email' | 'contacts',
          scope,
          isGranted: true,
          grantedAt: new Date(),
        });
      }
    }

    // Log update
    await db.insert(oauthSyncLogs).values({
      organizationId: request.organizationId,
      connectionId: request.connectionId,
      serviceType: currentConnection.serviceType as 'calendar' | 'email' | 'contacts',
      operation: 'connection_update',
      status: 'completed',
      recordCount: 1,
      metadata: {
        userId: currentConnection.userId,
        provider: currentConnection.provider,
        updatedFields: Object.keys(validatedUpdates),
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to update OAuth connection: ${errorMessage}`,
    };
  }
}

export interface DeleteOAuthConnectionRequest {
  connectionId: string;
  organizationId: string;
}

export interface DeleteOAuthConnectionResponseSuccess {
  success: true;
}

export interface DeleteOAuthConnectionResponseError {
  success: false;
  error: string;
}

export type DeleteOAuthConnectionResponse =
  | DeleteOAuthConnectionResponseSuccess
  | DeleteOAuthConnectionResponseError;

/**
 * Deletes an OAuth connection and cleans up related data.
 */
export async function deleteOAuthConnection(
  db: OAuthDatabase,
  request: DeleteOAuthConnectionRequest
): Promise<DeleteOAuthConnectionResponse> {
  try {
    // Get connection for logging
    const [connection] = await db
      .select({
        id: oauthConnections.id,
        userId: oauthConnections.userId,
        provider: oauthConnections.provider,
        serviceType: oauthConnections.serviceType,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.organizationId, request.organizationId)
        )
      )
      .limit(1);

    if (!connection) {
      return {
        success: false,
        error: 'OAuth connection not found',
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(oauthServicePermissions)
        .where(eq(oauthServicePermissions.connectionId, request.connectionId));
      await tx.delete(oauthConnections).where(eq(oauthConnections.id, request.connectionId));
      await tx.insert(oauthSyncLogs).values({
        organizationId: request.organizationId,
        connectionId: request.connectionId,
        serviceType: connection.serviceType as 'calendar' | 'email' | 'contacts',
        operation: 'connection_delete',
        status: 'completed',
        recordCount: 1,
        metadata: {
          userId: connection.userId,
          provider: connection.provider,
          cleanupPerformed: true,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to delete OAuth connection: ${errorMessage}`,
    };
  }
}

// No local utility helpers needed; shared helpers are in lib/oauth/connections.ts
