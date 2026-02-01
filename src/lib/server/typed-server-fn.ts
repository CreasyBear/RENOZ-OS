'use server'

/**
 * Typed Server Function Utilities
 *
 * Structural workaround for TanStack Start's type inference issues when
 * using Drizzle ORM types in server function return values.
 *
 * ## ROOT CAUSE
 *
 * TanStack Start's `ValidateSerializable<T>` constraint rejects types
 * containing `unknown` (like Drizzle's JSONB columns with index signatures).
 * For example, a type like `{ [key: string]: unknown }` will fail validation.
 *
 * ## WHEN YOU NEED THIS
 *
 * Use these utilities when your server function:
 * - Returns Drizzle `$inferSelect` types
 * - Returns objects with JSONB columns
 * - Returns arrays of database records
 *
 * ## PROPER FIX (PREFERRED)
 *
 * For new code, avoid index signatures in JSONB type definitions:
 *
 * ```typescript
 * // BAD - causes type errors
 * interface AlertThreshold {
 *   minQuantity?: number;
 *   [key: string]: unknown;  // ❌ This breaks TanStack serialization
 * }
 *
 * // GOOD - strict shape, no issues
 * interface AlertThreshold {
 *   minQuantity?: number;
 *   maxQuantity?: number;
 *   // No index signature
 * }
 * ```
 *
 * ## BENEFITS
 *
 * - Single location for type workarounds
 * - When TanStack fixes the issue, update only this file
 * - Cleaner server function files without @ts-expect-error noise
 * - Maintains type safety for handler input/output
 *
 * @see https://github.com/TanStack/router/issues/2393
 * @see https://github.com/TanStack/router/issues/5496
 */

import { createServerFn } from '@tanstack/react-start';
import type { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Handler context provided by TanStack Start
 */
type HandlerContext<TInput> = {
  data: TInput;
};

/**
 * Handler function signature
 */
type Handler<TInput, TOutput> = (ctx: HandlerContext<TInput>) => Promise<TOutput>;

/**
 * Handler function for no-input server functions
 */
type NoInputHandler<TOutput> = () => Promise<TOutput>;

// ============================================================================
// TYPED SERVER FUNCTION FACTORIES
// ============================================================================

/**
 * Create a typed GET server function with input validation.
 *
 * @example
 * ```typescript
 * const getUser = typedGetFn(
 *   z.object({ id: z.string().uuid() }),
 *   async ({ data }) => {
 *     return db.select().from(users).where(eq(users.id, data.id));
 *   }
 * );
 * ```
 */
export function typedGetFn<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: Handler<TInput, TOutput>
) {
  return (
    createServerFn({ method: 'GET' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .inputValidator(schema as any)
      // @ts-expect-error - TanStack Start type inference issue, encapsulated here
      .handler(handler)
  );
}

/**
 * Create a typed POST server function with input validation.
 *
 * @example
 * ```typescript
 * const createUser = typedPostFn(
 *   createUserSchema,
 *   async ({ data }) => {
 *     return db.insert(users).values(data).returning();
 *   }
 * );
 * ```
 */
export function typedPostFn<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: Handler<TInput, TOutput>
) {
  return (
    createServerFn({ method: 'POST' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .inputValidator(schema as any)
      // @ts-expect-error - TanStack Start type inference issue, encapsulated here
      .handler(handler)
  );
}

/**
 * Create a typed GET server function without input validation.
 *
 * @example
 * ```typescript
 * const getCurrentUser = typedGetNoInput(async () => {
 *   const ctx = await withAuth();
 *   return db.select().from(users).where(eq(users.id, ctx.user.id));
 * });
 * ```
 */
export function typedGetNoInput<TOutput>(handler: NoInputHandler<TOutput>) {
  return (
    createServerFn({ method: 'GET' })
      // @ts-expect-error - TanStack Start type inference issue, encapsulated here
      .handler(handler)
  );
}

/**
 * Create a typed POST server function without input validation.
 *
 * @example
 * ```typescript
 * const logout = typedPostNoInput(async () => {
 *   const ctx = await withAuth();
 *   await invalidateSession(ctx.session.id);
 *   return { success: true };
 * });
 * ```
 */
export function typedPostNoInput<TOutput>(handler: NoInputHandler<TOutput>) {
  return (
    createServerFn({ method: 'POST' })
      // @ts-expect-error - TanStack Start type inference issue, encapsulated here
      .handler(handler)
  );
}

// ============================================================================
// CHAINABLE BUILDER PATTERN (ALTERNATIVE)
// ============================================================================

/**
 * Builder pattern for creating typed server functions with more flexibility.
 *
 * This provides the same ergonomics as TanStack's API but with proper typing.
 *
 * @example
 * ```typescript
 * const getUser = typedServerFn("GET")
 *   .input(userIdSchema)
 *   .handler(async ({ data }) => {
 *     return db.select().from(users).where(eq(users.id, data.id)).limit(1);
 *   });
 * ```
 */
export function typedServerFn(method: 'GET' | 'POST') {
  return {
    /**
     * Define input validation schema
     */
    input<TInput>(schema: z.ZodType<TInput>) {
      return {
        /**
         * Define handler with inferred input type
         */
        handler<TOutput>(handler: Handler<TInput, TOutput>) {
          return (
            createServerFn({ method })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .inputValidator(schema as any)
              // @ts-expect-error - TanStack Start type inference issue, encapsulated here
              .handler(handler)
          );
        },
      };
    },

    /**
     * No input validation, just a handler
     */
    handler<TOutput>(handler: NoInputHandler<TOutput>) {
      return (
        createServerFn({ method })
          // @ts-expect-error - TanStack Start type inference issue, encapsulated here
          .handler(handler)
      );
    },
  };
}
