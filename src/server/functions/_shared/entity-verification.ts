/**
 * Entity Verification Helpers
 *
 * Reusable helpers to verify an entity exists and belongs to the organization.
 * Replaces 50+ inline verification blocks across server functions.
 *
 * Usage: await verifyCustomerExists(customerId, ctx.organizationId)
 * Returns: Entity row (or minimal projection) or throws NotFoundError.
 *
 * NOTE: Call only from request handlers. Do not use in after() callbacks or Trigger.dev jobs.
 * Cache key is (id, organizationId) — never omit orgId.
 *
 * @see DRIZZLE-SERVER-FUNCTIONS-AUDIT.md Phase C
 */

import { cache } from 'react';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/server/errors';
import {
  customers,
  orders,
  products,
  jobAssignments,
  projects,
  warranties,
  warrantyClaims,
  opportunities,
  jobMaterials,
  siteVisits,
} from 'drizzle/schema';

/** UUID v4 regex for fail-fast validation. Only used for tables with UUID PKs. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUuid(id: string): void {
  if (!UUID_REGEX.test(id)) throw new NotFoundError('Resource not found');
}

export interface VerifyEntityOptions {
  /** Custom error message when not found */
  message?: string;
}

/** Entity types supported by batch verification. */
export type BatchEntityType = 'customer' | 'order' | 'product' | 'job';

// ============================================================================
// CUSTOMER (cached, UUID validated, setResponseStatus)
// ============================================================================

const _verifyCustomerCached = cache(
  async (
    customerId: string,
    organizationId: string
  ): Promise<{ id: string; name: string | null; warrantyExpiryAlertOptOut: boolean }> => {
    validateUuid(customerId);
    const [row] = await db
      .select({
        id: customers.id,
        name: customers.name,
        warrantyExpiryAlertOptOut: customers.warrantyExpiryAlertOptOut,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      setResponseStatus(404);
      throw new NotFoundError('Customer not found');
    }
    return row;
  }
);

/** Verify customer exists, belongs to org, and is not soft-deleted. */
export async function verifyCustomerExists(
  customerId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; name: string | null; warrantyExpiryAlertOptOut: boolean }> {
  try {
    return await _verifyCustomerCached(customerId, organizationId);
  } catch (e) {
    if (e instanceof NotFoundError && options?.message) {
      throw new NotFoundError(options.message);
    }
    throw e;
  }
}

// ============================================================================
// ORDER (cached, UUID validated, setResponseStatus)
// ============================================================================

const _verifyOrderCached = cache(async (orderId: string, organizationId: string): Promise<{ id: string }> => {
  validateUuid(orderId);
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)))
    .limit(1);

  if (!row) {
    setResponseStatus(404);
    throw new NotFoundError('Order not found');
  }
  return row;
});

/** Verify order exists and belongs to org. */
export async function verifyOrderExists(
  orderId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string }> {
  try {
    return await _verifyOrderCached(orderId, organizationId);
  } catch (e) {
    if (e instanceof NotFoundError && options?.message) {
      throw new NotFoundError(options.message);
    }
    throw e;
  }
}

// ============================================================================
// PRODUCT (cached, UUID validated, setResponseStatus)
// ============================================================================

const _verifyProductCached = cache(
  async (
    productId: string,
    organizationId: string
  ): Promise<{ id: string; sku: string | null; name: string; description: string | null }> => {
    validateUuid(productId);
    const [row] = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
      })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      setResponseStatus(404);
      throw new NotFoundError('Product not found');
    }
    return row;
  }
);

/** Verify product exists, belongs to org, and is not soft-deleted. */
export async function verifyProductExists(
  productId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; sku: string | null; name: string; description: string | null }> {
  try {
    return await _verifyProductCached(productId, organizationId);
  } catch (e) {
    if (e instanceof NotFoundError && options?.message) {
      throw new NotFoundError(options.message);
    }
    throw e;
  }
}

// ============================================================================
// JOB (job assignment) (cached, UUID validated, setResponseStatus)
// ============================================================================

