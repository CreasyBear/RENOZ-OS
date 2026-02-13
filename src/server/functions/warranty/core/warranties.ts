'use server'

/**
 * Warranty Server Functions
 *
 * Server functions for warranty data retrieval and management.
 * Separate from warranty-policies.ts which handles policy configuration.
 *
 * @see drizzle/schema/warranties.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003b
 */

import { cache } from 'react';
import { eq, and, gte, lte, sql, desc, asc, inArray, isNull, ilike, or, exists } from 'drizzle-orm';
import { db } from '@/lib/db';
import { warranties, warrantyItems, warrantyPolicies, warrantyClaims, customers, products } from 'drizzle/schema';
import { containsPattern } from '@/lib/db/utils';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { z } from 'zod';
import { getWarrantyUrgencyLevel } from '@/lib/warranty/urgency-utils';
import {
  getExpiringWarrantiesSchema,
  getExpiringWarrantiesReportSchema,
  getWarrantySchema,
  warrantyFiltersSchema,
  updateWarrantyOptOutSchema,
  updateCustomerWarrantyOptOutSchema,
  type ExpiringWarrantyItem,
  type GetExpiringWarrantiesResult,
  type WarrantyListItem,
  type ListWarrantiesResult,
  type WarrantyDetail,
} from '@/lib/schemas/warranty/warranties';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { verifyWarrantyExists, verifyCustomerExists } from '@/server/functions/_shared/entity-verification';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
// Types are now imported from @/lib/schemas/warranty - do not define inline

// ============================================================================
// HELPERS
// ============================================================================

// Note: getUrgencyLevel() helper removed - use getWarrantyUrgencyLevel() from @/lib/warranty/urgency-utils directly

/**
 * Check if a warranty has open claims (submitted, under_review, or approved).
 * Used to prevent operations that shouldn't be performed when claims are open.
 */
async function hasOpenClaims(warrantyId: string): Promise<boolean> {
  const openClaims = await db
    .select({ id: warrantyClaims.id })
    .from(warrantyClaims)
    .where(
      and(
        eq(warrantyClaims.warrantyId, warrantyId),
        inArray(warrantyClaims.status, ['submitted', 'under_review', 'approved'])
      )
    )
    .limit(1);
  return openClaims.length > 0;
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Get warranties expiring within a given number of days.
 *
 * Used by dashboard widget (DOM-WAR-003b) and expiring warranties report (DOM-WAR-003c).
 *
 * @param days - Number of days to look ahead (default: 30)
 * @param limit - Maximum number of results to return (default: 10)
 * @param sortOrder - Sort by expiry date 'asc' (soonest first) or 'desc'
 */
export const getExpiringWarranties = createServerFn({ method: 'GET' })
  .inputValidator(getExpiringWarrantiesSchema)
  .handler(async ({ data }): Promise<GetExpiringWarrantiesResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const { days, limit, sortOrder } = data;

    // Calculate date window
    const today = new Date();
    const maxExpiryDate = new Date(today);
    maxExpiryDate.setDate(maxExpiryDate.getDate() + days);

    // Query expiring warranties with joins
    const results = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        customerId: warranties.customerId,
        customerName: customers.name,
        productId: warranties.productId,
        productName: products.name,
        productSerial: warranties.productSerial,
        policyType: warrantyPolicies.type,
        policyName: warrantyPolicies.name,
        expiryDate: warranties.expiryDate,
        currentCycleCount: warranties.currentCycleCount,
        cycleLimit: warrantyPolicies.cycleLimit,
      })
      .from(warranties)
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
      .where(
        and(
          eq(warranties.organizationId, ctx.organizationId),
          eq(warranties.status, 'active'),
          gte(warranties.expiryDate, today),
          lte(warranties.expiryDate, maxExpiryDate)
        )
      )
      .orderBy(sortOrder === 'asc' ? asc(warranties.expiryDate) : desc(warranties.expiryDate))
      .limit(limit);

    // Get total count for badge
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warranties)
      .where(
        and(
          eq(warranties.organizationId, ctx.organizationId),
          eq(warranties.status, 'active'),
          gte(warranties.expiryDate, today),
          lte(warranties.expiryDate, maxExpiryDate)
        )
      );

    const totalCount = countResult[0]?.count ?? 0;

    // Transform results with computed fields
    const warrantiesResult: ExpiringWarrantyItem[] = results.map((w) => {
      const daysUntilExpiry = Math.ceil(
        (w.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: w.id,
        warrantyNumber: w.warrantyNumber,
        customerId: w.customerId,
        customerName: w.customerName,
        productId: w.productId,
        productName: w.productName,
        productSerial: w.productSerial,
        policyType: w.policyType,
        policyName: w.policyName,
        expiryDate: w.expiryDate.toISOString(),
        daysUntilExpiry,
        urgencyLevel: getWarrantyUrgencyLevel(w.expiryDate, today),
        currentCycleCount: w.currentCycleCount,
        cycleLimit: w.cycleLimit,
      };
    });

    return {
      warranties: warrantiesResult,
      totalCount,
    };
  });

