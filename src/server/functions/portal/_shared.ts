import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { portalIdentities } from 'drizzle/schema';
import { getServerUser } from '@/lib/supabase/server';
import { AuthError, NotFoundError } from '@/lib/server/errors';

export async function getActivePortalIdentity() {
  const authUser = await getServerUser();
  if (!authUser) {
    throw new AuthError('Portal authentication required');
  }

  const [identity] = await db
    .select()
    .from(portalIdentities)
    .where(and(eq(portalIdentities.authUserId, authUser.id), eq(portalIdentities.status, 'active')))
    .limit(1);

  if (!identity) {
    throw new NotFoundError('Portal identity not found');
  }

  await db
    .update(portalIdentities)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(portalIdentities.id, identity.id));

  return identity;
}
