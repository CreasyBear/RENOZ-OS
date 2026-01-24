/**
 * OAuth Sync Endpoint
 *
 * POST /api/oauth/sync/:connectionId
 */

import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { oauthConnections } from '@/../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { syncCalendar } from '@/server/functions/oauth/calendar-sync';
import { syncEmails } from '@/server/functions/oauth/email-sync';
import { syncContacts } from '@/server/functions/oauth/contacts-sync';

export async function POST({
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

  let result:
    | Awaited<ReturnType<typeof syncCalendar>>
    | Awaited<ReturnType<typeof syncEmails>>
    | Awaited<ReturnType<typeof syncContacts>>;

  switch (connection.serviceType) {
    case 'calendar':
      result = await syncCalendar(db, { connectionId: connection.id, fullSync });
      break;
    case 'email':
      result = await syncEmails(db, {
        connectionId: connection.id,
        organizationId: ctx.organizationId,
        fullSync,
      });
      break;
    case 'contacts':
      result = await syncContacts(db, {
        connectionId: connection.id,
        organizationId: ctx.organizationId,
        fullSync,
      });
      break;
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
