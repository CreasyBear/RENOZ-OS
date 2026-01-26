/**
 * Warranty Server Functions
 *
 * Server functions for warranty data retrieval and management.
 * Separate from warranty-policies.ts which handles policy configuration.
 *
 * @see drizzle/schema/warranties.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003b
 */

import { eq, and, gte, lte, sql, desc, asc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { warranties, warrantyPolicies, customers, products } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { typedGetFn, typedGetNoInput, typedPostFn } from '@/lib/server/typed-server-fn';
import {
  getExpiringWarrantiesSchema,
  getExpiringWarrantiesReportSchema,
  getWarrantySchema,
  warrantyFiltersSchema,
  updateWarrantyOptOutSchema,
  updateCustomerWarrantyOptOutSchema,
} from '@/lib/schemas/warranty/warranties';
import { NotFoundError } from '@/lib/server/errors';

// ============================================================================
// TYPES
// ============================================================================

export interface ExpiringWarrantyItem {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSerial: string | null;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  policyName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  urgencyLevel: 'urgent' | 'warning' | 'approaching' | 'healthy';
  currentCycleCount: number | null;
  cycleLimit: number | null;
}

export interface GetExpiringWarrantiesResult {
  warranties: ExpiringWarrantyItem[];
  totalCount: number;
}

export interface WarrantyListItem {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSku: string | null;
  productSerial: string | null;
  warrantyPolicyId: string;
  policyName: string;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  registrationDate: string;
  expiryDate: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'voided' | 'transferred';
  currentCycleCount: number | null;
  cycleLimit: number | null;
  expiryAlertOptOut: boolean;
  certificateUrl: string | null;
}

export interface ListWarrantiesResult {
  warranties: WarrantyListItem[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determine urgency level based on days until expiry.
 */
function getUrgencyLevel(daysUntilExpiry: number): ExpiringWarrantyItem['urgencyLevel'] {
  if (daysUntilExpiry <= 7) return 'urgent';
  if (daysUntilExpiry <= 14) return 'warning';
  if (daysUntilExpiry <= 21) return 'approaching';
  return 'healthy';
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
export const getExpiringWarranties = typedGetFn(
  getExpiringWarrantiesSchema,
  async ({ data }): Promise<GetExpiringWarrantiesResult> => {
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
        urgencyLevel: getUrgencyLevel(daysUntilExpiry),
        currentCycleCount: w.currentCycleCount,
        cycleLimit: w.cycleLimit,
      };
    });

    return {
      warranties: warrantiesResult,
      totalCount,
    };
  }
);

/**
 * List warranties with filtering, sorting, and pagination.
 */
export const listWarranties = typedGetFn(
  warrantyFiltersSchema,
  async ({ data }): Promise<ListWarrantiesResult> => {
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
      conditions.push(
        sql`(
          ${warranties.warrantyNumber} ILIKE ${`%${search}%`} OR
          ${warranties.productSerial} ILIKE ${`%${search}%`} OR
          ${customers.name} ILIKE ${`%${search}%`} OR
          ${products.name} ILIKE ${`%${search}%`}
        )`
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
    if (productId) {
      conditions.push(eq(warranties.productId, productId));
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
      .offset(offset);

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
  }
);

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
export const getExpiringWarrantiesReport = typedGetFn(
  getExpiringWarrantiesReportSchema,
  async ({ data }): Promise<ExpiringWarrantiesReportResult> => {
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
      .offset(offset);

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
        urgencyLevel: getUrgencyLevel(daysUntilExpiry),
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
  }
);

/**
 * Get filter options for expiring warranties report.
 * Returns lists of customers and products with active warranties.
 */
export const getExpiringWarrantiesFilterOptions = typedGetNoInput(async () => {
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
 * Warranty detail type returned by getWarranty.
 */
export interface WarrantyDetail {
  id: string;
  warrantyNumber: string;
  organizationId: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSerial: string | null;
  warrantyPolicyId: string;
  policyName: string;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  registrationDate: string;
  expiryDate: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'voided' | 'transferred';
  currentCycleCount: number | null;
  cycleLimit: number | null;
  assignedUserId: string | null;
  expiryAlertOptOut: boolean;
  lastExpiryAlertSent: string | null;
  certificateUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get a single warranty by ID with full details.
 */
export const getWarranty = typedGetFn(
  getWarrantySchema,
  async ({ data }): Promise<WarrantyDetail | null> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const { id } = data;

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
      .where(and(eq(warranties.id, id), eq(warranties.organizationId, ctx.organizationId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const w = result[0];
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
    };
  }
);

/**
 * Update warranty expiry alert opt-out setting.
 *
 * Allows customers to opt-out of receiving expiry alert notifications
 * for a specific warranty.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003d
 */
export const updateWarrantyOptOut = typedPostFn(
  updateWarrantyOptOutSchema,
  async ({ data }): Promise<{ success: boolean; optOut: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const { warrantyId, optOut } = data;

    // Verify the warranty belongs to this organization
    const warranty = await db
      .select({ id: warranties.id })
      .from(warranties)
      .where(and(eq(warranties.id, warrantyId), eq(warranties.organizationId, ctx.organizationId)))
      .limit(1);

    if (warranty.length === 0) {
      throw new NotFoundError('Warranty not found', 'warranty');
    }

    // Update the opt-out setting
    await db
      .update(warranties)
      .set({
        expiryAlertOptOut: optOut,
        updatedAt: new Date(),
      })
      .where(eq(warranties.id, warrantyId));

    return { success: true, optOut };
  }
);

/**
 * Update customer warranty expiry alert opt-out setting.
 *
 * Allows customers to opt-out of receiving expiry alert notifications
 * for all their warranties at once.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003d
 */
export const updateCustomerWarrantyOptOut = typedPostFn(
  updateCustomerWarrantyOptOutSchema,
  async ({ data }): Promise<{ success: boolean; optOut: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const { customerId, optOut } = data;

    // Verify the customer belongs to this organization
    const customer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.organizationId)))
      .limit(1);

    if (customer.length === 0) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    // Update the opt-out setting
    await db
      .update(customers)
      .set({
        warrantyExpiryAlertOptOut: optOut,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    return { success: true, optOut };
  }
);
