'use server'

/**
 * User Invitation Server Functions
 *
 * Server functions for user invitation management.
 * Supports sending, accepting, cancelling, and resending invitations.
 *
 * @see drizzle/schema/user-invitations.ts for database schema
 * @see src/lib/schemas/users.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc, asc, sql, lt, count as drizzleCount } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildCursorResponse } from '@/lib/db/pagination';
import { db } from '@/lib/db';
import { userInvitations, users, organizations, userPreferences } from 'drizzle/schema';
import { withAuth, withInternalAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  sendInvitationSchema,
  invitationFilterSchema,
  invitationCursorSchema,
  acceptInvitationApiSchema,
  batchSendInvitationsSchema,
  type Invitation,
  type BatchInvitationResult,
} from '@/lib/schemas/users';
import { idParamSchema } from '@/lib/schemas';
import { createAdminSupabase } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { getRequest } from '@tanstack/react-start/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/server/rate-limit';
import { getAppUrl } from '@/lib/server/app-url';
import { logAuditEvent } from '@/server/functions/_shared/audit-logs';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import {
  client,
  isTriggerConfigured,
  userEvents,
  type InvitationSentPayload,
  type BatchInvitationSentPayload,
} from '@/trigger/client';
import { NotFoundError, ConflictError, ValidationError, ServerError } from '@/lib/server/errors';
import { getDefaultPreferences } from './user-preferences';
import { authLogger } from '@/lib/logger';

// ============================================================================
// HELPER: Generate secure invitation token
// ============================================================================

function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

function generateTemporaryPassword(): string {
  // Strong random temporary password; user sets their own password on acceptance.
  return `${randomBytes(24).toString('base64url')}Aa1!`;
}

function isAuthUserAlreadyExists(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toLowerCase();
  return (
    code.includes('already') ||
    message.includes('already exists') ||
    message.includes('already registered') ||
    message.includes('duplicate')
  );
}

// ============================================================================
// HELPER: Generate invitation accept URL
// ============================================================================

function generateAcceptUrl(token: string): string {
  return `${getAppUrl()}/accept-invitation?token=${token}`;
}

// ============================================================================
// HELPER: Send invitation email via Trigger.dev
// Returns true if event was queued, false if queue failed (caller should surface to user)
// ============================================================================

async function sendInvitationEmail(params: {
  invitationId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  personalMessage?: string | null;
  token: string;
  expiresAt: Date;
}): Promise<boolean> {
  if (!isTriggerConfigured()) {
    authLogger.warn(
      'Trigger.dev not configured (missing TRIGGER_SECRET_KEY). Invitation email will not be sent.'
    );
    return false;
  }
  try {
    await client.sendEvent({
      name: userEvents.invitationSent,
      payload: {
        invitationId: params.invitationId,
        email: params.email,
        organizationId: params.organizationId,
        organizationName: params.organizationName,
        inviterName: params.inviterName,
        inviterEmail: params.inviterEmail,
        role: params.role,
        personalMessage: params.personalMessage || undefined,
        acceptUrl: generateAcceptUrl(params.token),
        expiresAt: params.expiresAt.toISOString(),
      } satisfies InvitationSentPayload,
    });
    return true;
  } catch (error) {
    authLogger.error('Failed to queue invitation email', error);
    return false;
  }
}

// ============================================================================
// SEND INVITATION
// ============================================================================

/**
 * Send an invitation to a new user.
 * Requires: user.invite permission
 */
