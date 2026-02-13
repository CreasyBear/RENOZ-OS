/**
 * Customer Duplicate Scan Server Functions
 *
 * Batch scanning for potential duplicate customers across the entire database.
 * Uses pg_trgm for fuzzy matching with index-accelerated searches.
 *
 * PERFORMANCE NOTE: Uses the % operator with GIN indexes for O(n) performance
 * instead of O(n²) self-joins. Each customer lookup uses the trigram index.
 *
 * RAW SQL USAGE (P2 - Documented Exception):
 * - Uses `db.execute(sql`...`)` for complex pg_trgm queries that require:
 *   - PostgreSQL-specific `similarity()` function
 *   - `%` operator for trigram matching (requires GIN index)
 *   - `SET pg_trgm.similarity_threshold` session configuration
 *   - Complex CTEs with LATERAL joins for batch processing
 * - These operations are not directly supported by Drizzle ORM query builder
 * - Raw SQL is acceptable here for performance-critical fuzzy matching
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { sql, eq, and, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customerMergeAudit } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { decodeCursor, buildCursorCondition, buildCursorResponse } from '@/lib/db/pagination';
import { customerMergeAuditFilterSchema, customerMergeAuditCursorSchema } from '@/lib/schemas/customers';
import { flexibleJsonSchema } from '@/lib/schemas/_shared/patterns';

// ============================================================================
// SCHEMAS
// ============================================================================

export const scanDuplicatesInputSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.4),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  includeArchived: z.boolean().default(false),
  // New: batch size for iterative scanning (prevents memory issues)
  batchSize: z.number().min(100).max(1000).default(500),
});

export type ScanDuplicatesInput = z.infer<typeof scanDuplicatesInputSchema>;

/** Raw row shape from ranked_matches query (progressive scan) */
interface RankedMatchRow {
  source_id: string;
  source_name: string;
  source_code: string;
  id: string;
  customer_code: string;
  name: string;
  status: string;
  lifetime_value: number | string;
  created_at: Date | string;
  email: string | null;
  phone: string | null;
  name_similarity: number;
  rn: number;
}

/** Raw row shape from duplicate_matches SQL query */
interface DuplicatePairRow {
  customer1_id: string;
  customer1_code: string;
  customer1_name: string;
  customer1_email: string | null;
  customer1_phone: string | null;
  customer1_status: string;
  customer1_ltv: string | number;
  customer1_created: Date;
  customer2_id: string;
  customer2_code: string;
  customer2_name: string;
  customer2_email: string | null;
  customer2_phone: string | null;
  customer2_status: string;
  customer2_ltv: string | number;
  customer2_created: Date;
  match_score: string | number;
  name_similarity: number;
  email_similarity: number;
  phone_similarity: number;
}

export interface DuplicatePair {
  id: string;
  customer1: {
    id: string;
    customerCode: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    lifetimeValue: number;
    createdAt: string;
  };
  customer2: {
    id: string;
    customerCode: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    lifetimeValue: number;
    createdAt: string;
  };
  matchScore: number;
  matchReasons: string[];
  status: 'pending' | 'merged' | 'dismissed';
}

// ============================================================================
// DUPLICATE SCANNING (Index-Accelerated)
// ============================================================================

/**
 * Scan customer database for potential duplicates using index-accelerated search.
 *
 * ALGORITHM:
 * 1. Set pg_trgm.similarity_threshold for the session
 * 2. For each customer (in batches), use % operator to find similar ones
 * 3. The % operator uses GIN index - O(log n) per lookup instead of O(n)
 * 4. Total complexity: O(n log n) instead of O(n²)
 *
 * This approach scales to 100K+ customers without timeout.
 */