const _verifyJobCached = cache(
  async (
    jobId: string,
    organizationId: string
  ): Promise<{ id: string; customerId: string | null }> => {
    validateUuid(jobId);
    const [row] = await db
      .select({ id: jobAssignments.id, customerId: jobAssignments.customerId })
      .from(jobAssignments)
      .where(and(eq(jobAssignments.id, jobId), eq(jobAssignments.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      setResponseStatus(404);
      throw new NotFoundError('Job not found');
    }
    return row;
  }
);

/** Verify job assignment exists and belongs to org. Returns job with customerId when needed. */
export async function verifyJobExists(
  jobId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; customerId: string | null }> {
  try {
    return await _verifyJobCached(jobId, organizationId);
  } catch (e) {
    if (e instanceof NotFoundError && options?.message) {
      throw new NotFoundError(options.message);
    }
    throw e;
  }
}

// ============================================================================
// BATCH VERIFICATION
// ============================================================================

type EntityRow = { id: string };

/** Verify all entities exist and belong to org. Throws NotFoundError with missing IDs if any are missing. */
export async function verifyEntitiesExist(
  entityType: BatchEntityType,
  ids: string[],
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<Map<string, EntityRow>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();

  for (const id of uniqueIds) validateUuid(id);

  let rows: { id: string }[] = [];
  if (entityType === 'customer') {
    rows = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          inArray(customers.id, uniqueIds),
          eq(customers.organizationId, organizationId),
          isNull(customers.deletedAt)
        )
      );
  } else if (entityType === 'order') {
    rows = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(inArray(orders.id, uniqueIds), eq(orders.organizationId, organizationId)));
  } else if (entityType === 'product') {
    rows = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          inArray(products.id, uniqueIds),
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      );
  } else if (entityType === 'job') {
    rows = await db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          inArray(jobAssignments.id, uniqueIds),
          eq(jobAssignments.organizationId, organizationId)
        )
      );
  }

  const found = new Set(rows.map((r) => r.id));
  const missing = uniqueIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    setResponseStatus(404);
    throw new NotFoundError(
      options?.message ?? `${entityType}(s) not found: ${missing.join(', ')}`,
      missing.join(',')
    );
  }

  return new Map(rows.map((r) => [r.id, r]));
}

// ============================================================================
// PROJECT
// ============================================================================

/** Verify project exists and belongs to org. */
export async function verifyProjectExists(
  projectId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; customerId: string | null; projectNumber: string | null; title: string | null }> {
  validateUuid(projectId);
  const [row] = await db
    .select({
      id: projects.id,
      customerId: projects.customerId,
      projectNumber: projects.projectNumber,
      title: projects.title,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .limit(1);

  if (!row) {
    setResponseStatus(404);
    throw new NotFoundError(options?.message ?? 'Project not found');
  }
  return row;
}

// ============================================================================
// WARRANTY
// ============================================================================

/** Verify warranty exists and belongs to org. */
export async function verifyWarrantyExists(
  warrantyId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; warrantyNumber: string | null; customerId: string | null; expiryAlertOptOut: boolean | null }> {
  validateUuid(warrantyId);
  const [row] = await db
    .select({
      id: warranties.id,
      warrantyNumber: warranties.warrantyNumber,
      customerId: warranties.customerId,
      expiryAlertOptOut: warranties.expiryAlertOptOut,
    })
    .from(warranties)
    .where(and(eq(warranties.id, warrantyId), eq(warranties.organizationId, organizationId)))
    .limit(1);

  if (!row) {
    setResponseStatus(404);
    throw new NotFoundError(options?.message ?? 'Warranty not found');
  }
  return row;
}

/** Verify warranty claim exists and belongs to org. */
export async function verifyWarrantyClaimExists(
  claimId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; warrantyId: string }> {
  validateUuid(claimId);
  const [row] = await db
    .select({ id: warrantyClaims.id, warrantyId: warrantyClaims.warrantyId })
    .from(warrantyClaims)
    .where(
      and(
        eq(warrantyClaims.id, claimId),
        eq(warrantyClaims.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!row) {
    setResponseStatus(404);
    throw new NotFoundError(options?.message ?? 'Warranty claim not found');
  }
  return row;
}

// ============================================================================
// OPPORTUNITY
// ============================================================================

/** Verify opportunity exists and belongs to org. */
export async function verifyOpportunityExists(
  opportunityId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string }> {
  validateUuid(opportunityId);
  const [row] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.id, opportunityId),
        eq(opportunities.organizationId, organizationId),
        isNull(opportunities.deletedAt)
      )
    )
    .limit(1);

  if (!row) {
    setResponseStatus(404);
    throw new NotFoundError(options?.message ?? 'Opportunity not found');
  }
  return row;
}

// ============================================================================
// SITE VISIT
// ============================================================================

/** Verify site visit exists and belongs to org. */
export async function verifySiteVisitExists(
  siteVisitId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; projectId: string | null; installerId: string | null; visitNumber: string }> {
  validateUuid(siteVisitId);
  const [row] = await db
    .select({
      id: siteVisits.id,
      projectId: siteVisits.projectId,
      installerId: siteVisits.installerId,
      visitNumber: siteVisits.visitNumber,
    })
    .from(siteVisits)
    .where(
      and(
        eq(siteVisits.id, siteVisitId),
        eq(siteVisits.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!row) {
    setResponseStatus(404);
    throw new NotFoundError(options?.message ?? 'Site visit not found');
  }
  return row;
}

// ============================================================================
// JOB MATERIAL
// ============================================================================

/** Verify job material exists and belongs to org. */
export async function verifyJobMaterialExists(
  materialId: string,
  organizationId: string,
  options?: VerifyEntityOptions
): Promise<{ id: string; jobId: string }> {
  validateUuid(materialId);
  const [row] = await db
    .select({ id: jobMaterials.id, jobId: jobMaterials.jobId })
    .from(jobMaterials)
    .where(
      and(
        eq(jobMaterials.id, materialId),
        eq(jobMaterials.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!row) {
    setResponseStatus(404);
    throw new NotFoundError(options?.message ?? 'Material not found');
  }
  return row;
}
