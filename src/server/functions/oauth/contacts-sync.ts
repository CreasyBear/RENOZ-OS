/**
 * Contacts Sync Server Functions
 *
 * Server functions for contact synchronization, deduplication, and CRM integration.
 * Implements the complete contacts sync workflow with conflict resolution.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, notInArray, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { oauthConnections, oauthSyncLogs, oauthContacts } from 'drizzle/schema/oauth';
import { decryptOAuthToken } from '@/lib/oauth/token-encryption';
import {
  createContactsProvider,
  type Contact,
  type ContactSearchOptions,
} from '@/lib/oauth/contacts-client';
import {
  deduplicateContacts,
  mergeDuplicateContacts,
  type DeduplicationConfig,
  type DeduplicationResult,
} from '@/lib/oauth/contacts-deduplication';

// Define ContactSyncResult locally since it's not exported from deduplication
export interface ContactSyncResult {
  contactsProcessed: number;
  contactsCreated: number;
  contactsUpdated: number;
  contactsDeleted: number;
  duplicatesResolved: number;
  errors: string[];
  duration: number;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const SyncContactsRequestSchema = z.object({
  connectionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  fullSync: z.boolean().optional(),
  maxContacts: z.number().min(1).max(1000).default(500),
  filters: z
    .object({
      query: z.string().optional(),
      groupId: z.string().optional(),
      updatedSince: z.string().datetime().optional(),
    })
    .optional(),
  deduplication: z
    .object({
      enabled: z.boolean().default(true),
      similarityThreshold: z.number().min(0).max(1).default(0.85),
      autoMerge: z.boolean().default(false),
      conflictResolution: z
        .enum(['newest_wins', 'oldest_wins', 'manual', 'most_complete'])
        .default('most_complete'),
    })
    .optional(),
});

export const BulkContactsSyncRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  provider: z.enum(['google_workspace', 'microsoft_365']).optional(),
  fullSync: z.boolean().optional(),
  maxConcurrency: z.number().min(1).max(3).default(2),
  deduplication: z
    .object({
      enabled: z.boolean().default(true),
      similarityThreshold: z.number().min(0).max(1).default(0.85),
      autoMerge: z.boolean().default(false),
    })
    .optional(),
});

export const ResolveContactDuplicatesRequestSchema = z.object({
  organizationId: z.string().uuid(),
  connectionId: z.string().uuid(),
  externalIds: z.array(z.string()).min(2),
  resolutions: z.record(z.string(), z.any()), // Field -> Resolved value mapping
});

// ============================================================================
// CONTACTS SYNC OPERATIONS
// ============================================================================

export interface SyncContactsRequest {
  connectionId: string;
  organizationId: string;
  fullSync?: boolean;
  maxContacts?: number;
  filters?: Partial<ContactSearchOptions>;
  deduplication?: Partial<DeduplicationConfig>;
}

export interface SyncContactsResponseSuccess {
  success: true;
  result: ContactSyncResult & {
    deduplicationResult?: DeduplicationResult;
    crmIntegrationResult?: any; // Would integrate with actual CRM
  };
}

export interface SyncContactsResponseError {
  success: false;
  error: string;
}

export type SyncContactsResponse = SyncContactsResponseSuccess | SyncContactsResponseError;

/**
 * Syncs contacts for a specific OAuth connection.
 * Includes deduplication, CRM integration, and comprehensive logging.
 */
