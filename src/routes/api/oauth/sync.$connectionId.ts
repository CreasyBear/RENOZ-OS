/**
 * OAuth Sync Endpoint
 *
 * POST /api/oauth/sync/:connectionId
 */

import { createFileRoute } from '@tanstack/react-router';
import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { oauthConnections } from 'drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function handleSync({
  params,
  request,
}: {
  params: { connectionId: string };
  request: Request;
}) {
  const ctx = await withAuth();
  const body = await request.json().catch(() => ({}));
  const fullSync = Boolean(body.fullSync);

  const [connection] = await db
    .select({
      id: oauthConnections.id,
      organizationId: oauthConnections.organizationId,
      serviceType: oauthConnections.serviceType,
    })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.id, params.connectionId),
        eq(oauthConnections.organizationId, ctx.organizationId)
      )
    )
    .limit(1);

  if (!connection) {
    return new Response(JSON.stringify({ error: 'Connection not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let result: unknown;

  switch (connection.serviceType) {
    case 'calendar': {
      const { syncCalendar } = await import('@/server/functions/oauth/calendar-sync');
      result = await syncCalendar(db, { connectionId: connection.id, fullSync });
      break;
    }
    case 'email': {
      const { syncEmails } = await import('@/server/functions/oauth/email-sync');
      result = await syncEmails(db, {
        connectionId: connection.id,
        organizationId: ctx.organizationId,
        fullSync,
      });
      break;
    }
    case 'contacts': {
      const { syncContacts } = await import('@/server/functions/oauth/contacts-sync');
      result = await syncContacts(db, {
        connectionId: connection.id,
        organizationId: ctx.organizationId,
        fullSync,
      });
      break;
    }
    default:
      return new Response(JSON.stringify({ error: 'Unsupported service type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const Route = createFileRoute('/api/oauth/sync/$connectionId')({
  server: {
    handlers: {
      POST: handleSync,
    },
  },
});
