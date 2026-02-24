/**
 * Activity Navigation Utilities
 *
 * Utilities for generating navigation links and suggested actions
 * based on activity types and entity contexts.
 *
 * @see src/components/shared/activity/activity-item.tsx for related link generation
 * @see src/routes/_authenticated/activities/index.tsx for activity feed search params
 */

import type { ActivityEntityType } from '@/lib/schemas/activities';

// ============================================================================
// ACTIVITY FEED SEARCH (typed navigation for /activities)
// ============================================================================

/**
 * Get search params for Link to /activities route.
 * Use with: <Link to="/activities" search={getActivitiesFeedSearch('customer')} />
 *
 * @param entityType - Optional entity type to filter feed (e.g. 'customer', 'opportunity')
 * @returns Search object for typed navigation
 */
export function getActivitiesFeedSearch(
  entityType?: ActivityEntityType | string
): { entityType?: ActivityEntityType } {
  if (!entityType) return {};
  return { entityType: entityType as ActivityEntityType };
}

// ============================================================================
// ENTITY LINK GENERATION
// ============================================================================

/**
 * Get the default navigation link for an entity type and ID.
 * Centralized route mapping for activity-related navigation.
 *
 * @param entityType - The type of entity
 * @param entityId - The ID of the entity
 * @returns The route path or null if no route exists
 *
 * @example
 * ```ts
 * getEntityLink('customer', '123') // '/customers/123'
 * getEntityLink('order', '456') // '/orders/456'
 * ```
 */
export function getEntityLink(
  entityType: ActivityEntityType | string,
  entityId: string
): string | null {
  // Map entity types to routes
  const routeMap: Partial<Record<ActivityEntityType | string, string>> = {
    customer: `/customers/${entityId}`,
    contact: `/customers/${entityId}`, // Contacts route to customer detail
    order: `/orders/${entityId}`,
    opportunity: `/pipeline/opportunities/${entityId}`,
    product: `/products/${entityId}`,
    supplier: `/suppliers/${entityId}`,
    warranty: `/warranties/${entityId}`,
    warranty_claim: `/warranties/${entityId}/claims`,
    warranty_policy: `/warranties/policies/${entityId}`,
    warranty_extension: `/warranties/${entityId}/extensions`,
    issue: `/support/issues/${entityId}`,
    project: `/projects/${entityId}`,
    purchase_order: `/purchase-orders/${entityId}`,
    inventory: `/inventory/${entityId}`,
    email: `/communications/emails/${entityId}`,
    call: `/communications/calls/${entityId}`,
    quote: `/pipeline/quotes/${entityId}`,
    shipment: `/orders/${entityId}/shipments`,
    workstream: `/projects/${entityId}`,
    task: `/projects/${entityId}/tasks`,
    site_visit: `/projects/${entityId}/visits`,
    job_assignment: `/projects/${entityId}/assignments`,
    job_material: `/projects/${entityId}/materials`,
    job_photo: `/projects/${entityId}/photos`,
    user: `/users/${entityId}`,
  };
  return routeMap[entityType] ?? null;
}

/**
 * Get entity link with optional tab parameter.
 *
 * @param entityType - The type of entity
 * @param entityId - The ID of the entity
 * @param tab - Optional tab to navigate to (e.g., 'activity', 'notes')
 * @returns The route path with tab query param or null if no route exists
 */
export function getEntityLinkWithTab(
  entityType: ActivityEntityType | string,
  entityId: string,
  tab: string
): string | null {
  const baseLink = getEntityLink(entityType, entityId);
  if (!baseLink) return null;
  return `${baseLink}?tab=${tab}`;
}

// ============================================================================
// RELATED ENTITY LINKS
// ============================================================================

/**
 * Get link for creating a related entity with context.
 *
 * @param targetEntityType - The type of entity to create
 * @param contextEntityType - The type of the parent entity
 * @param contextEntityId - The ID of the parent entity
 * @returns The route path with context params or null if not supported
 */
export function getCreateEntityLinkWithContext(
  targetEntityType: 'quote' | 'order' | 'project' | 'claim' | 'issue',
  contextEntityType: ActivityEntityType | string,
  contextEntityId: string
): string | null {
  const contextParamMap: Partial<Record<ActivityEntityType | string, string>> = {
    customer: 'customerId',
    order: 'orderId',
    opportunity: 'opportunityId',
    warranty: 'warrantyId',
  };

  const contextParam = contextParamMap[contextEntityType];
  if (!contextParam) return null;

  const routeMap: Record<string, string> = {
    quote: '/pipeline/quotes/new',
    order: '/orders/create',
    project: '/projects/new',
    claim: '/support/claims/new',
    issue: '/support/issues/new',
  };

  const route = routeMap[targetEntityType];
  if (!route) return null;

  return `${route}?${contextParam}=${contextEntityId}`;
}