/**
 * List warranties with filtering, sorting, and pagination.
 */
export const listWarranties = createServerFn({ method: 'GET' })
  .inputValidator(warrantyFiltersSchema)
  .handler(async ({ data }): Promise<ListWarrantiesResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const {
      search,
      status,
      statuses,
      policyType,
      customerId,
      productId,
      policyId,
      expiryFrom,
      expiryTo,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = data;

    const conditions = [eq(warranties.organizationId, ctx.organizationId)];

    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(warranties.warrantyNumber, searchPattern),
          ilike(warranties.productSerial, searchPattern),
          ilike(customers.name, searchPattern),
          ilike(products.name, searchPattern),
          exists(
            db
              .select()
              .from(warrantyItems)
              .where(
                and(
                  eq(warrantyItems.warrantyId, warranties.id),
                  ilike(warrantyItems.productSerial, searchPattern)
                )
              )
          )
        )!
      );
    }

    if (statuses && statuses.length > 0) {
      conditions.push(inArray(warranties.status, statuses));
    } else if (status) {
      conditions.push(eq(warranties.status, status));
    }

    if (policyType) {
      conditions.push(eq(warrantyPolicies.type, policyType));
    }
    if (customerId) {
      conditions.push(eq(warranties.customerId, customerId));
    }
  // RAW SQL (Phase 11 Keep): Product match via warranty items EXISTS. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
  if (productId) {
    conditions.push(
      sql`(
        ${warranties.productId} = ${productId} OR
        exists (
          select 1
          from ${warrantyItems}
          where ${warrantyItems.warrantyId} = ${warranties.id}
            and ${warrantyItems.productId} = ${productId}
        )
      )`
    );
  }
    if (policyId) {
      conditions.push(eq(warranties.warrantyPolicyId, policyId));
    }
    if (expiryFrom) {
      conditions.push(gte(warranties.expiryDate, new Date(expiryFrom)));
    }
    if (expiryTo) {
      conditions.push(lte(warranties.expiryDate, new Date(expiryTo)));
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warranties)
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    const orderColumn =
      sortBy === 'expiryDate'
        ? warranties.expiryDate
        : sortBy === 'status'
          ? warranties.status
          : warranties.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        customerId: warranties.customerId,
        customerName: customers.name,
        productId: warranties.productId,
        productName: products.name,
        productSku: products.sku,
        productSerial: warranties.productSerial,
        warrantyPolicyId: warranties.warrantyPolicyId,
        policyName: warrantyPolicies.name,
        policyType: warrantyPolicies.type,
        registrationDate: warranties.registrationDate,
        expiryDate: warranties.expiryDate,
        status: warranties.status,
        currentCycleCount: warranties.currentCycleCount,
        cycleLimit: warrantyPolicies.cycleLimit,
        expiryAlertOptOut: warranties.expiryAlertOptOut,
        certificateUrl: warranties.certificateUrl,
      })
      .from(warranties)
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn))
      .limit(limit)
      .offset(offset); // OFFSET pagination; consider cursor-based for >10k rows

    const warrantiesList: WarrantyListItem[] = results.map((row) => ({
      ...row,
      registrationDate: row.registrationDate.toISOString(),
      expiryDate: row.expiryDate.toISOString(),
    }));

    return {
      warranties: warrantiesList,
      total,
      hasMore: offset + warrantiesList.length < total,
      nextOffset: offset + warrantiesList.length < total ? offset + warrantiesList.length : undefined,
    };
  });