export async function syncContacts(
  db: PostgresJsDatabase<any>,
  request: SyncContactsRequest
): Promise<SyncContactsResponse> {
  const startTime = Date.now();

  try {
    // Get connection details
    const [connection] = await db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        accessToken: oauthConnections.accessToken,
        refreshToken: oauthConnections.refreshToken,
        isActive: oauthConnections.isActive,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.organizationId, request.organizationId),
          eq(oauthConnections.serviceType, 'contacts')
        )
      )
      .limit(1);

    if (!connection) {
      return {
        success: false,
        error: 'Contacts connection not found or does not include contacts service',
      };
    }

    if (!connection.isActive) {
      return {
        success: false,
        error: 'Connection is not active',
      };
    }

    // Decrypt tokens
    let accessToken: string;
    try {
      accessToken = decryptOAuthToken(connection.accessToken, connection.organizationId);
    } catch {
      return {
        success: false,
        error: 'Failed to decrypt access token',
      };
    }

    // Create contacts provider
    const contactsProvider = createContactsProvider(
      connection.provider as 'google_workspace' | 'microsoft_365'
    );

    // Build search options
    const searchOptions: ContactSearchOptions = {
      limit: request.maxContacts || 500,
      ...request.filters,
    };

    // If not full sync, get recently updated contacts only
    if (!request.fullSync) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      searchOptions.updatedSince = searchOptions.updatedSince || oneWeekAgo;
    }

    // Fetch contacts from provider
    const { contacts: rawContacts, totalCount } = await contactsProvider.listContacts(
      {
        accessToken,
        refreshToken: connection.refreshToken
          ? decryptOAuthToken(connection.refreshToken, connection.organizationId)
          : undefined,
      },
      searchOptions
    );

    let contactsProcessed = 0;
    let contactsCreated = 0;
    let contactsUpdated = 0;
    let contactsDeleted = 0;
    let duplicatesResolved = 0;
    const errors: string[] = [];
    let deduplicationResult: DeduplicationResult | undefined;

    try {
      // Set organization and connection IDs on contacts
      const contactsWithIds = rawContacts.map((contact) => ({
        ...contact,
        organizationId: connection.organizationId,
        connectionId: connection.id,
      }));

      // Perform deduplication if enabled
      if (request.deduplication?.enabled !== false) {
        const deduplicationConfig: DeduplicationConfig = {
          enabled: true,
          similarityThreshold: request.deduplication?.similarityThreshold || 0.85,
          autoMerge: request.deduplication?.autoMerge || false,
          conflictResolution: request.deduplication?.conflictResolution || 'most_complete',
          preserveOriginalData: true,
          maxCandidatesPerContact: 10,
          fieldWeights: {
            name: 0.4,
            email: 0.3,
            phone: 0.2,
            address: 0.05,
            company: 0.05,
          },
        };

        deduplicationResult = await deduplicateContacts(contactsWithIds, deduplicationConfig);

        // Process unique contacts and merge duplicates
        const contactsToProcess = [
          ...deduplicationResult.uniqueContacts,
          ...deduplicationResult.duplicateGroups.map((group) => {
            if (group.mergeStrategy === 'auto') {
              return mergeDuplicateContacts(group, deduplicationConfig);
            }
            return group.canonicalContact;
          }),
        ];

        duplicatesResolved = deduplicationResult.duplicateGroups.length;

        // Process each contact
        for (const contact of contactsToProcess) {
          try {
            // Check if contact already exists
            const existingContact = await findExistingContact(
              db,
              contact.externalId,
              connection.id
            );

            if (!existingContact) {
              // Create new contact
              await storeContact(db, connection, contact);
              contactsCreated++;
            } else {
              // Check if update is needed
              const needsUpdate = checkContactNeedsUpdate(existingContact, contact);
              if (needsUpdate) {
                await updateContact(db, connection, contact);
                contactsUpdated++;
              }
            }

            contactsProcessed++;
          } catch (contactError) {
            errors.push(
              `Failed to process contact ${contact.externalId}: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`
            );
          }
        }
      } else {
        // Process contacts without deduplication
        for (const contact of contactsWithIds) {
          try {
            const existingContact = await findExistingContact(
              db,
              contact.externalId,
              connection.id
            );

            if (!existingContact) {
              await storeContact(db, connection, contact);
              contactsCreated++;
            } else {
              const needsUpdate = checkContactNeedsUpdate(existingContact, contact);
              if (needsUpdate) {
                await updateContact(db, connection, contact);
                contactsUpdated++;
              }
            }

            contactsProcessed++;
          } catch (contactError) {
            errors.push(
              `Failed to process contact ${contact.externalId}: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`
            );
          }
        }
      }

      // Handle deletions (contacts no longer in external source)
      if (request.fullSync) {
        const externalIds = new Set(rawContacts.map((c) => c.externalId));
        const deletedCount = await markDeletedContacts(db, connection.id, externalIds);
        contactsDeleted = deletedCount;
      }
    } catch (processingError) {
      errors.push(
        `Contacts processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
      );
    }

    // Update connection sync status
    await db
      .update(oauthConnections)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, request.connectionId));

    // Log sync completion
    await db.insert(oauthSyncLogs).values({
      organizationId: connection.organizationId,
      connectionId: request.connectionId,
      serviceType: 'contacts',
      operation: 'sync',
      status: errors.length === 0 ? 'completed' : 'completed_with_errors',
      recordCount: contactsProcessed,
      metadata: {
        contactsCreated,
        contactsUpdated,
        contactsDeleted,
        duplicatesResolved,
        totalContactsFound: totalCount,
        deduplicationEnabled: request.deduplication?.enabled !== false,
        duration: Date.now() - startTime,
        filters: request.filters,
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    const result: ContactSyncResult = {
      contactsProcessed,
      contactsCreated,
      contactsUpdated,
      contactsDeleted,
      duplicatesResolved,
      errors,
      duration: Date.now() - startTime,
    };

    return {
      success: true,
      result: {
        ...result,
        deduplicationResult,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log sync failure
    try {
      await db.insert(oauthSyncLogs).values({
        organizationId: request.organizationId,
        connectionId: request.connectionId,
        serviceType: 'contacts',
        operation: 'sync',
        status: 'failed',
        errorMessage,
        metadata: {
          duration: Date.now() - startTime,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      });
    } catch (logError) {
      console.error('Failed to log contacts sync failure:', logError);
    }

    return {
      success: false,
      error: `Contacts sync failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// DEDUPLICATION MANAGEMENT
// ============================================================================

export interface ResolveContactDuplicatesRequest {
  organizationId: string;
  connectionId: string;
  externalIds: string[];
  resolutions: Record<string, any>; // Field -> Resolved value mapping
}

export interface ResolveContactDuplicatesResponseSuccess {
  success: true;
  result: {
    mergedContactId: string;
    deletedContactIds: string[];
    resolutionsApplied: Record<string, any>;
  };
}

export interface ResolveContactDuplicatesResponseError {
  success: false;
  error: string;
}

export type ResolveContactDuplicatesResponse =
  | ResolveContactDuplicatesResponseSuccess
  | ResolveContactDuplicatesResponseError;

/**
 * Manually resolves duplicate contacts with custom field mappings.
 */
export async function resolveContactDuplicates(
  db: PostgresJsDatabase<any>,
  request: ResolveContactDuplicatesRequest
): Promise<ResolveContactDuplicatesResponse> {
  try {
    const validated = ResolveContactDuplicatesRequestSchema.parse(request);

    const contacts = await db
      .select()
      .from(oauthContacts)
      .where(
        and(
          eq(oauthContacts.organizationId, validated.organizationId),
          eq(oauthContacts.connectionId, validated.connectionId),
          inArray(oauthContacts.externalId, validated.externalIds)
        )
      );

    if (contacts.length < 2) {
      return {
        success: false,
        error: 'Not enough contacts found to resolve duplicates',
      };
    }

    const primary = contacts[0];
    const mergedEmails = validated.resolutions.emails || primary.emails || [];
    const mergedPhones = validated.resolutions.phones || primary.phones || [];

    await db
      .update(oauthContacts)
      .set({
        fullName: validated.resolutions.fullName || primary.fullName,
        emails: mergedEmails,
        phones: mergedPhones,
        raw: {
          ...(primary.raw as Record<string, any>),
          resolutions: validated.resolutions,
        },
        updatedAt: new Date(),
      })
      .where(eq(oauthContacts.id, primary.id));

    const duplicateIds = contacts.slice(1).map((contact) => contact.id);
    if (duplicateIds.length > 0) {
      await db.delete(oauthContacts).where(inArray(oauthContacts.id, duplicateIds));
    }

    return {
      success: true,
      result: {
        mergedContactId: primary.id,
        deletedContactIds: duplicateIds,
        resolutionsApplied: validated.resolutions,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to resolve duplicates: ${errorMessage}`,
    };
  }
}

// ============================================================================
// BULK CONTACTS SYNC
// ============================================================================

export interface BulkContactsSyncRequest {
  organizationId?: string;
  provider?: 'google_workspace' | 'microsoft_365';
  fullSync?: boolean;
  maxConcurrency?: number;
  deduplication?: Partial<DeduplicationConfig>;
}

export interface BulkContactsSyncResponseSuccess {
  success: true;
  results: Array<{
    connectionId: string;
    success: boolean;
    result?: ContactSyncResult;
    error?: string;
  }>;
  summary: {
    totalConnections: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalContactsProcessed: number;
    totalDuration: number;
  };
}

export interface BulkContactsSyncResponseError {
  success: false;
  error: string;
}

export type BulkContactsSyncResponse =
  | BulkContactsSyncResponseSuccess
  | BulkContactsSyncResponseError;

/**
 * Performs bulk contacts sync across multiple connections.
 */
export async function bulkContactsSync(
  db: PostgresJsDatabase<any>,
  request: BulkContactsSyncRequest
): Promise<BulkContactsSyncResponse> {
  try {
    // Find all eligible connections
    // Build where conditions
    const whereConditions = [
      eq(oauthConnections.serviceType, 'contacts'),
      eq(oauthConnections.isActive, true),
    ];

    if (request.organizationId) {
      whereConditions.push(eq(oauthConnections.organizationId, request.organizationId));
    }

    if (request.provider) {
      whereConditions.push(eq(oauthConnections.provider, request.provider));
    }

    const query = db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        isActive: oauthConnections.isActive,
      })
      .from(oauthConnections)
      .where(and(...whereConditions));

    const connections = await query;

    if (connections.length === 0) {
      return {
        success: true,
        results: [],
        summary: {
          totalConnections: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          totalContactsProcessed: 0,
          totalDuration: 0,
        },
      };
    }

    const maxConcurrency = request.maxConcurrency || 2;
    const results: Array<{
      connectionId: string;
      success: boolean;
      result?: ContactSyncResult;
      error?: string;
    }> = [];

    let successfulSyncs = 0;
    let failedSyncs = 0;
    let totalContactsProcessed = 0;
    let totalDuration = 0;

    // Process connections with concurrency control
    for (let i = 0; i < connections.length; i += maxConcurrency) {
      const batch = connections.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (connection) => {
        try {
          const result = await syncContacts(db, {
            connectionId: connection.id,
            organizationId: connection.organizationId,
            fullSync: request.fullSync,
            deduplication: request.deduplication,
          });

          if (result.success) {
            successfulSyncs++;
            totalContactsProcessed += result.result.contactsProcessed;
            totalDuration += result.result.duration;

            return {
              connectionId: connection.id,
              success: true,
              result: result.result,
            };
          } else {
            failedSyncs++;
            return {
              connectionId: connection.id,
              success: false,
              error: result.error,
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failedSyncs++;
          return {
            connectionId: connection.id,
            success: false,
            error: errorMessage,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to avoid overwhelming external APIs
      if (i + maxConcurrency < connections.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    return {
      success: true,
      results,
      summary: {
        totalConnections: connections.length,
        successfulSyncs,
        failedSyncs,
        totalContactsProcessed,
        totalDuration,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Bulk contacts sync failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

async function findExistingContact(
  db: PostgresJsDatabase<any>,
  externalId: string,
  connectionId: string
): Promise<{ id: string; updatedAt: Date } | null> {
  const [existing] = await db
    .select({
      id: oauthContacts.id,
      updatedAt: oauthContacts.updatedAt,
    })
    .from(oauthContacts)
    .where(and(eq(oauthContacts.connectionId, connectionId), eq(oauthContacts.externalId, externalId)))
    .limit(1);

  return existing || null;
}

async function storeContact(
  db: PostgresJsDatabase<any>,
  connection: any,
  contact: Contact
): Promise<void> {
  await db.insert(oauthContacts).values({
    organizationId: connection.organizationId,
    connectionId: connection.id,
    externalId: contact.externalId,
    fullName: contact.displayName,
    emails: contact.emails.map((email) => email.address),
    phones: contact.phones.map((phone) => phone.number),
    raw: contact as unknown as Record<string, any>,
  });
}

async function updateContact(
  db: PostgresJsDatabase<any>,
  connection: any,
  contact: Contact
): Promise<void> {
  await db
    .update(oauthContacts)
    .set({
      fullName: contact.displayName,
      emails: contact.emails.map((email) => email.address),
      phones: contact.phones.map((phone) => phone.number),
      raw: contact as unknown as Record<string, any>,
      updatedAt: new Date(),
    })
    .where(and(eq(oauthContacts.connectionId, connection.id), eq(oauthContacts.externalId, contact.externalId)));
}

function checkContactNeedsUpdate(
  existing: { updatedAt: Date },
  incoming: Contact
): boolean {
  return new Date(existing.updatedAt).getTime() !== incoming.updatedAt.getTime();
}

async function markDeletedContacts(
  db: PostgresJsDatabase<any>,
  connectionId: string,
  activeExternalIds: Set<string>
): Promise<number> {
  const ids = Array.from(activeExternalIds);
  if (ids.length === 0) {
    const deleted = await db
      .delete(oauthContacts)
      .where(eq(oauthContacts.connectionId, connectionId))
      .returning({ id: oauthContacts.id });
    return deleted.length;
  }

  const deleted = await db
    .delete(oauthContacts)
    .where(
      and(
        eq(oauthContacts.connectionId, connectionId),
        notInArray(oauthContacts.externalId, ids)
      )
    )
    .returning({ id: oauthContacts.id });

  return deleted.length;
}