export const sendInvitation = createServerFn({ method: 'POST' })
  .inputValidator(sendInvitationSchema)
  .handler(async ({ data }): Promise<Invitation> => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.invite });
    const normalizedEmail = data.email.toLowerCase();

    // Check if email already exists in organization
    const [existingUser] = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(
        and(eq(users.organizationId, ctx.organizationId), eq(users.email, normalizedEmail))
      )
      .limit(1);

    if (existingUser && existingUser.status !== 'invited') {
      throw new ConflictError('User with this email already exists in the organization');
    }

    // Check for pending invitation
    const existingInvitation = await db
      .select({ id: userInvitations.id })
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.organizationId, ctx.organizationId),
          eq(userInvitations.email, normalizedEmail),
          eq(userInvitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      throw new ConflictError('A pending invitation already exists for this email');
    }

    // Generate secure token
    const token = generateInvitationToken();

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Fetch organization name for the email
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    const supabase = createAdminSupabase();

    if (!existingUser) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: generateTemporaryPassword(),
        email_confirm: false,
      });

      if (authError || !authData.user?.id) {
        if (isAuthUserAlreadyExists(authError)) {
          throw new ConflictError('This email is already registered. Ask the user to sign in instead.');
        }
        throw new ServerError(`Failed to provision invited user: ${authError?.message ?? 'Unknown error'}`);
      }

      try {
        await db
          .insert(users)
          .values({
            authId: authData.user.id,
            organizationId: ctx.organizationId,
            email: normalizedEmail,
            role: data.role,
            status: 'invited',
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
      } catch (error) {
        // Compensating action: if app row fails, remove the pre-provisioned auth user.
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (deleteError) {
          authLogger.error('[sendInvitation] Failed to rollback auth user after DB failure', deleteError);
        }
        throw error;
      }
    } else if (existingUser.status === 'invited') {
      await db
        .update(users)
        .set({
          role: data.role,
          updatedBy: ctx.user.id,
        })
        .where(eq(users.id, existingUser.id));
    }

    // Create invitation
    const [invitation] = await db
      .insert(userInvitations)
      .values({
        organizationId: ctx.organizationId,
        email: normalizedEmail,
        role: data.role,
        invitedBy: ctx.user.id,
        token,
        expiresAt,
        personalMessage: data.personalMessage,
        createdBy: ctx.user.id,
      })
      .returning();

    // Send invitation email via Trigger.dev (await so we can surface queue failures)
    const emailQueued = await sendInvitationEmail({
      invitationId: invitation.id,
      email: invitation.email,
      organizationId: ctx.organizationId,
      organizationName: org?.name || 'Your Organization',
      inviterName: ctx.user.name || 'A team member',
      inviterEmail: ctx.user.email,
      role: invitation.role,
      personalMessage: data.personalMessage,
      token,
      expiresAt,
    });

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.INVITATION_SEND,
      entityType: AUDIT_ENTITY_TYPES.INVITATION,
      entityId: invitation.id,
      newValues: { email: invitation.email, role: invitation.role },
      metadata: { personalMessage: data.personalMessage ? true : false },
    });

    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      personalMessage: invitation.personalMessage,
      invitedAt: invitation.invitedAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      inviter: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
      },
      emailQueued,
    };
  });

// ============================================================================
// LIST INVITATIONS
// ============================================================================

/**
 * List invitations for the current organization.
 * Requires: user.read permission
 */
