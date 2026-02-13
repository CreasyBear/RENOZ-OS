/**
 * OAuth Database Contract
 *
 * OAuth modules depend on a database with access to oauth tables (oauth_connections,
 * oauth_states, oauth_sync_logs, etc.). This type is derived from the app schema
 * to ensure OAuth accepts the same db instance passed from API routes and server functions.
 *
 * Import schema directly to avoid circular resolution issues with @/lib/db.
 *
 * @see src/lib/db/index.ts
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../../../drizzle/schema';

/**
 * Database type for OAuth operations.
 * Matches the app's Database schema so db from @/lib/db is assignable.
 */
export type OAuthDatabase = PostgresJsDatabase<typeof schema>;
