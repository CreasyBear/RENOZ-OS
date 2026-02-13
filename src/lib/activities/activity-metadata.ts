/**
 * Activity Metadata Utilities
 *
 * Utilities for resolving UUIDs in activity metadata to readable names.
 * Handles batch fetching for performance.
 */

import { db } from '@/lib/db';
import { customers, orders, opportunities } from 'drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { ActivityMetadata } from '@/lib/schemas/activities';

// ============================================================================
// METADATA RESOLUTION
// ============================================================================

/**
 * Resolve UUIDs in metadata to readable names.
 * Transforms metadata fields like customerId, orderId, opportunityId to include names.
 *
 * @param metadata - The activity metadata to resolve
 * @param organizationId - Organization ID for multi-tenant isolation
 * @returns Metadata with resolved names added
 */
export async function resolveMetadataUuids(
  metadata: ActivityMetadata | null,
  organizationId: string
): Promise<ActivityMetadata | null> {
  if (!metadata || typeof metadata !== 'object') return metadata;

  const resolved = { ...metadata };
  const customerIds = new Set<string>();
  const orderIds = new Set<string>();
  const opportunityIds = new Set<string>();

  // Collect UUIDs from metadata
  if (metadata.customerId && typeof metadata.customerId === 'string') {
    customerIds.add(metadata.customerId);
  }
  if (metadata.orderId && typeof metadata.orderId === 'string') {
    orderIds.add(metadata.orderId);
  }
  if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
    opportunityIds.add(metadata.opportunityId);
  }

  // Batch fetch names
  const [customerNames, orderNumbers, opportunityTitles] = await Promise.all([
    customerIds.size > 0
      ? db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(
            and(
              inArray(customers.id, Array.from(customerIds)),
              eq(customers.organizationId, organizationId)
            )
          )
      : [],
    orderIds.size > 0
      ? db
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            and(
              inArray(orders.id, Array.from(orderIds)),
              eq(orders.organizationId, organizationId)
            )
          )
      : [],
    opportunityIds.size > 0
      ? db
          .select({ id: opportunities.id, title: opportunities.title })
          .from(opportunities)
          .where(
            and(
              inArray(opportunities.id, Array.from(opportunityIds)),
              eq(opportunities.organizationId, organizationId)
            )
          )
      : [],
  ]);

  // Create lookup maps
  const customerMap = new Map(customerNames.map((c) => [c.id, c.name]));
  const orderMap = new Map(orderNumbers.map((o) => [o.id, o.orderNumber]));
  const opportunityMap = new Map(opportunityTitles.map((o) => [o.id, o.title]));

  // Add resolved names to metadata (keep original UUIDs for reference)
  if (metadata.customerId && typeof metadata.customerId === 'string') {
    const customerName = customerMap.get(metadata.customerId);
    if (customerName) {
      resolved.customerName = customerName;
    }
  }
  if (metadata.orderId && typeof metadata.orderId === 'string') {
    const orderNumber = orderMap.get(metadata.orderId);
    if (orderNumber) {
      resolved.orderNumber = orderNumber;
    }
  }
  if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
    const opportunityTitle = opportunityMap.get(metadata.opportunityId);
    if (opportunityTitle) {
      resolved.opportunityTitle = opportunityTitle;
    }
  }

  return resolved;
}

/**
 * Batch resolve UUIDs from multiple activity metadata objects.
 * More efficient than calling resolveMetadataUuids multiple times.
 *
 * @param metadataArray - Array of metadata objects to resolve
 * @param organizationId - Organization ID for multi-tenant isolation
 * @returns Array of resolved metadata objects
 */
export async function batchResolveMetadataUuids(
  metadataArray: Array<ActivityMetadata | null>,
  organizationId: string
): Promise<Array<ActivityMetadata | null>> {
  // Collect all UUIDs across all metadata objects
  const allCustomerIds = new Set<string>();
  const allOrderIds = new Set<string>();
  const allOpportunityIds = new Set<string>();

  metadataArray.forEach((metadata) => {
    if (metadata && typeof metadata === 'object') {
      if (metadata.customerId && typeof metadata.customerId === 'string') {
        allCustomerIds.add(metadata.customerId);
      }
      if (metadata.orderId && typeof metadata.orderId === 'string') {
        allOrderIds.add(metadata.orderId);
      }
      if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
        allOpportunityIds.add(metadata.opportunityId);
      }
    }
  });

  // Batch fetch all names at once
  const [customerNames, orderNumbers, opportunityTitles] = await Promise.all([
    allCustomerIds.size > 0
      ? db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(
            and(
              inArray(customers.id, Array.from(allCustomerIds)),
              eq(customers.organizationId, organizationId)
            )
          )
      : Promise.resolve([]),
    allOrderIds.size > 0
      ? db
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            and(
              inArray(orders.id, Array.from(allOrderIds)),
              eq(orders.organizationId, organizationId)
            )
          )
      : Promise.resolve([]),
    allOpportunityIds.size > 0
      ? db
          .select({ id: opportunities.id, title: opportunities.title })
          .from(opportunities)
          .where(
            and(
              inArray(opportunities.id, Array.from(allOpportunityIds)),
              eq(opportunities.organizationId, organizationId)
            )
          )
      : Promise.resolve([]),
  ]);

  // Create lookup maps
  const customerMap = new Map(customerNames.map((c) => [c.id, c.name]));
  const orderMap = new Map(orderNumbers.map((o) => [o.id, o.orderNumber]));
  const opportunityMap = new Map(opportunityTitles.map((o) => [o.id, o.title]));

  // Resolve each metadata object
  return metadataArray.map((metadata) => {
    if (!metadata || typeof metadata !== 'object') return metadata;

    const resolved = { ...metadata };

    if (metadata.customerId && typeof metadata.customerId === 'string') {
      const customerName = customerMap.get(metadata.customerId);
      if (customerName) {
        resolved.customerName = customerName;
      }
    }
    if (metadata.orderId && typeof metadata.orderId === 'string') {
      const orderNumber = orderMap.get(metadata.orderId);
      if (orderNumber) {
        resolved.orderNumber = orderNumber;
      }
    }
    if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
      const opportunityTitle = opportunityMap.get(metadata.opportunityId);
      if (opportunityTitle) {
        resolved.opportunityTitle = opportunityTitle;
      }
    }

    return resolved;
  });
}
