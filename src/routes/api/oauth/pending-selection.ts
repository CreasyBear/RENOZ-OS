import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import {
  completePendingXeroTenantSelection,
  getPendingXeroTenantSelection,
} from '@/lib/oauth/flow';

const querySchema = z.object({
  stateId: z.string().uuid(),
});

const completeSchema = z.object({
  stateId: z.string().uuid(),
  tenantId: z.string().min(1),
});

export async function GET({ request }: { request: Request }) {
  try {
    const ctx = await withAuth();
    const url = new URL(request.url);
    const parseResult = querySchema.safeParse({
      stateId: url.searchParams.get('stateId'),
    });

    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid tenant selection request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getPendingXeroTenantSelection({
      db,
      stateId: parseResult.data.stateId,
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to load pending Xero tenant selection',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const ctx = await withAuth();
    const body = await request.json().catch(() => null);
    const parseResult = completeSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid tenant selection payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await completePendingXeroTenantSelection({
      db,
      stateId: parseResult.data.stateId,
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      tenantId: parseResult.data.tenantId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to complete Xero tenant selection',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
