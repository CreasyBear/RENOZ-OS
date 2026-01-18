/**
 * Database Client Configuration
 *
 * Drizzle ORM client configured for Supabase connection pooler.
 * Uses Transaction mode (port 6543) which requires prepare: false.
 *
 * @see https://orm.drizzle.team/docs/connect-supabase
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Schema imports will be added as tables are created
import * as schema from "../../../drizzle/schema";

/**
 * Create postgres client with Supabase pooler-compatible settings.
 *
 * Key settings for Supabase Transaction mode (port 6543):
 * - prepare: false - Transaction mode doesn't support prepared statements
 * - max: 10 - Connection pool size (Supabase free tier allows 60 connections)
 * - idle_timeout: 20 - Close idle connections after 20 seconds
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is required. " +
      "Use the Supabase connection pooler URL (port 6543) for Transaction mode."
  );
}

const client = postgres(connectionString, {
  // Required for Supabase Transaction mode (PgBouncer)
  prepare: false,

  // Connection pool settings
  max: 10,
  idle_timeout: 20,

  // Optional: Connection lifecycle hooks for debugging
  // onnotice: (msg) => console.log('pg notice:', msg),
});

/**
 * Drizzle ORM instance with schema and snake_case casing.
 *
 * The `casing: 'snake_case'` setting automatically converts:
 * - camelCase JS properties → snake_case SQL columns
 * - snake_case SQL results → camelCase JS objects
 *
 * This matches PostgreSQL conventions while keeping JS code idiomatic.
 */
export const db = drizzle(client, {
  schema,
  casing: "snake_case",
});

// Export the raw client for advanced use cases (transactions, raw queries)
export { client as pgClient };

// Re-export schema for convenience
export { schema };

// Type exports for query building
export type Database = typeof db;
