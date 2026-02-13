/**
 * OAuth Connections Endpoint
 *
 * GET /api/oauth/connections
 */

import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db';
import { listOAuthConnections } from '@/server/functions/oauth/connections';
import {
  OAuthProviderSchema,
  OAuthServiceTypeSchema,
} from '@/lib/schemas/oauth/connection-filters';

export async function GET({ request }: { request: Request }) {
  const ctx = await withAuth({ permission: PERMISSIONS.organization.manageIntegrations });
  const url = new URL(request.url);
  const providerParam = url.searchParams.get('provider') || undefined;
  const serviceTypeParam = url.searchParams.get('serviceType') || undefined;
  const isActiveParam = url.searchParams.get('isActive');
  const isActive =
    isActiveParam === null ? undefined : isActiveParam === 'true';

  const providerResult = OAuthProviderSchema.optional().safeParse(providerParam);
  const provider = providerResult.success ? providerResult.data : undefined;
  const serviceTypeResult = OAuthServiceTypeSchema.optional().safeParse(serviceTypeParam);
  const serviceType = serviceTypeResult.success ? serviceTypeResult.data : undefined;

  const result = await listOAuthConnections(db, {
    organizationId: ctx.organizationId,
    provider,
    serviceType,
    isActive,
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