export const scanForDuplicates = createServerFn({ method: 'POST' })
  .inputValidator(scanDuplicatesInputSchema)
  .handler(async ({ data }: { data: ScanDuplicatesInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { threshold, limit, offset, includeArchived, batchSize } = data;

    // Set the similarity threshold for this session (used by % operator)
    await db.execute(sql`SET pg_trgm.similarity_threshold = ${threshold}`);

    // Use index-accelerated duplicate finding:
    // For each customer, find others where name % name (uses GIN index)
    // This avoids the O(n²) self-join problem
    const duplicatePairs = await db.execute(sql`
      WITH customer_base AS (
        SELECT
          c.id,
          c.customer_code,
          c.name,
          c.status,
          c.lifetime_value,
          c.created_at,
          ct.email,
          ct.phone
        FROM customers c
        LEFT JOIN contacts ct ON ct.customer_id = c.id AND ct.is_primary = true
        WHERE c.organization_id = ${ctx.organizationId}
          AND c.deleted_at IS NULL
          ${!includeArchived ? sql`AND c.status != 'inactive'` : sql``}
        ORDER BY c.created_at ASC
        LIMIT ${batchSize}
      ),
      -- Find duplicates using index-accelerated % operator
      -- This uses the GIN trigram index on customers.name
      duplicate_matches AS (
        SELECT DISTINCT ON (LEAST(cb.id, c2.id), GREATEST(cb.id, c2.id))
          cb.id as customer1_id,
          cb.customer_code as customer1_code,
          cb.name as customer1_name,
          cb.email as customer1_email,
          cb.phone as customer1_phone,
          cb.status as customer1_status,
          COALESCE(cb.lifetime_value, 0) as customer1_ltv,
          cb.created_at as customer1_created,
          c2.id as customer2_id,
          c2.customer_code as customer2_code,
          c2.name as customer2_name,
          ct2.email as customer2_email,
          ct2.phone as customer2_phone,
          c2.status as customer2_status,
          COALESCE(c2.lifetime_value, 0) as customer2_ltv,
          c2.created_at as customer2_created,
          -- Calculate actual similarity scores
          similarity(cb.name, c2.name) as name_similarity,
          CASE WHEN cb.email IS NOT NULL AND ct2.email IS NOT NULL
               THEN similarity(LOWER(cb.email), LOWER(ct2.email))
               ELSE 0 END as email_similarity,
          CASE WHEN cb.phone IS NOT NULL AND ct2.phone IS NOT NULL
               THEN similarity(cb.phone, ct2.phone)
               ELSE 0 END as phone_similarity
        FROM customer_base cb
        -- Use % operator for index-accelerated search (GIN index on name)
        JOIN customers c2 ON c2.name % cb.name
          AND c2.id != cb.id
          AND c2.organization_id = ${ctx.organizationId}
          AND c2.deleted_at IS NULL
          ${!includeArchived ? sql`AND c2.status != 'inactive'` : sql``}
        LEFT JOIN contacts ct2 ON ct2.customer_id = c2.id AND ct2.is_primary = true
        WHERE cb.id < c2.id  -- Avoid duplicate pairs (A,B) and (B,A)
      )
      SELECT
        *,
        GREATEST(name_similarity, email_similarity, phone_similarity) as match_score
      FROM duplicate_matches
      WHERE GREATEST(name_similarity, email_similarity, phone_similarity) >= ${threshold}
      ORDER BY match_score DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const toDateString = (d: Date | string): string =>
      d instanceof Date ? d.toISOString() : String(d);

    // Transform results into DuplicatePair format
    const pairs: DuplicatePair[] = (duplicatePairs as unknown as DuplicatePairRow[]).map((row) => {
      const matchReasons: string[] = [];
      if (row.name_similarity >= threshold) {
        matchReasons.push(`Name: ${Math.round(row.name_similarity * 100)}% similar`);
      }
      if (row.email_similarity >= threshold) {
        matchReasons.push(`Email: ${Math.round(row.email_similarity * 100)}% similar`);
      }
      if (row.phone_similarity >= threshold) {
        matchReasons.push(`Phone: ${Math.round(row.phone_similarity * 100)}% similar`);
      }

      return {
        id: `pair-${row.customer1_id}-${row.customer2_id}`,
        customer1: {
          id: row.customer1_id,
          customerCode: row.customer1_code,
          name: row.customer1_name,
          email: row.customer1_email,
          phone: row.customer1_phone,
          status: row.customer1_status,
          lifetimeValue: Number(row.customer1_ltv),
          createdAt: toDateString(row.customer1_created),
        },
        customer2: {
          id: row.customer2_id,
          customerCode: row.customer2_code,
          name: row.customer2_name,
          email: row.customer2_email,
          phone: row.customer2_phone,
          status: row.customer2_status,
          lifetimeValue: Number(row.customer2_ltv),
          createdAt: toDateString(row.customer2_created),
        },
        matchScore: Number(row.match_score),
        matchReasons,
        status: 'pending' as const,
      };
    });

    // Get approximate count (avoid expensive full count on large datasets)
    // Use the batch result count as indicator
    const hasMore = pairs.length === limit;

    return {
      pairs,
      total: pairs.length + (hasMore ? 1 : 0), // Approximate
      hasMore,
    };
  });

/**
 * Progressive scan - scan from a specific cursor position
 * Used for scanning large datasets in chunks without timeout
 */
const scanDuplicatesProgressiveInputSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.4),
  batchSize: z.number().min(100).max(1000).default(500),
  cursor: z.string().uuid().optional(), // Last customer ID processed
  includeArchived: z.boolean().default(false),
});

type ScanDuplicatesProgressiveInput = z.infer<typeof scanDuplicatesProgressiveInputSchema>;

export const scanDuplicatesProgressive = createServerFn({ method: 'POST' })
  .inputValidator(scanDuplicatesProgressiveInputSchema)
  .handler(async ({ data }: { data: ScanDuplicatesProgressiveInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { threshold, batchSize, cursor, includeArchived } = data;

    // Set threshold
    await db.execute(sql`SET pg_trgm.similarity_threshold = ${threshold}`);

    // Get next batch of customers to process
    const batchQuery = cursor
      ? sql`
          SELECT id, name, customer_code
          FROM customers
          WHERE organization_id = ${ctx.organizationId}
            AND deleted_at IS NULL
            AND id > ${cursor}
            ${!includeArchived ? sql`AND status != 'inactive'` : sql``}
          ORDER BY id ASC
          LIMIT ${batchSize}
        `
      : sql`
          SELECT id, name, customer_code
          FROM customers
          WHERE organization_id = ${ctx.organizationId}
            AND deleted_at IS NULL
            ${!includeArchived ? sql`AND status != 'inactive'` : sql``}
          ORDER BY id ASC
          LIMIT ${batchSize}
        `;

    const batchResult = await db.execute(batchQuery);
    const batch = batchResult as unknown as { id: string; name: string; customer_code: string }[];

    if (batch.length === 0) {
      return { pairs: [], nextCursor: null, isComplete: true };
    }

    // Find duplicates for this batch using a single batched query
    // This eliminates the N+1 problem by finding all matches in one query
    const pairs: DuplicatePair[] = [];

    // Build a lookup map from batch for quick access
    const batchMap = new Map(batch.map((c) => [c.id, c]));
    const batchIds = batch.map((c) => c.id);

    // Single batched query: find all matches for all customers in batch
    // Uses LATERAL join to efficiently find top matches per customer
    const allMatches = await db.execute(sql`
      WITH batch_customers AS (
        SELECT id, name, customer_code
        FROM customers
        WHERE id = ANY(${batchIds})
      ),
      ranked_matches AS (
        SELECT
          bc.id as source_id,
          bc.name as source_name,
          bc.customer_code as source_code,
          c.id,
          c.customer_code,
          c.name,
          c.status,
          COALESCE(c.lifetime_value, 0) as lifetime_value,
          c.created_at,
          ct.email,
          ct.phone,
          similarity(c.name, bc.name) as name_similarity,
          ROW_NUMBER() OVER (PARTITION BY bc.id ORDER BY similarity(c.name, bc.name) DESC) as rn
        FROM batch_customers bc
        JOIN customers c ON c.name % bc.name
          AND c.id != bc.id
          AND c.id > bc.id  -- Only look forward to avoid duplicates
          AND c.organization_id = ${ctx.organizationId}
          AND c.deleted_at IS NULL
          ${!includeArchived ? sql`AND c.status != 'inactive'` : sql``}
        LEFT JOIN contacts ct ON ct.customer_id = c.id AND ct.is_primary = true
      )
      SELECT *
      FROM ranked_matches
      WHERE rn <= 5  -- Max 5 matches per customer
        AND name_similarity >= ${threshold}
      ORDER BY source_id, name_similarity DESC
    `);

    const toDateStr = (d: Date | string): string =>
      d instanceof Date ? d.toISOString() : String(d);

    for (const match of allMatches as unknown as RankedMatchRow[]) {
      const sourceCustomer = batchMap.get(match.source_id);
      if (sourceCustomer && match.name_similarity >= threshold) {
        pairs.push({
          id: `pair-${match.source_id}-${match.id}`,
          customer1: {
            id: match.source_id,
            customerCode: match.source_code,
            name: match.source_name,
            email: null, // Source customer contact info not fetched in batch query
            phone: null,
            status: 'active',
            lifetimeValue: 0,
            createdAt: '',
          },
          customer2: {
            id: match.id,
            customerCode: match.customer_code,
            name: match.name,
            email: match.email,
            phone: match.phone,
            status: match.status,
            lifetimeValue: Number(match.lifetime_value),
            createdAt: toDateStr(match.created_at),
          },
          matchScore: match.name_similarity,
          matchReasons: [`Name: ${Math.round(match.name_similarity * 100)}% similar`],
          status: 'pending',
        });
      }
    }

    const lastCustomer = batch[batch.length - 1];

    return {
      pairs,
      nextCursor: lastCustomer?.id ?? null,
      isComplete: batch.length < batchSize,
      processedCount: batch.length,
    };
  });

/**
 * Mark a duplicate pair as dismissed (not duplicates)
 */
const dismissDuplicatePairInputSchema = z.object({
  customer1Id: z.string().uuid(),
  customer2Id: z.string().uuid(),
  reason: z.string().optional(),
});

type DismissDuplicatePairInput = z.infer<typeof dismissDuplicatePairInputSchema>;

export const dismissDuplicatePair = createServerFn({ method: 'POST' })
  .inputValidator(dismissDuplicatePairInputSchema)
  .handler(async ({ data }: { data: DismissDuplicatePairInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    // Record the dismissal in audit log
    await db.insert(customerMergeAudit).values({
      organizationId: ctx.organizationId,
      primaryCustomerId: data.customer1Id,
      mergedCustomerId: data.customer2Id,
      action: 'dismissed',
      reason: data.reason || 'Marked as not duplicates',
      performedBy: ctx.user.id,
      metadata: {},
    });

    return { success: true };
  });

/**
 * Get merge audit history (OFFSET pagination)
 */
export const getMergeHistory = createServerFn({ method: 'GET' })
  .inputValidator(customerMergeAuditFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { limit, offset, action } = data;

    const conditions = [eq(customerMergeAudit.organizationId, ctx.organizationId)];
    if (action) {
      conditions.push(eq(customerMergeAudit.action, action));
    }

    const history = await db
      .select()
      .from(customerMergeAudit)
      .where(and(...conditions))
      .orderBy(desc(customerMergeAudit.performedAt))
      .limit(limit)
      .offset(offset);

    return {
      history: history.map((h) => ({
        ...h,
        mergedData: h.mergedData != null ? flexibleJsonSchema.parse(h.mergedData) : null,
        metadata: h.metadata != null ? flexibleJsonSchema.parse(h.metadata) : null,
      })),
    };
  });

/**
 * Get merge audit history with cursor pagination (recommended for large datasets).
 * Uses performedAt + id for stable sort.
 */
export const getMergeHistoryCursor = createServerFn({ method: 'GET' })
  .inputValidator(customerMergeAuditCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', action, primaryCustomerId } = data;

    const conditions = [eq(customerMergeAudit.organizationId, ctx.organizationId)];
    if (action) conditions.push(eq(customerMergeAudit.action, action));
    if (primaryCustomerId) conditions.push(eq(customerMergeAudit.primaryCustomerId, primaryCustomerId));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(
            customerMergeAudit.performedAt,
            customerMergeAudit.id,
            cursorPosition,
            sortOrder
          )
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const history = await db
      .select()
      .from(customerMergeAudit)
      .where(and(...conditions))
      .orderBy(orderDir(customerMergeAudit.performedAt), orderDir(customerMergeAudit.id))
      .limit(pageSize + 1);

    return buildCursorResponse(
      history.map((h) => ({
        ...h,
        mergedData: h.mergedData != null ? flexibleJsonSchema.parse(h.mergedData) : null,
        metadata: h.metadata != null ? flexibleJsonSchema.parse(h.metadata) : null,
      })),
      pageSize,
      (h) => h.performedAt,
      (h) => h.id
    );
  });
