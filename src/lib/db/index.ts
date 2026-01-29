'use server'

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

let clientInstance: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get or create the postgres client with Supabase pooler-compatible settings.
 *
 * Key settings for Supabase Transaction mode (port 6543):
 * - prepare: false - Transaction mode doesn't support prepared statements
 * - max: 10 - Connection pool size (Supabase free tier allows 60 connections)
 * - idle_timeout: 20 - Close idle connections after 20 seconds
 */
export function getClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
        "Use the Supabase connection pooler URL (port 6543) for Transaction mode."
    );
  }

  clientInstance = postgres(connectionString, {
    // Required for Supabase Transaction mode (PgBouncer)
    prepare: false,

    // Connection pool settings
    max: 10,
    idle_timeout: 20,

    // Optional: Connection lifecycle hooks for debugging
    // onnotice: (msg) => console.log('pg notice:', msg),
  });

  return clientInstance;
}

/**
 * Get or create the Drizzle ORM instance.
 */
function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const client = getClient();

  dbInstance = drizzle(client, {
    schema,
    casing: "snake_case",
  });

  return dbInstance;
}

/**
 * Drizzle ORM instance with schema and snake_case casing.
 * Lazily initialized on first access to avoid env var issues during build.
 *
 * The `casing: 'snake_case'` setting automatically converts:
 * - camelCase JS properties → snake_case SQL columns
 * - snake_case SQL results → camelCase JS objects
 *
 * This matches PostgreSQL conventions while keeping JS code idiomatic.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any)[prop];
  },
});

// Export a function to get the raw client for advanced use cases
export function getPgClient() {
  return getClient();
}

// Re-export schema for convenience
export { schema };

// Type exports for query building
export type Database = ReturnType<typeof drizzle<typeof schema>>;
