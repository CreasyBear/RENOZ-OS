/**
 * OAuth Health Endpoint
 *
 * GET /api/oauth/health
 */

import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db';

export async function GET() {
  const ctx = await withAuth({ permission: PERMISSIONS.organization.read });
  const { bulkHealthCheck } = await import('@/server/functions/oauth/health');
  const result = await bulkHealthCheck(db, { organizationId: ctx.organizationId });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const healthMap: Record<string, unknown> = {};
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
