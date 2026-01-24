/**
 * OAuth Connection Endpoint
 *
 * DELETE /api/oauth/connections/:connectionId
 */

import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { deleteOAuthConnection } from '@/server/functions/oauth/connections';

export async function DELETE({
  params,
}: {
  params: { connectionId: string };
}) {
  const ctx = await withAuth();

  const result = await deleteOAuthConnection(db, {
    connectionId: params.connectionId,
    organizationId: ctx.organizationId,
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