/** Status counts for filter chips (DOMAIN-LANDING-STANDARDS) */
export const getWarrantyStatusCounts = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const baseConditions = eq(warranties.organizationId, ctx.organizationId);

    const [allRow, expiringRow, expiredRow] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(warranties).where(baseConditions),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(warranties)
        .where(and(baseConditions, eq(warranties.status, 'expiring_soon'))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(warranties)
        .where(and(baseConditions, eq(warranties.status, 'expired'))),
    ]);

    return {
      all: Number(allRow[0]?.count ?? 0),
      expiring_soon: Number(expiringRow[0]?.count ?? 0),
      expired: Number(expiredRow[0]?.count ?? 0),
    };
  });

// ============================================================================
// REPORT SERVER FUNCTIONS (DOM-WAR-003c)
// ============================================================================

/**
 * Schema for expiring warranties report with full filtering and pagination.
 */
export interface ExpiringWarrantiesReportResult {
  warranties: ExpiringWarrantyItem[];
  totalCount: number;
  totalValue: number;
  avgDaysToExpiry: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get expiring warranties for report page with full filtering and pagination.
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-003c.wireframe.md
 */
export const getExpiringWarrantiesReport = createServerFn({ method: 'GET' })
  .inputValidator(getExpiringWarrantiesReportSchema)
  .handler(async ({ data }): Promise<ExpiringWarrantiesReportResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const { days, customerId, productId, status, sortBy, page, limit } = data;

    // Calculate date window
    const today = new Date();
    const maxExpiryDate = new Date(today);
    maxExpiryDate.setDate(maxExpiryDate.getDate() + days);

    // Build where conditions
    const conditions = [eq(warranties.organizationId, ctx.organizationId)];

    // Date range filter
    if (status === 'active') {
      conditions.push(eq(warranties.status, 'active'));
      conditions.push(gte(warranties.expiryDate, today));
      conditions.push(lte(warranties.expiryDate, maxExpiryDate));
    } else if (status === 'expired') {
      conditions.push(eq(warranties.status, 'expired'));
    }
    // 'all' - no status filter, but still use date range for active
    if (status === 'all') {
      conditions.push(lte(warranties.expiryDate, maxExpiryDate));
    }

    // Optional filters
    if (customerId) {
      conditions.push(eq(warranties.customerId, customerId));
    }
    if (productId) {
      conditions.push(eq(warranties.productId, productId));
    }

    // Determine sort order
    const orderByClause = (() => {
      switch (sortBy) {
        case 'expiry_desc':
          return desc(warranties.expiryDate);
        case 'customer':
          return asc(customers.name);
        case 'product':
          return asc(products.name);
        case 'expiry_asc':
        default:
          return asc(warranties.expiryDate);
      }
    })();

    // Calculate offset
    const offset = (page - 1) * limit;

    // Query warranties with pagination
    const results = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        customerId: warranties.customerId,
        customerName: customers.name,
        productId: warranties.productId,
        productName: products.name,
        productSerial: warranties.productSerial,
        policyType: warrantyPolicies.type,
        policyName: warrantyPolicies.name,
        expiryDate: warranties.expiryDate,
        currentCycleCount: warranties.currentCycleCount,
        cycleLimit: warrantyPolicies.cycleLimit,
      })
      .from(warranties)
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset); // OFFSET pagination; consider cursor-based for >10k rows

    // Get aggregates for summary metrics
    // Note: warranties table doesn't have a value field, so totalValue is 0
    const aggregates = await db
      .select({
        count: sql<number>`count(*)::int`,
        avgDays: sql<number>`coalesce(avg(extract(day from (${warranties.expiryDate} - current_date))), 0)::numeric`,
      })
      .from(warranties)
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
      .where(and(...conditions));

    const totalCount = aggregates[0]?.count ?? 0;
    const totalValue = 0; // Warranties table doesn't have a value column
    const avgDaysToExpiry = Math.round(Number(aggregates[0]?.avgDays ?? 0));

    // Transform results
    const warrantiesResult: ExpiringWarrantyItem[] = results.map((w) => {
      const daysUntilExpiry = Math.ceil(
        (w.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: w.id,
        warrantyNumber: w.warrantyNumber,
        customerId: w.customerId,
        customerName: w.customerName,
        productId: w.productId,
        productName: w.productName,
        productSerial: w.productSerial,
        policyType: w.policyType,
        policyName: w.policyName,
        expiryDate: w.expiryDate.toISOString(),
        daysUntilExpiry,
        urgencyLevel: getWarrantyUrgencyLevel(w.expiryDate, today),
        currentCycleCount: w.currentCycleCount,
        cycleLimit: w.cycleLimit,
      };
    });

    return {
      warranties: warrantiesResult,
      totalCount,
      totalValue,
      avgDaysToExpiry,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  });

