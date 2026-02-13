/**
 * Customer Triage Server Function
 *
 * Returns customers needing attention for triage section:
 * - Customers on credit hold (critical)
 * - Customers with low health scores (warning)
 *
 * Follows STANDARDS.md server function patterns.
 *
 * @see src/lib/schemas/customers/customer-triage.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, lte, asc, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  getCustomerTriageInputSchema,
  customerTriageResponseSchema,
  type CustomerTriageResponse,
} from '@/lib/schemas/customers/customer-triage';

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Get customer triage data (credit holds and low health scores).
 *
 * Returns minimal customer data needed for triage display.
 * Server-side filtering ensures efficient queries.
 */
export const getCustomerTriage = createServerFn({ method: 'GET' })
  .inputValidator(getCustomerTriageInputSchema)
  .handler(async ({ data }): Promise<CustomerTriageResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { creditHoldLimit, lowHealthLimit, healthScoreThreshold } = data;

    // Base conditions for all queries
    const baseConditions = [
      eq(customers.organizationId, ctx.organizationId),
      isNull(customers.deletedAt),
    ];

    // Query credit holds and low health scores in parallel
    const [creditHoldResults, lowHealthResults] = await Promise.all([
      // Credit holds (critical)
      db
        .select({
          id: customers.id,
          name: customers.name,
          healthScore: customers.healthScore,
          creditHold: customers.creditHold,
          creditHoldReason: customers.creditHoldReason,
        })
        .from(customers)
        .where(
          and(
            ...baseConditions,
            eq(customers.creditHold, true)
          )
        )
        .orderBy(asc(customers.name))
        .limit(creditHoldLimit),

      // Low health scores (warning)
      db
        .select({
          id: customers.id,
          name: customers.name,
          healthScore: customers.healthScore,
          creditHold: customers.creditHold,
          creditHoldReason: customers.creditHoldReason,
        })
        .from(customers)
        .where(
          and(
            ...baseConditions,
            // Health score is below threshold AND not null
            sql`${customers.healthScore} IS NOT NULL`,
            lte(customers.healthScore, healthScoreThreshold),
            // Exclude customers already on credit hold (they're in critical)
            sql`COALESCE(${customers.creditHold}, false) = false`
          )
        )
        .orderBy(asc(customers.healthScore), asc(customers.name))
        .limit(lowHealthLimit),
    ]);

    // Build response and validate with schema
    const response: CustomerTriageResponse = {
      creditHolds: creditHoldResults.map((c) => ({
        id: c.id,
        name: c.name,
        healthScore: c.healthScore,
        creditHold: c.creditHold ?? false,
        creditHoldReason: c.creditHoldReason,
      })),
      lowHealthScores: lowHealthResults.map((c) => ({
        id: c.id,
        name: c.name,
        healthScore: c.healthScore,
        creditHold: c.creditHold ?? false,
        creditHoldReason: c.creditHoldReason,
      })),
    };

    // Validate response matches schema
    return customerTriageResponseSchema.parse(response);
  });
