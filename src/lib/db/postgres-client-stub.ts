/**
 * Postgres Client Stub for Client-Side
 *
 * This is a stub module that provides the postgres interface for the client.
 * It throws an error if actually used, since postgres operations should only
 * happen on the server.
 *
 * This stub is aliased in vite.config.ts to prevent the real postgres
 * module (which uses Node.js Buffer) from being bundled for the client.
 */

/**
 * Minimal interface for the postgres client stub.
 * Matches the shape expected when this module is aliased for client bundles.
 */
export interface PostgresClientStub {
  (connectionString?: string, options?: unknown): never;
  PostgresError: typeof PostgresError;
  toPascal: (x: string) => string;
  pascal: (x: string) => string;
  toCamel: (x: string) => string;
  camel: (x: string) => string;
  toKebab: (x: string) => string;
  kebab: (x: string) => string;
  fromPascal: (x: string) => string;
  fromCamel: (x: string) => string;
  fromKebab: (x: string) => string;
  BigInt: {
    to: number;
    from: number[];
    parse: (x: string) => bigint;
    serialize: (x: bigint) => string;
  };
}

export class PostgresError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PostgresError'
  }
}

// Stub function that throws when called
function postgresStub() {
  throw new Error(
    'Postgres client cannot be used in the browser. ' +
    'Use server functions (createServerFn) for database operations.'
  )
}

// Attach the error class
postgresStub.PostgresError = PostgresError

// Attach type helpers (these are safe to use on client)
const identity = (x: string) => x
postgresStub.toPascal = identity
postgresStub.pascal = identity
postgresStub.toCamel = identity
postgresStub.camel = identity
postgresStub.toKebab = identity
postgresStub.kebab = identity
postgresStub.fromPascal = identity
postgresStub.fromCamel = identity
postgresStub.fromKebab = identity
postgresStub.BigInt = {
  to: 20,
  from: [20],
  parse: (x: string) => BigInt(x),
  serialize: (x: bigint) => x.toString()
}

export default postgresStub as PostgresClientStub
