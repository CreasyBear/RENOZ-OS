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
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(url, serviceKey);
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
      throw new Error('User with this email already exists in the organization');
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
      throw new Error('A pending invitation already exists for this email');
    }

    // Generate secure token
    const token = generateInvitationToken();

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

    // TODO: Send invitation email via email service

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
      throw new Error('Invalid invitation');
    }

    // Check if expired
    if (invitation.status === 'pending' && new Date() > invitation.expiresAt) {
      // Mark as expired
      await db
        .update(userInvitations)
        .set({ status: 'expired' })
        .where(eq(userInvitations.token, data.token));

      throw new Error('Invitation has expired');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is ${invitation.status}`);
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
 */
export const acceptInvitation = createServerFn({ method: 'POST' })
  .inputValidator(acceptInvitationSchema)
  .handler(async ({ data }) => {
    // Rate limit check
    const request = getRequest();
    const clientId = getClientIdentifier(request);
    checkRateLimit('invitation-accept', clientId, RATE_LIMITS.publicAction);

    // Get invitation
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(and(eq(userInvitations.token, data.token), eq(userInvitations.status, 'pending')))
      .limit(1);

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check expiry
    if (new Date() > invitation.expiresAt) {
      await db
        .update(userInvitations)
        .set({ status: 'expired' })
        .where(eq(userInvitations.id, invitation.id));
      throw new Error('Invitation has expired');
    }

    // Create Supabase auth user
    const supabase = getServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: data.password,
      email_confirm: true, // Skip email confirmation since they used invitation link
    });

    if (authError) {
      throw new Error(`Failed to create account: ${authError.message}`);
    }

    // Create application user
    const [newUser] = await db
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

    // Mark invitation as accepted
    await db
      .update(userInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        version: sql`version + 1`,
      })
      .where(eq(userInvitations.id, invitation.id));

    return {
      success: true,
      userId: newUser.id,
      email: newUser.email,
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
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Cannot cancel invitation that is ${invitation.status}`);
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
      throw new Error('Invitation not found');
    }

    if (invitation.status === 'accepted') {
      throw new Error('Cannot resend accepted invitation');
    }

    // Generate new token and extend expiry
    const newToken = generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

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

    // TODO: Send invitation email via email service

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
export const expireOldInvitations = createServerFn({ method: 'POST' }).handler(async () => {
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

            // Mark all as successful
            for (const inv of inserted) {
              results.push({
                email: inv.email,
                success: true,
                invitationId: inv.id,
              });
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

      // TODO: Send invitation emails via email service (could be queued)

      const successCount = results.filter((r) => r.success).length;

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