/**
 * Get filter options for expiring warranties report.
 * Returns lists of customers and products with active warranties.
 */
export const getExpiringWarrantiesFilterOptions = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });

    // Get customers with warranties
    const customerOptions = await db
      .selectDistinct({
        id: customers.id,
        name: customers.name,
      })
      .from(warranties)
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .where(eq(warranties.organizationId, ctx.organizationId))
      .orderBy(asc(customers.name));

    // Get products with warranties
    const productOptions = await db
      .selectDistinct({
        id: products.id,
        name: products.name,
      })
      .from(warranties)
      .innerJoin(products, eq(products.id, warranties.productId))
      .where(eq(warranties.organizationId, ctx.organizationId))
      .orderBy(asc(products.name));

    return {
      customers: customerOptions,
      products: productOptions,
    };
  });

// ============================================================================
// WARRANTY OPT-OUT FUNCTIONS (DOM-WAR-003d)
// ============================================================================

/**
 * Cached warranty fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getWarrantyCached = cache(async (id: string, organizationId: string): Promise<WarrantyDetail | null> => {
  const result = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        organizationId: warranties.organizationId,
        customerId: warranties.customerId,
        customerName: customers.name,
        productId: warranties.productId,
        productName: products.name,
        productSerial: warranties.productSerial,
        warrantyPolicyId: warranties.warrantyPolicyId,
        policyName: warrantyPolicies.name,
        policyType: warrantyPolicies.type,
        registrationDate: warranties.registrationDate,
        expiryDate: warranties.expiryDate,
        status: warranties.status,
        currentCycleCount: warranties.currentCycleCount,
        cycleLimit: warrantyPolicies.cycleLimit,
        assignedUserId: warranties.assignedUserId,
        expiryAlertOptOut: warranties.expiryAlertOptOut,
        lastExpiryAlertSent: warranties.lastExpiryAlertSent,
        certificateUrl: warranties.certificateUrl,
        notes: warranties.notes,
        createdAt: warranties.createdAt,
        updatedAt: warranties.updatedAt,
      })
      .from(warranties)
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
      .where(and(eq(warranties.id, id), eq(warranties.organizationId, organizationId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const w = result[0];
    const items = await db
      .select({
        id: warrantyItems.id,
        productId: warrantyItems.productId,
        productName: products.name,
        productSku: products.sku,
        productSerial: warrantyItems.productSerial,
        warrantyStartDate: warrantyItems.warrantyStartDate,
        warrantyEndDate: warrantyItems.warrantyEndDate,
        warrantyPeriodMonths: warrantyItems.warrantyPeriodMonths,
        installationNotes: warrantyItems.installationNotes,
      })
      .from(warrantyItems)
      .leftJoin(products, eq(products.id, warrantyItems.productId))
      .where(
        and(
          eq(warrantyItems.warrantyId, w.id),
          eq(warrantyItems.organizationId, organizationId)
        )
      )
      .orderBy(asc(warrantyItems.warrantyStartDate));
    return {
      id: w.id,
      warrantyNumber: w.warrantyNumber,
      organizationId: w.organizationId,
      customerId: w.customerId,
      customerName: w.customerName,
      productId: w.productId,
      productName: w.productName,
      productSerial: w.productSerial,
      warrantyPolicyId: w.warrantyPolicyId,
      policyName: w.policyName,
      policyType: w.policyType,
      registrationDate: w.registrationDate.toISOString(),
      expiryDate: w.expiryDate.toISOString(),
      status: w.status,
      currentCycleCount: w.currentCycleCount,
      cycleLimit: w.cycleLimit,
      assignedUserId: w.assignedUserId,
      expiryAlertOptOut: w.expiryAlertOptOut,
      lastExpiryAlertSent: w.lastExpiryAlertSent?.toISOString() ?? null,
      certificateUrl: w.certificateUrl,
      notes: w.notes,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        productSerial: item.productSerial,
        warrantyStartDate: item.warrantyStartDate,
        warrantyEndDate: item.warrantyEndDate,
        warrantyPeriodMonths: item.warrantyPeriodMonths,
        installationNotes: item.installationNotes,
      })),
    };
});

/**
 * Get a single warranty by ID with full details.
 * Returns WarrantyDetail type from @/lib/schemas/warranty per SCHEMA-TRACE.md
 */
