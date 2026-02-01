/**
 * Cursor Pagination Helpers
 *
 * Implements cursor-based pagination for scalable list queries.
 * Uses composite cursor (createdAt + id) for deterministic ordering.
 *
 * Why cursor over offset?
 * - Offset requires scanning rows to skip (O(n) for OFFSET 1000)
 * - Cursor uses indexed WHERE clause (O(log n))
 * - Stable across concurrent inserts/deletes
 *
 * @see https://use-the-index-luke.com/no-offset
 */

import { z } from "zod";
import { sql, and, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Decoded cursor containing the position markers.
 */
export interface CursorPosition {
  createdAt: string; // ISO date string
  id: string; // UUID
}

/**
 * Cursor-paginated response shape.
 */
export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Cursor pagination query parameters.
 *
 * @example
 * const { cursor, pageSize } = cursorPaginationSchema.parse(req.query);
 */
export const cursorPaginationSchema = z.object({
  /** Base64-encoded cursor from previous response */
  cursor: z.string().optional(),
  /** Number of items per page (1-100, default 20) */
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  /** Sort direction - only desc supported for cursor pagination */
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CursorPaginationParams = z.infer<typeof cursorPaginationSchema>;

// ============================================================================
// CURSOR ENCODING/DECODING
// ============================================================================

/**
 * Encode a cursor position to base64 string.
 *
 * @example
 * const cursor = encodeCursor({ createdAt: new Date(), id: "uuid" });
 * // Returns: "eyJjcmVhdGVkQXQiOiIyMDI0..."
 */
export function encodeCursor(position: {
  createdAt: Date | string;
  id: string;
}): string {
  const createdAt =
    position.createdAt instanceof Date
      ? position.createdAt.toISOString()
      : position.createdAt;

  return btoa(JSON.stringify({ createdAt, id: position.id }));
}

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ISO date validation regex (basic check)
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Decode and validate a base64 cursor string to position.
 *
 * Security: Validates that cursor contains valid UUID and ISO date to prevent
 * cursor tampering/injection attacks.
 *
 * @returns Decoded position or null if invalid/tampered
 */
export function decodeCursor(cursor: string): CursorPosition | null {
  try {
    // Length check to prevent DoS via oversized cursors
    if (cursor.length > 500) {
      return null;
    }

    const decoded = JSON.parse(atob(cursor));

    // Validate structure
    if (
      typeof decoded.createdAt !== "string" ||
      typeof decoded.id !== "string"
    ) {
      return null;
    }

    // Validate UUID format to prevent SQL injection via id field
    if (!UUID_REGEX.test(decoded.id)) {
      return null;
    }

    // Validate ISO date format to prevent date manipulation
    if (!ISO_DATE_REGEX.test(decoded.createdAt)) {
      return null;
    }

    // Validate date is actually parseable
    const parsedDate = new Date(decoded.createdAt);
    if (isNaN(parsedDate.getTime())) {
      return null;
    }

    return decoded as CursorPosition;
  } catch {
    return null;
  }
}

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Build the WHERE clause for cursor pagination.
 *
 * For descending order (newest first):
 *   WHERE (createdAt < cursor.createdAt)
 *      OR (createdAt = cursor.createdAt AND id < cursor.id)
 *
 * For ascending order (oldest first):
 *   WHERE (createdAt > cursor.createdAt)
 *      OR (createdAt = cursor.createdAt AND id > cursor.id)
 *
 * @param createdAtColumn - The createdAt column from the table
 * @param idColumn - The id column from the table
 * @param cursor - Decoded cursor position
 * @param direction - Sort direction (asc or desc)
 */
export function buildCursorCondition(
  createdAtColumn: PgColumn,
  idColumn: PgColumn,
  cursor: CursorPosition,
  direction: "asc" | "desc" = "desc"
): SQL {
  // Keep as ISO string - postgres driver expects strings, not Date objects
  const cursorDateStr = cursor.createdAt;

  if (direction === "desc") {
    // For descending: get items BEFORE the cursor (older)
    return or(
      sql`${createdAtColumn} < ${cursorDateStr}`,
      and(
        sql`${createdAtColumn} = ${cursorDateStr}`,
        sql`${idColumn} < ${cursor.id}`
      )
    )!;
  } else {
    // For ascending: get items AFTER the cursor (newer)
    return or(
      sql`${createdAtColumn} > ${cursorDateStr}`,
      and(
        sql`${createdAtColumn} = ${cursorDateStr}`,
        sql`${idColumn} > ${cursor.id}`
      )
    )!;
  }
}

// ============================================================================
// RESPONSE BUILDER
// ============================================================================

/**
 * Process query results into cursor-paginated response.
 *
 * The query should fetch pageSize + 1 items. If we get more items
 * than pageSize, there's a next page.
 *
 * @param results - Query results (should be pageSize + 1 max)
 * @param pageSize - Requested page size
 * @param getCreatedAt - Function to extract createdAt from item
 * @param getId - Function to extract id from item
 */
export function buildCursorResponse<T>(
  results: T[],
  pageSize: number,
  getCreatedAt: (item: T) => Date | string,
  getId: (item: T) => string
): CursorPaginatedResponse<T> {
  const hasNextPage = results.length > pageSize;

  // Trim to requested page size
  const items = hasNextPage ? results.slice(0, pageSize) : results;

  // Build next cursor from last item
  let nextCursor: string | null = null;
  if (hasNextPage && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = encodeCursor({
      createdAt: getCreatedAt(lastItem),
      id: getId(lastItem),
    });
  }

  return {
    items,
    nextCursor,
    hasNextPage,
  };
}

// ============================================================================
// CONVENIENCE HELPERS
// ============================================================================

/**
 * Standard cursor response builder for entities with createdAt and id fields.
 *
 * @example
 * const response = buildStandardCursorResponse(results, pageSize);
 */
export function buildStandardCursorResponse<
  T extends { createdAt: Date | string; id: string },
>(results: T[], pageSize: number): CursorPaginatedResponse<T> {
  return buildCursorResponse(
    results,
    pageSize,
    (item) => item.createdAt,
    (item) => item.id
  );
}
