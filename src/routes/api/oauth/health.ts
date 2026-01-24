/**
 * OAuth Health Endpoint
 *
 * GET /api/oauth/health
 */

import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { bulkHealthCheck } from '@/server/functions/oauth/health';

export async function GET() {
  const ctx = await withAuth();
  const result = await bulkHealthCheck(db, { organizationId: ctx.organizationId });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const healthMap: Record<string, any> = {};
  for (const check of result.result.results) {
    healthMap[check.connectionId] = {
      status: check.overallStatus,
      lastChecked: check.lastChecked,
      responseTime: check.metadata?.responseTime,
      errorMessage: check.metadata?.errorMessage,
    };
  }

  return new Response(JSON.stringify({ health: healthMap }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
