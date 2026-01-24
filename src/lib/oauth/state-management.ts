/**
 * OAuth State Management
 *
 * Secure OAuth state persistence and validation with PKCE support.
 * Uses short-lived database records to prevent replay attacks.
 */

import crypto from 'node:crypto';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, lt, sql } from 'drizzle-orm';
import { oauthStates, type OAuthState as OAuthStateRecord } from 'drizzle/schema/oauth';
import { decryptOAuthState, type OAuthStatePayload } from './token-encryption';

// ============================================================================
// TYPES
// ============================================================================

export interface StateValidationResult {
  isValid: boolean;
  state?: OAuthStatePayload;
  record?: OAuthStateRecord;
  error?: string;
}

export interface PersistentOAuthState {
  id: string;
  organizationId: string;
  userId: string;
  provider: 'google_workspace' | 'microsoft_365';
  services: ('calendar' | 'email' | 'contacts')[];
  redirectUrl: string;
  encryptedState: string;
  pkceVerifier?: string;
  pkceChallenge?: string;
  pkceMethod?: string;
  status: string;
  isConsumed: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export async function validateOAuthState(
  encryptedState: string,
  expectedOrganizationId?: string
): Promise<StateValidationResult> {
  if (!expectedOrganizationId) {
    return {
      isValid: false,
      error: 'Organization ID is required for state validation',
    };
  }

  const statePayload = decryptOAuthState(encryptedState, expectedOrganizationId);
  if (!statePayload) {
    return {
      isValid: false,
      error: 'Invalid or corrupted OAuth state',
    };
  }

  return { isValid: true, state: statePayload };
}

export async function validateOAuthStateWithDatabase(
  db: PostgresJsDatabase<any>,
  encryptedState: string,
  expectedOrganizationId?: string
): Promise<StateValidationResult> {
  const [record] = await db
    .select()
    .from(oauthStates)
    .where(eq(oauthStates.state, encryptedState))
    .limit(1);

  if (!record) {
    return {
      isValid: false,
      error: 'OAuth state not found or expired',
    };
  }

  if (expectedOrganizationId && record.organizationId !== expectedOrganizationId) {
    return {
      isValid: false,
      error: 'Organization ID mismatch',
    };
  }

  if (record.isConsumed) {
    return {
      isValid: false,
      error: 'OAuth state has already been used',
    };
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return {
      isValid: false,
      error: 'OAuth state has expired',
    };
  }

  const statePayload = decryptOAuthState(encryptedState, record.organizationId);
  if (!statePayload) {
    return {
      isValid: false,
      error: 'Invalid or corrupted OAuth state',
    };
  }

  // Mark state as consumed to prevent replay
  await db
    .update(oauthStates)
    .set({
      isConsumed: true,
      status: 'consumed',
      updatedAt: new Date(),
    })
    .where(eq(oauthStates.id, record.id));

  return { isValid: true, state: statePayload, record };
}

// ============================================================================
// STATE CREATION + CLEANUP
// ============================================================================

export async function createPersistentOAuthState(
  db: PostgresJsDatabase<any>,
  params: {
    organizationId: string;
    userId: string;
    provider: 'google_workspace' | 'microsoft_365';
    services: ('calendar' | 'email' | 'contacts')[];
    redirectUrl: string;
    encryptedState: string;
    pkceVerifier?: string;
    pkceChallenge?: string;
    pkceMethod?: string;
    expiresAt?: Date;
    metadata?: Record<string, any>;
  }
): Promise<PersistentOAuthState> {
  const expiresAt = params.expiresAt || new Date(Date.now() + 15 * 60 * 1000);

  const [state] = await db
    .insert(oauthStates)
    .values({
      organizationId: params.organizationId,
      userId: params.userId,
      provider: params.provider,
      services: params.services,
      redirectUrl: params.redirectUrl,
      state: params.encryptedState,
      pkceVerifier: params.pkceVerifier,
      pkceChallenge: params.pkceChallenge,
      pkceMethod: params.pkceMethod || 'S256',
      status: 'pending',
      isConsumed: false,
      expiresAt,
      metadata: params.metadata || {},
    })
    .returning();

  return {
    id: state.id,
    organizationId: state.organizationId,
    userId: state.userId,
    provider: state.provider as PersistentOAuthState['provider'],
    services: state.services as PersistentOAuthState['services'],
    redirectUrl: state.redirectUrl,
    encryptedState: state.state,
    pkceVerifier: state.pkceVerifier || undefined,
    pkceChallenge: state.pkceChallenge || undefined,
    pkceMethod: state.pkceMethod || undefined,
    status: state.status,
    isConsumed: state.isConsumed,
    expiresAt: new Date(state.expiresAt),
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
    metadata: (state.metadata as Record<string, any>) || undefined,
  };
}

export async function getPersistentOAuthState(
  db: PostgresJsDatabase<any>,
  stateId: string
): Promise<PersistentOAuthState | null> {
  const [state] = await db.select().from(oauthStates).where(eq(oauthStates.id, stateId)).limit(1);

  if (!state) return null;

  return {
    id: state.id,
    organizationId: state.organizationId,
    userId: state.userId,
    provider: state.provider as PersistentOAuthState['provider'],
    services: state.services as PersistentOAuthState['services'],
    redirectUrl: state.redirectUrl,
    encryptedState: state.state,
    pkceVerifier: state.pkceVerifier || undefined,
    pkceChallenge: state.pkceChallenge || undefined,
    pkceMethod: state.pkceMethod || undefined,
    status: state.status,
    isConsumed: state.isConsumed,
    expiresAt: new Date(state.expiresAt),
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
    metadata: (state.metadata as Record<string, any>) || undefined,
  };
}

export async function updatePersistentOAuthState(
  db: PostgresJsDatabase<any>,
  stateId: string,
  updates: {
    status?: 'pending' | 'active' | 'completed' | 'failed' | 'expired' | 'consumed';
    metadata?: Record<string, any>;
  }
): Promise<PersistentOAuthState | null> {
  const [state] = await db
    .update(oauthStates)
    .set({
      status: updates.status || 'pending',
      isConsumed: updates.status === 'consumed' || updates.status === 'completed',
      metadata: updates.metadata ? sql`${oauthStates.metadata} || ${updates.metadata}` : undefined,
      updatedAt: new Date(),
    })
    .where(eq(oauthStates.id, stateId))
    .returning();

  if (!state) return null;

  return {
    id: state.id,
    organizationId: state.organizationId,
    userId: state.userId,
    provider: state.provider as PersistentOAuthState['provider'],
    services: state.services as PersistentOAuthState['services'],
    redirectUrl: state.redirectUrl,
    encryptedState: state.state,
    pkceVerifier: state.pkceVerifier || undefined,
    pkceChallenge: state.pkceChallenge || undefined,
    pkceMethod: state.pkceMethod || undefined,
    status: state.status,
    isConsumed: state.isConsumed,
    expiresAt: new Date(state.expiresAt),
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
    metadata: (state.metadata as Record<string, any>) || undefined,
  };
}

export async function cleanupExpiredOAuthStates(db: PostgresJsDatabase<any>): Promise<number> {
  const now = new Date();
  const deleted = await db
    .delete(oauthStates)
    .where(and(eq(oauthStates.isConsumed, false), lt(oauthStates.expiresAt, now)))
    .returning({ id: oauthStates.id });

  return deleted.length;
}

export async function cleanupOAuthStates(db: PostgresJsDatabase<any>): Promise<{
  expiredStates: number;
  failedConnections: number;
  orphanedLogs: number;
  totalCleaned: number;
}> {
  const expiredStates = await cleanupExpiredOAuthStates(db);
  const failedConnections = 0;
  const orphanedLogs = 0;

  return {
    expiredStates,
    failedConnections,
    orphanedLogs,
    totalCleaned: expiredStates,
  };
}

export async function getOAuthStateCleanupStats(db: PostgresJsDatabase<any>): Promise<{
  expiredStates: number;
  failedConnections: number;
  orphanedLogs: number;
}> {
  const now = new Date();
  const [expiredResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(oauthStates)
    .where(lt(oauthStates.expiresAt, now));

  return {
    expiredStates: expiredResult?.count ?? 0,
    failedConnections: 0,
    orphanedLogs: 0,
  };
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

export function generateOAuthStateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function isOAuthStateExpired(state: { expiresAt: Date }): boolean {
  return new Date() > state.expiresAt;
}

export function calculateOAuthStateExpiry(timestamp: number): Date {
  return new Date(timestamp + 15 * 60 * 1000);
}
