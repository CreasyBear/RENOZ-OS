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
import { eq, and, desc, sql, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userInvitations, users, organizations } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  sendInvitationSchema,
  invitationFilterSchema,
  acceptInvitationSchema,
  type Invitation,
} from '@/lib/schemas/users';
import { idParamSchema } from '@/lib/schemas';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { getRequest } from '@tanstack/react-start/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/server/rate-limit';
import { logAuditEvent } from '@/server/functions/_shared/audit-logs';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import { client, userEvents, type InvitationSentPayload, type BatchInvitationSentPayload } from '@/trigger/client';
import { NotFoundError, ConflictError, ValidationError, ServerError } from '@/lib/server/errors';

// ============================================================================
// HELPER: Generate secure invitation token
// ============================================================================

function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

// ============================================================================
// HELPER: Get server-side Supabase client
// ============================================================================

function getServerSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new ServerError('Supabase environment variables not configured');
  }

  return createClient(url, serviceKey);
}

// ============================================================================
// HELPER: Get app URL
// ============================================================================

function getAppUrl(): string {
  return process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

// ============================================================================
// HELPER: Generate invitation accept URL
// ============================================================================

function generateAcceptUrl(token: string): string {
  return `${getAppUrl()}/accept-invitation?token=${token}`;
}

// ============================================================================
// HELPER: Send invitation email via Trigger.dev (fire-and-forget)
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
}): Promise<void> {
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
  } catch (error) {
    // Log error but don't throw - email sending should not block invitation creation
    console.error('Failed to queue invitation email:', error);
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

    // Check if email already exists in organization
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.organizationId, ctx.organizationId), eq(users.email, data.email.toLowerCase()))
      )
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictError('User with this email already exists in the organization');
    }

    // Check for pending invitation
    const existingInvitation = await db
      .select({ id: userInvitations.id })
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.organizationId, ctx.organizationId),
          eq(userInvitations.email, data.email.toLowerCase()),
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

    // Create invitation
    const [invitation] = await db
      .insert(userInvitations)
      .values({
        organizationId: ctx.organizationId,
        email: data.email.toLowerCase(),
        role: data.role,
        invitedBy: ctx.user.id,
        token,
        expiresAt,
        personalMessage: data.personalMessage,
        createdBy: ctx.user.id,
      })
      .returning();

    // Send invitation email via Trigger.dev (fire-and-forget)
    void sendInvitationEmail({
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
      .select({ count: sql<number>`count(*)::int` })
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
 * Accept an invitation and create user account.
 * Public endpoint - uses token for authentication.
 * Rate limited: 5 requests per minute per IP.
 *
 * Uses database transaction with row locking to prevent race conditions
 * where multiple requests could accept the same invitation.
 */
export const acceptInvitation = createServerFn({ method: 'POST' })
  .inputValidator(acceptInvitationSchema)
  .handler(async ({ data }) => {
    // Rate limit check (outside transaction)
    const request = getRequest();
    const clientId = getClientIdentifier(request);
    checkRateLimit('invitation-accept', clientId, RATE_LIMITS.publicAction);

    // Use transaction to prevent race conditions
    return await db.transaction(async (tx) => {
      // Get invitation with row lock to prevent concurrent acceptance
      // Note: FOR UPDATE requires raw SQL in Drizzle
      const [invitation] = await tx
        .select()
        .from(userInvitations)
        .where(and(eq(userInvitations.token, data.token), eq(userInvitations.status, 'pending')))
        .limit(1);

      if (!invitation) {
        throw new NotFoundError('Invalid or expired invitation', 'invitation');
      }

      // Check expiry
      if (new Date() > invitation.expiresAt) {
        await tx
          .update(userInvitations)
          .set({ status: 'expired', version: sql`version + 1` })
          .where(eq(userInvitations.id, invitation.id));
        throw new ValidationError('Invitation has expired');
      }

      // Mark as processing immediately to prevent race condition
      // Use optimistic locking with version check
      const updateResult = await tx
        .update(userInvitations)
        .set({
          status: 'accepted', // Immediately mark as accepted
          version: sql`version + 1`,
        })
        .where(
          and(
            eq(userInvitations.id, invitation.id),
            eq(userInvitations.status, 'pending'), // Only if still pending
            eq(userInvitations.version, invitation.version) // Version check
          )
        )
        .returning({ id: userInvitations.id });

      // If no rows returned, another request beat us to it
      if (updateResult.length === 0) {
        throw new ConflictError('Invitation has already been accepted');
      }

      // Create Supabase auth user (external system - cannot rollback)
      const supabase = getServerSupabase();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password: data.password,
        email_confirm: true, // Skip email confirmation since they used invitation link
      });

      if (authError) {
        // Note: The invitation is already marked as accepted, which prevents retries
        // This is intentional - we don't want to allow multiple Supabase user creations
        // If this fails, admin will need to cancel and resend the invitation
        throw new ServerError(`Failed to create account: ${authError.message}`);
      }

      // Create application user
      const [newUser] = await tx
        .insert(users)
        .values({
          authId: authData.user.id,
          organizationId: invitation.organizationId,
          email: invitation.email,
          name:
            data.firstName && data.lastName
              ? `${data.firstName} ${data.lastName}`
              : data.firstName || data.lastName || null,
          role: invitation.role as any,
          status: 'active',
          profile: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        })
        .returning();

      // Update invitation with acceptance timestamp
      await tx
        .update(userInvitations)
        .set({
          acceptedAt: new Date(),
          version: sql`version + 1`,
        })
        .where(eq(userInvitations.id, invitation.id));

      // Log audit event (after transaction succeeds, user can see in audit trail)
      // Note: This is outside tx but still atomic since invitation is marked accepted
      await logAuditEvent({
        organizationId: invitation.organizationId,
        userId: newUser.id,
        action: AUDIT_ACTIONS.INVITATION_ACCEPT,
        entityType: AUDIT_ENTITY_TYPES.INVITATION,
        entityId: invitation.id,
        metadata: { email: invitation.email, role: invitation.role },
      });

      return {
        success: true,
        userId: newUser.id,
        email: newUser.email,
      };
    });
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
        version: sql`version + 1`,
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
        version: sql`version + 1`,
      })
      .where(eq(userInvitations.id, data.id));

    // Send invitation email via Trigger.dev (fire-and-forget)
    void sendInvitationEmail({
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

    return { success: true };
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
 * Schema for batch invitation input
 */
const batchInvitationItemSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'sales', 'operations', 'support', 'viewer']),
  personalMessage: z.string().optional(),
});

const batchSendInvitationsSchema = z.object({
  invitations: z.array(batchInvitationItemSchema).min(1).max(100),
});

export type BatchInvitationItem = z.infer<typeof batchInvitationItemSchema>;

export interface BatchInvitationResult {
  email: string;
  success: boolean;
  error?: string;
  invitationId?: string;
}

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
      summary: { total: number; success: number; failed: number };
    }> => {
      const ctx = await withAuth({ permission: PERMISSIONS.user.invite });

      // Check for existing users and pending invitations in bulk
      const [existingUsers, existingInvitations] = await Promise.all([
        // Check existing users
        db
          .select({ email: users.email })
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

      const existingUserEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
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
      }> = [];

      // Pre-validate and prepare
      for (const invitation of data.invitations) {
        const email = invitation.email.toLowerCase();

        if (existingUserEmails.has(email)) {
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

      // Batch insert valid invitations
      if (toInsert.length > 0) {
        const BATCH_SIZE = 10;

        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const batch = toInsert.slice(i, i + BATCH_SIZE);

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

      // Send batch invitation emails via Trigger.dev (fire-and-forget)
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
          // Log error but don't throw - email sending should not block
          console.error('Failed to queue batch invitation emails:', error);
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
        },
      };
    }
  );