export const getWarranty = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantySchema)
  .handler(async ({ data }): Promise<WarrantyDetail> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const result = await _getWarrantyCached(data.id, ctx.organizationId);
    if (!result) {
      setResponseStatus(404);
      throw new NotFoundError('Warranty not found', 'warranty');
    }
    return result;
  });

/**
 * Update warranty expiry alert opt-out setting.
 *
 * Allows customers to opt-out of receiving expiry alert notifications
 * for a specific warranty.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003d
 */
export const updateWarrantyOptOut = createServerFn({ method: 'POST' })
  .inputValidator(updateWarrantyOptOutSchema)
  .handler(async ({ data }): Promise<{ success: boolean; optOut: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);
    const { warrantyId, optOut } = data;

    // Verify the warranty belongs to this organization
    const warranty = await verifyWarrantyExists(warrantyId, ctx.organizationId, {
      message: 'Warranty not found',
    });

    // Update the opt-out setting
    await db
      .update(warranties)
      .set({
        expiryAlertOptOut: optOut,
        updatedAt: new Date(),
      })
      .where(eq(warranties.id, warrantyId));

    // Log opt-out change
    logger.logAsync({
      entityType: 'warranty',
      entityId: warrantyId,
      action: 'updated',
      description: optOut
        ? `Opted out of warranty expiry alerts: ${warranty.warrantyNumber}`
        : `Opted in to warranty expiry alerts: ${warranty.warrantyNumber}`,
      changes: {
        before: { expiryAlertOptOut: warranty.expiryAlertOptOut },
        after: { expiryAlertOptOut: optOut },
        fields: ['expiryAlertOptOut'],
      },
      metadata: {
        customerId: warranty.customerId ?? undefined,
        warrantyId,
        warrantyNumber: warranty.warrantyNumber ?? undefined,
      },
    });

    return { success: true, optOut };
  });

/**
 * Update customer warranty expiry alert opt-out setting.
 *
 * Allows customers to opt-out of receiving expiry alert notifications
 * for all their warranties at once.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003d
 */