export const listInvitations = createServerFn({ method: 'GET' })
  .inputValidator(invitationFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const { page, pageSize, status } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [eq(userInvitations.organizationId, ctx.organizationId)];
    if (status) {
      conditions.push(eq(userInvitations.status, status));
    }

    // Get invitations with inviter info
    const invitations = await db
      .select({
        id: userInvitations.id,
        organizationId: userInvitations.organizationId,
        email: userInvitations.email,
        role: userInvitations.role,
        status: userInvitations.status,
        personalMessage: userInvitations.personalMessage,
        invitedAt: userInvitations.invitedAt,
        expiresAt: userInvitations.expiresAt,
        acceptedAt: userInvitations.acceptedAt,
        inviter: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(userInvitations)
      .leftJoin(users, eq(userInvitations.invitedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(userInvitations.invitedAt))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(userInvitations)
      .where(and(...conditions));

    return {
      items: invitations,
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

/**
 * Get org-level invitation stats across all pages.
 * Requires: user.read permission
 */
export const listInvitationStats = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const [stats] = await db
      .select({
        total: drizzleCount(),
        pending: sql<number>`count(*) filter (where ${userInvitations.status} = 'pending')`,
        accepted: sql<number>`count(*) filter (where ${userInvitations.status} = 'accepted')`,
        expired: sql<number>`count(*) filter (where ${userInvitations.status} = 'expired')`,
      })
      .from(userInvitations)
      .where(eq(userInvitations.organizationId, ctx.organizationId));

    return {
      total: Number(stats?.total ?? 0),
      pending: Number(stats?.pending ?? 0),
      accepted: Number(stats?.accepted ?? 0),
      expired: Number(stats?.expired ?? 0),
    };
  });

/**
 * List invitations with cursor pagination (recommended for large datasets).
 * Uses invitedAt + id for stable sort.
 */
export const listInvitationsCursor = createServerFn({ method: 'GET' })
  .inputValidator(invitationCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', status } = data;

    const conditions = [eq(userInvitations.organizationId, ctx.organizationId)];
    if (status) conditions.push(eq(userInvitations.status, status));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(userInvitations.invitedAt, userInvitations.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const invitations = await db
      .select({
        id: userInvitations.id,
        organizationId: userInvitations.organizationId,
        email: userInvitations.email,
        role: userInvitations.role,
        status: userInvitations.status,
        personalMessage: userInvitations.personalMessage,
        invitedAt: userInvitations.invitedAt,
        expiresAt: userInvitations.expiresAt,
        acceptedAt: userInvitations.acceptedAt,
        inviter: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(userInvitations)
      .leftJoin(users, eq(userInvitations.invitedBy, users.id))
      .where(and(...conditions))
      .orderBy(orderDir(userInvitations.invitedAt), orderDir(userInvitations.id))
      .limit(pageSize + 1);

    return buildCursorResponse(
      invitations,
      pageSize,
      (i) => (i.invitedAt instanceof Date ? i.invitedAt.toISOString() : i.invitedAt),
      (i) => i.id
    );
  });

// ============================================================================
// GET INVITATION BY TOKEN (public)
// ============================================================================

const getInvitationByTokenSchema = z.object({
  token: z.string().min(1),
});

/**
 * Get invitation details by token.
 * Public endpoint - no authentication required.
 * Used when user clicks invitation link.
 * Rate limited: 20 requests per minute per IP.
 */
export const getInvitationByToken = createServerFn({ method: 'GET' })
  .inputValidator(getInvitationByTokenSchema)
  .handler(async ({ data }) => {
    // Rate limit check
    const request = getRequest();
    const clientId = getClientIdentifier(request);
    checkRateLimit('invitation-lookup', clientId, RATE_LIMITS.publicLookup);

    const [invitation] = await db
      .select({
        id: userInvitations.id,
        email: userInvitations.email,
        role: userInvitations.role,
        status: userInvitations.status,
        personalMessage: userInvitations.personalMessage,
        expiresAt: userInvitations.expiresAt,
        organizationName: organizations.name,
        inviterName: users.name,
      })
      .from(userInvitations)
      .innerJoin(organizations, eq(userInvitations.organizationId, organizations.id))
      .leftJoin(users, eq(userInvitations.invitedBy, users.id))
      .where(eq(userInvitations.token, data.token))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invalid invitation', 'invitation');
    }

    // Check if expired
    if (invitation.status === 'pending' && new Date() > invitation.expiresAt) {
      // Mark as expired
      await db
        .update(userInvitations)
        .set({ status: 'expired' })
        .where(eq(userInvitations.token, data.token));

      throw new ValidationError('Invitation has expired');
    }

    if (invitation.status !== 'pending') {
      throw new ValidationError(`Invitation is ${invitation.status}`);
    }

    return {
      email: invitation.email,
      role: invitation.role,
      personalMessage: invitation.personalMessage,
      organizationName: invitation.organizationName,
      inviterName: invitation.inviterName,
      expiresAt: invitation.expiresAt,
    };
  });

// ============================================================================
// ACCEPT INVITATION
// ============================================================================

/**
 * Accept an invitation and activate pre-provisioned user account.
 * Public endpoint - uses token for authentication.
 * Rate limited: 5 requests per minute per IP.
 *
 * Uses database transaction with row locking to prevent race conditions
 * where multiple requests could accept the same invitation.
 */
export const acceptInvitation = createServerFn({ method: 'POST' })
  .inputValidator(acceptInvitationApiSchema)
  .handler(async ({ data }) => {
    // Rate limit check (outside transaction)
    const request = getRequest();
    const clientId = getClientIdentifier(request);
    checkRateLimit('invitation-accept', clientId, RATE_LIMITS.publicAction);

    // Lookup invitation first so we can create auth account with the canonical invitation email.
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(and(eq(userInvitations.token, data.token), eq(userInvitations.status, 'pending')))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation', 'invitation');
    }

    if (new Date() > invitation.expiresAt) {
      await db
        .update(userInvitations)
        .set({ status: 'expired', version: sql<number>`${userInvitations.version} + 1` })
        .where(eq(userInvitations.id, invitation.id));
      throw new ValidationError('Invitation has expired');
    }

    // Admin invite flow must pre-provision the org user; acceptance should claim/activate it.
    const [existingProvisionedUser] = await db
      .select({
        id: users.id,
        authId: users.authId,
        status: users.status,
      })
      .from(users)
      .where(
        and(eq(users.organizationId, invitation.organizationId), eq(users.email, invitation.email))
      )
      .limit(1);

    const supabase = createAdminSupabase();

    // Backward compatibility: older invitations may exist without pre-provisioned users.
    const provisionedUser =
      existingProvisionedUser ??
      (await (async () => {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: invitation.email,
          password: generateTemporaryPassword(),
          email_confirm: false,
        });

        if (authError || !authData.user?.id) {
          throw new ServerError(`Failed to provision invited user: ${authError?.message ?? 'Unknown error'}`);
        }

        let createdUser: { id: string; authId: string; status: 'active' | 'invited' | 'suspended' | 'deactivated' };
        try {
          [createdUser] = await db
            .insert(users)
            .values({
              authId: authData.user.id,
              organizationId: invitation.organizationId,
              email: invitation.email,
              role: invitation.role,
              status: 'invited',
            })
            .returning({ id: users.id, authId: users.authId, status: users.status });
        } catch (error) {
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
          } catch (deleteError) {
            authLogger.error('[acceptInvitation] Failed to rollback auth user during legacy provisioning', deleteError);
          }
          throw error;
        }

        return createdUser;
      })());
    if (provisionedUser.status !== 'invited') {
      throw new ConflictError(`Invitation cannot be accepted because user is ${provisionedUser.status}.`);
    }
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(provisionedUser.authId, {
      password: data.password,
      email_confirm: true,
    });

    if (updateAuthError) {
      throw new ServerError(`Failed to activate account: ${updateAuthError.message}`);
    }

    const result = await db.transaction(async (tx) => {
        // Use optimistic locking to ensure only one accept succeeds.
        const updateResult = await tx
          .update(userInvitations)
          .set({
            status: 'accepted',
            acceptedAt: new Date(),
            version: sql<number>`${userInvitations.version} + 1`,
          })
          .where(
            and(
              eq(userInvitations.id, invitation.id),
              eq(userInvitations.status, 'pending'),
              eq(userInvitations.version, invitation.version)
            )
          )
          .returning({ id: userInvitations.id });

        if (updateResult.length === 0) {
          throw new ConflictError('Invitation has already been accepted');
        }

        const [activatedUser] = await tx
          .update(users)
          .set({
            name:
              data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName}`
                : data.firstName || data.lastName || null,
            role: invitation.role,
            status: 'active',
            profile: {
              firstName: data.firstName,
              lastName: data.lastName,
            },
            updatedBy: provisionedUser.id,
          })
          .where(eq(users.id, provisionedUser.id))
          .returning({ id: users.id, email: users.email });

        const defaultPreferences = getDefaultPreferences(invitation.role);
        if (defaultPreferences.length > 0) {
          await tx
            .insert(userPreferences)
            .values(
              defaultPreferences.map((pref) => ({
                organizationId: invitation.organizationId,
                userId: activatedUser.id,
                category: pref.category,
                key: pref.key,
                value: pref.value,
                createdBy: activatedUser.id,
                updatedBy: activatedUser.id,
              }))
            )
            .onConflictDoNothing();
        }

        return {
          userId: activatedUser.id,
          email: activatedUser.email,
        };
      });

    await logAuditEvent({
      organizationId: invitation.organizationId,
      userId: result.userId,
      action: AUDIT_ACTIONS.INVITATION_ACCEPT,
      entityType: AUDIT_ENTITY_TYPES.INVITATION,
      entityId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    });

    return {
      success: true,
      userId: result.userId,
      email: result.email,
    };
  });

// ============================================================================
// CANCEL INVITATION
// ============================================================================

/**
 * Cancel a pending invitation.
 * Requires: user.invite permission
 */
export const cancelInvitation = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.invite });

    // Verify invitation belongs to organization and is pending
    const [invitation] = await db
      .select({ id: userInvitations.id, status: userInvitations.status })
      .from(userInvitations)
      .where(
        and(eq(userInvitations.id, data.id), eq(userInvitations.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invitation not found', 'invitation');
    }

    if (invitation.status !== 'pending') {
      throw new ValidationError(`Cannot cancel invitation that is ${invitation.status}`);
    }

    // Cancel
    await db
      .update(userInvitations)
      .set({
        status: 'cancelled',
        updatedBy: ctx.user.id,
        version: sql<number>`${userInvitations.version} + 1`,
      })
      .where(eq(userInvitations.id, data.id));

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.INVITATION_CANCEL,
      entityType: AUDIT_ENTITY_TYPES.INVITATION,
      entityId: data.id,
      oldValues: { status: 'pending' },
      newValues: { status: 'cancelled' },
    });

    return { success: true };
  });

// ============================================================================
// RESEND INVITATION
// ============================================================================

/**
 * Resend an invitation email with a new token.
 * Requires: user.invite permission
 */
export const resendInvitation = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.invite });

    // Verify invitation belongs to organization
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(
        and(eq(userInvitations.id, data.id), eq(userInvitations.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invitation not found', 'invitation');
    }

    if (invitation.status === 'accepted') {
      throw new ValidationError('Cannot resend accepted invitation');
    }

    // Generate new token and extend expiry
    const newToken = generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Fetch organization name for the email
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    // Update invitation
    await db
      .update(userInvitations)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'pending', // Reset to pending if was expired
        updatedBy: ctx.user.id,
        version: sql<number>`${userInvitations.version} + 1`,
      })
      .where(eq(userInvitations.id, data.id));

    // Send invitation email via Trigger.dev (await so we can surface queue failures)
    const emailQueued = await sendInvitationEmail({
      invitationId: invitation.id,
      email: invitation.email,
      organizationId: ctx.organizationId,
      organizationName: org?.name || 'Your Organization',
      inviterName: ctx.user.name || 'A team member',
      inviterEmail: ctx.user.email,
      role: invitation.role,
      personalMessage: invitation.personalMessage,
      token: newToken,
      expiresAt: newExpiresAt,
    });

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.INVITATION_RESEND,
      entityType: AUDIT_ENTITY_TYPES.INVITATION,
      entityId: data.id,
      metadata: { email: invitation.email, newExpiresAt: newExpiresAt.toISOString() },
    });

    return { success: true, emailQueued };
  });

// ============================================================================
// EXPIRE OLD INVITATIONS (background job)
// ============================================================================

/**
 * Mark expired invitations as expired.
 *
 * @deprecated Use the Trigger.dev scheduled job instead: src/trigger/jobs/expire-invitations.ts
 * This function is kept for backwards compatibility but should not be called directly.
 * The Trigger.dev job runs automatically on a schedule.
 *
 * @internal
 */
const expireInvitationsSchema = z.object({});

export const expireOldInvitations = createServerFn({ method: 'POST' })
  .inputValidator(expireInvitationsSchema)
  .handler(async () => {
  await withInternalAuth();

  const result = await db
    .update(userInvitations)
    .set({ status: 'expired' })
    .where(and(eq(userInvitations.status, 'pending'), lt(userInvitations.expiresAt, new Date())))
    .returning({ id: userInvitations.id });

  return {
    expiredCount: result.length,
  };
});

// ============================================================================
// BATCH SEND INVITATIONS
// ============================================================================

/**
 * Send multiple invitations in a batch.
 * Processes invitations in parallel batches for better performance.
 * Requires: user.invite permission
 */
export const batchSendInvitations = createServerFn({ method: 'POST' })
  .inputValidator(batchSendInvitationsSchema)
  .handler(
    async ({
      data,
    }): Promise<{
      results: BatchInvitationResult[];
      summary: { total: number; success: number; failed: number; emailQueued: boolean };
    }> => {
      const ctx = await withAuth({ permission: PERMISSIONS.user.invite });

      const supabase = createAdminSupabase();

      // Check for existing users and pending invitations in bulk
      const [existingUsers, existingInvitations] = await Promise.all([
        // Check existing users
        db
          .select({
            id: users.id,
            email: users.email,
            status: users.status,
          })
          .from(users)
          .where(eq(users.organizationId, ctx.organizationId)),
        // Check pending invitations
        db
          .select({ email: userInvitations.email })
          .from(userInvitations)
          .where(
            and(
              eq(userInvitations.organizationId, ctx.organizationId),
              eq(userInvitations.status, 'pending')
            )
          ),
      ]);

      const existingUsersByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));
      const existingInvitationEmails = new Set(
        existingInvitations.map((i) => i.email.toLowerCase())
      );

      // Process invitations
      type InvitationRole = 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
      const results: BatchInvitationResult[] = [];
      const toInsert: Array<{
        email: string;
        role: InvitationRole;
        personalMessage?: string;
        token: string;
        expiresAt: Date;
        existingInvitedUserId?: string;
      }> = [];

      // Pre-validate and prepare
      for (const invitation of data.invitations) {
        const email = invitation.email.toLowerCase();
        const existingUser = existingUsersByEmail.get(email);

        if (existingUser && existingUser.status !== 'invited') {
          results.push({
            email,
            success: false,
            error: 'User already exists in organization',
          });
          continue;
        }

        if (existingInvitationEmails.has(email)) {
          results.push({
            email,
            success: false,
            error: 'Pending invitation already exists',
          });
          continue;
        }

        // Prepare for insert
        const token = generateInvitationToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        toInsert.push({
          email,
          role: invitation.role as InvitationRole,
          personalMessage: invitation.personalMessage,
          token,
          expiresAt,
          existingInvitedUserId: existingUser?.status === 'invited' ? existingUser.id : undefined,
        });
      }

      // Fetch organization name for emails
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId))
        .limit(1);

      const organizationName = org?.name || 'Your Organization';

      // Track successful inserts for email sending
      const emailInvitations: Array<{
        invitationId: string;
        email: string;
        role: string;
        personalMessage?: string;
        token: string;
        expiresAt: Date;
      }> = [];

      const readyInvitations: Array<{
        email: string;
        role: InvitationRole;
        personalMessage?: string;
        token: string;
        expiresAt: Date;
      }> = [];

      // Ensure each invited email has a pre-provisioned org user before invitation is sent.
      for (const item of toInsert) {
        if (item.existingInvitedUserId) {
          await db
            .update(users)
            .set({
              role: item.role,
              updatedBy: ctx.user.id,
            })
            .where(eq(users.id, item.existingInvitedUserId));
          readyInvitations.push(item);
          continue;
        }

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: item.email,
          password: generateTemporaryPassword(),
          email_confirm: false,
        });

        if (authError || !authData.user?.id) {
          results.push({
            email: item.email,
            success: false,
            error: isAuthUserAlreadyExists(authError)
              ? 'Email already registered'
              : authError?.message || 'Failed to provision invited user',
          });
          continue;
        }

        try {
          await db.insert(users).values({
            authId: authData.user.id,
            organizationId: ctx.organizationId,
            email: item.email,
            role: item.role,
            status: 'invited',
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
          readyInvitations.push(item);
        } catch (error) {
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
          } catch (deleteError) {
            authLogger.error('[batchSendInvitations] Failed to rollback auth user after DB failure', deleteError);
          }

          results.push({
            email: item.email,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to provision invited user',
          });
        }
      }

      // Batch insert valid invitations
      if (readyInvitations.length > 0) {
        const BATCH_SIZE = 10;

        for (let i = 0; i < readyInvitations.length; i += BATCH_SIZE) {
          const batch = readyInvitations.slice(i, i + BATCH_SIZE);

          try {
            const inserted = await db
              .insert(userInvitations)
              .values(
                batch.map((item) => ({
                  organizationId: ctx.organizationId,
                  email: item.email,
                  role: item.role,
                  invitedBy: ctx.user.id,
                  token: item.token,
                  expiresAt: item.expiresAt,
                  personalMessage: item.personalMessage,
                  createdBy: ctx.user.id,
                }))
              )
              .returning({ id: userInvitations.id, email: userInvitations.email });

            // Mark all as successful and track for email
            for (const inv of inserted) {
              results.push({
                email: inv.email,
                success: true,
                invitationId: inv.id,
              });

              // Find the original item to get token and other details
              const originalItem = batch.find((b) => b.email === inv.email);
              if (originalItem) {
                emailInvitations.push({
                  invitationId: inv.id,
                  email: inv.email,
                  role: originalItem.role,
                  personalMessage: originalItem.personalMessage,
                  token: originalItem.token,
                  expiresAt: originalItem.expiresAt,
                });
              }
            }
          } catch (err) {
            // If batch fails, mark all in batch as failed
            for (const item of batch) {
              results.push({
                email: item.email,
                success: false,
                error: err instanceof Error ? err.message : 'Database error',
              });
            }
          }
        }
      }

      // Send batch invitation emails via Trigger.dev (await so we can surface queue failures)
      let emailQueued = true;
      if (emailInvitations.length > 0) {
        try {
          await client.sendEvent({
            name: 'user.batch_invitation_sent',
            payload: {
              organizationId: ctx.organizationId,
              organizationName,
              inviterName: ctx.user.name || 'A team member',
              inviterEmail: ctx.user.email,
              invitations: emailInvitations.map((inv) => ({
                invitationId: inv.invitationId,
                email: inv.email,
                role: inv.role,
                personalMessage: inv.personalMessage,
                acceptUrl: generateAcceptUrl(inv.token),
                expiresAt: inv.expiresAt.toISOString(),
              })),
            } satisfies BatchInvitationSentPayload,
          });
        } catch (error) {
          authLogger.error('Failed to queue batch invitation emails', error);
          emailQueued = false;
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const successfulInvitations = results.filter((r) => r.success);

      // Log audit event for batch operation
      if (successCount > 0) {
        await logAuditEvent({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          action: AUDIT_ACTIONS.INVITATION_SEND,
          entityType: AUDIT_ENTITY_TYPES.INVITATION,
          metadata: {
            batchOperation: true,
            totalRequested: data.invitations.length,
            successCount,
            failedCount: data.invitations.length - successCount,
            invitedEmails: successfulInvitations.map((r) => r.email),
          },
        });
      }

      return {
        results,
        summary: {
          total: data.invitations.length,
          success: successCount,
          failed: data.invitations.length - successCount,
          emailQueued,
        },
      };
    }
  );
