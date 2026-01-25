import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { portalIdentities } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerUser } from '@/lib/supabase/server';
import { getRequest } from '@tanstack/react-start/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/server/rate-limit';
import {
  getPortalIdentitySchema,
  requestPortalLinkSchema,
  revokePortalAccessSchema,
} from '@/lib/schemas/portal';
import { AuthError, NotFoundError } from '@/lib/server/errors';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from 'drizzle/schema';

// ============================================================================
// REQUEST PORTAL LINK (ADMIN)
// ============================================================================

export const requestPortalLink = createServerFn({ method: 'POST' })
  .inputValidator(requestPortalLinkSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });
    const request = getRequest();
    const clientId = getClientIdentifier(request);
    checkRateLimit('portal-link-request', clientId, RATE_LIMITS.publicAction);

    const admin = createAdminClient();

    const email = data.email.toLowerCase();
    const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
    const redirectTo = data.redirectTo ?? `${appUrl}/portal/confirm?next=/portal`;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });

    if (linkError) {
      throw new Error(linkError.message);
    }

    const authUserId = linkData?.user?.id;
    if (!authUserId) {
      throw new Error('Failed to resolve auth user for portal identity');
    }

    // Upsert portal identity
    const [identity] = await db
      .insert(portalIdentities)
      .values({
        organizationId: ctx.organizationId,
        authUserId,
        scope: data.scope,
        status: 'active',
        customerId: data.customerId,
        contactId: data.contactId,
        jobAssignmentId: data.jobAssignmentId,
      })
      .onConflictDoUpdate({
        target: [portalIdentities.organizationId, portalIdentities.authUserId],
        set: {
          scope: data.scope,
          status: 'active',
          customerId: data.customerId,
          contactId: data.contactId,
          jobAssignmentId: data.jobAssignmentId,
          revokedAt: sql`null`,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.SESSION_CREATE,
      entityType: AUDIT_ENTITY_TYPES.SESSION,
      entityId: identity.id,
      newValues: {
        email,
        scope: identity.scope,
        authUserId: identity.authUserId,
      },
    });

    return {
      portalIdentity: identity,
      actionLink: linkData?.properties?.action_link,
    };
  });

// ============================================================================
// GET PORTAL IDENTITY (PORTAL USER)
// ============================================================================

export const getPortalIdentity = createServerFn({ method: 'GET' })
  .inputValidator(getPortalIdentitySchema)
  .handler(async () => {
    const request = getRequest();
    const authUser = await getServerUser(request);
    if (!authUser) {
      throw new AuthError('Portal authentication required');
    }

    const [identity] = await db
      .select()
      .from(portalIdentities)
      .where(
        and(eq(portalIdentities.authUserId, authUser.id), eq(portalIdentities.status, 'active'))
      )
      .limit(1);

    if (!identity) {
      throw new NotFoundError('Portal identity not found');
    }

    await db
      .update(portalIdentities)
      .set({ lastSeenAt: new Date() })
      .where(eq(portalIdentities.id, identity.id));

    return identity;
  });

// ============================================================================
// REVOKE PORTAL ACCESS (ADMIN)
// ============================================================================

export const revokePortalAccess = createServerFn({ method: 'POST' })
  .inputValidator(revokePortalAccessSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    const [identity] = await db
      .update(portalIdentities)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(
        and(
          eq(portalIdentities.id, data.portalIdentityId),
          eq(portalIdentities.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!identity) {
      throw new NotFoundError('Portal identity not found');
    }

    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.SESSION_TERMINATE,
      entityType: AUDIT_ENTITY_TYPES.SESSION,
      entityId: identity.id,
      newValues: {
        status: identity.status,
        revokedAt: identity.revokedAt,
      },
    });

    return identity;
  });