export const updateCustomerWarrantyOptOut = createServerFn({ method: 'POST' })
  .inputValidator(updateCustomerWarrantyOptOutSchema)
  .handler(async ({ data }): Promise<{ success: boolean; optOut: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);
    const { customerId, optOut } = data;

    // Verify the customer belongs to this organization
    const customer = await verifyCustomerExists(customerId, ctx.organizationId, {
      message: 'Customer not found',
    });

    // Update the opt-out setting
    await db
      .update(customers)
      .set({
        warrantyExpiryAlertOptOut: optOut,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    // Log customer opt-out change
    logger.logAsync({
      entityType: 'customer',
      entityId: customerId,
      action: 'updated',
      description: optOut
        ? `Opted out of all warranty expiry alerts: ${customer.name}`
        : `Opted in to all warranty expiry alerts: ${customer.name}`,
      changes: {
        before: { warrantyExpiryAlertOptOut: customer.warrantyExpiryAlertOptOut },
        after: { warrantyExpiryAlertOptOut: optOut },
        fields: ['warrantyExpiryAlertOptOut'],
      },
      metadata: {
        customerId,
        customerName: customer.name ?? undefined,
      },
    });

    return { success: true, optOut };
  });

// ============================================================================
// DELETE (SOFT DELETE / ARCHIVE)
// ============================================================================

/**
 * Soft delete a warranty (archive)
 */
export const deleteWarranty = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);
    const { id } = data;

    // Verify warranty exists and belongs to organization
    const existing = await db.query.warranties.findFirst({
      where: and(
        eq(warranties.id, id),
        eq(warranties.organizationId, ctx.organizationId),
        isNull(warranties.deletedAt)
      ),
    });

    if (!existing) {
      throw new NotFoundError('Warranty not found', 'warranty');
    }

    // Guard: Cannot delete warranty with open claims
    if (await hasOpenClaims(id)) {
      throw new ValidationError('Cannot delete warranty with open claims. Resolve or cancel all claims first.');
    }

    // Soft delete
    await db
      .update(warranties)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(warranties.id, id));

    // Log activity
    logger.logAsync({
      entityType: 'warranty',
      entityId: id,
      action: 'deleted',
      description: `Deleted warranty: ${existing.warrantyNumber}`,
      metadata: {
        warrantyNumber: existing.warrantyNumber,
        customerId: existing.customerId,
        status: existing.status,
      },
    });

    return { success: true, id };
  });

// ============================================================================
// VOID WARRANTY
// ============================================================================

/**
 * Void a warranty (mark as voided)
 * Cannot void if there are open claims (submitted, under_review, approved)
 */
export const voidWarranty = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid(), reason: z.string().max(2000).optional() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);
    const { id, reason } = data;

    // Verify warranty exists and belongs to organization
    const existing = await db.query.warranties.findFirst({
      where: and(
        eq(warranties.id, id),
        eq(warranties.organizationId, ctx.organizationId),
        isNull(warranties.deletedAt)
      ),
    });

    if (!existing) {
      throw new NotFoundError('Warranty not found', 'warranty');
    }

    // Guard: Cannot void warranty with open claims
    if (await hasOpenClaims(id)) {
      throw new ValidationError('Cannot void warranty with open claims. Resolve or cancel all claims first.');
    }

    // Guard: Cannot void if already voided or transferred
    if (existing.status === 'voided') {
      throw new ValidationError('Warranty is already voided');
    }
    if (existing.status === 'transferred') {
      throw new ValidationError('Cannot void a transferred warranty');
    }

    // Update warranty status to voided
    await db
      .update(warranties)
      .set({
        status: 'voided',
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(warranties.id, id));

    // Log activity
    logger.logAsync({
      entityType: 'warranty',
      entityId: id,
      action: 'updated',
      description: `Voided warranty: ${existing.warrantyNumber}${reason ? ` - ${reason}` : ''}`,
      changes: {
        before: { status: existing.status },
        after: { status: 'voided' },
        fields: ['status'],
      },
      metadata: {
        warrantyNumber: existing.warrantyNumber,
        customerId: existing.customerId,
        previousStatus: existing.status,
        newStatus: 'voided',
        reason: reason ?? undefined,
      },
    });

    return { success: true, id };
  });

// ============================================================================
// TRANSFER WARRANTY
// ============================================================================

/**
 * Transfer a warranty to a new customer
 * Cannot transfer if there are open claims (submitted, under_review, approved)
 */
export const transferWarranty = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      newCustomerId: z.string().uuid('Invalid customer ID'),
      reason: z.string().max(2000).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);
    const { id, newCustomerId, reason } = data;

    // Verify warranty exists and belongs to organization
    const existing = await db.query.warranties.findFirst({
      where: and(
        eq(warranties.id, id),
        eq(warranties.organizationId, ctx.organizationId),
        isNull(warranties.deletedAt)
      ),
    });

    if (!existing) {
      throw new NotFoundError('Warranty not found', 'warranty');
    }

    // Guard: Cannot transfer if already transferred or voided
    if (existing.status === 'transferred') {
      throw new ValidationError('Warranty is already transferred');
    }
    if (existing.status === 'voided') {
      throw new ValidationError('Cannot transfer a voided warranty');
    }

    // Guard: Cannot transfer warranty with open claims
    if (await hasOpenClaims(id)) {
      throw new ValidationError('Cannot transfer warranty with open claims. Resolve or cancel all claims first.');
    }

    // Verify new customer exists and belongs to organization
    const newCustomer = await db.query.customers.findFirst({
      where: and(eq(customers.id, newCustomerId), eq(customers.organizationId, ctx.organizationId)),
    });

    if (!newCustomer) {
      throw new NotFoundError('New customer not found', 'customer');
    }

    // Update warranty customer and status
    await db
      .update(warranties)
      .set({
        customerId: newCustomerId,
        status: 'transferred',
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(warranties.id, id));

    // Log activity
    logger.logAsync({
      entityType: 'warranty',
      entityId: id,
      action: 'updated',
      description: `Transferred warranty: ${existing.warrantyNumber} to customer ${newCustomer.name}${reason ? ` - ${reason}` : ''}`,
      changes: {
        before: { customerId: existing.customerId, status: existing.status },
        after: { customerId: newCustomerId, status: 'transferred' },
        fields: ['customerId', 'status'],
      },
      metadata: {
        warrantyNumber: existing.warrantyNumber,
        previousStatus: existing.status,
        newStatus: 'transferred',
        reason: reason ?? undefined,
        customFields: {
          previousCustomerId: existing.customerId,
          newCustomerId,
        },
      },
    });

    return { 
      success: true, 
      id,
      previousCustomerId: existing.customerId,
      newCustomerId,
    };
  });

// ============================================================================
// CANCEL WARRANTY CLAIM
// ============================================================================

/**
 * Cancel a warranty claim
 */
export const cancelWarrantyClaim = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    id: z.string().uuid(),
    reason: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);
    const { id, reason } = data;

    const existing = await db.query.warrantyClaims.findFirst({
      where: and(
        eq(warrantyClaims.id, id),
        eq(warrantyClaims.organizationId, ctx.organizationId)
      ),
    });

    if (!existing) {
      throw new NotFoundError('Warranty claim not found', 'warranty_claim');
    }

    // Guard: Only allow cancellation from submitted or under_review
    if (!['submitted', 'under_review'].includes(existing.status)) {
      throw new ValidationError(`Cannot cancel claim in '${existing.status}' status. Only submitted or under review claims can be cancelled.`);
    }

    const [updated] = await db
      .update(warrantyClaims)
      .set({
        status: 'cancelled',
        notes: reason ? `${existing.notes ? existing.notes + '\n' : ''}Cancellation reason: ${reason}` : existing.notes,
        updatedBy: ctx.user.id,
      })
      .where(eq(warrantyClaims.id, id))
      .returning();

    logger.logAsync({
      entityType: 'warranty_claim',
      entityId: id,
      action: 'updated',
      description: `Cancelled warranty claim: ${existing.claimNumber}${reason ? ` - ${reason}` : ''}`,
      metadata: {
        claimNumber: existing.claimNumber,
        warrantyId: existing.warrantyId,
        previousStatus: existing.status,
        newStatus: 'cancelled',
        reason,
      },
    });

    return updated;
  });
