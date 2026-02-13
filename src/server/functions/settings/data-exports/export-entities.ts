'use server'

/**
 * Entity Fetchers for Data Exports
 *
 * Fetches exportable entities with whitelisted columns only.
 * Excludes sensitive fields: token, hash, password, secret, apiKey, etc.
 *
 * @see data-exports.ts for orchestration
 */

import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers,
  contacts,
  orders,
  products,
  suppliers,
  opportunities,
  issues,
  activities,
  auditLogs,
} from 'drizzle/schema';

const MAX_ROWS_PER_ENTITY = 5000;

export interface EntityExportResult {
  entity: string;
  rows: Record<string, unknown>[];
}

export interface FetchEntitiesOptions {
  organizationId: string;
  entities: string[];
  dateRange?: { start?: Date; end?: Date };
  filters?: Record<string, unknown>;
}

/**
 * Filter out sensitive keys from JSONB/object before export.
 */
function filterSensitiveKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'passwordHash', 'password_hash',
    'token', 'tokenHash', 'token_hash', 'hashedToken', 'accessToken', 'refreshToken',
    'sessionToken', 'signOffToken', 'confirmationToken',
    'secret', 'apiKey', 'api_key', 'secretKey', 'secret_key',
  ];
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (sensitiveKeys.some(kk => lower.includes(kk.toLowerCase()))) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      result[k] = filterSensitiveKeys(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Fetch customers for export.
 */
async function fetchCustomers(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(customers.organizationId, organizationId), sql`${customers.deletedAt} IS NULL`];
  if (dateRange?.start) {
    conditions.push(gte(customers.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(customers.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      id: customers.id,
      customerCode: customers.customerCode,
      name: customers.name,
      legalName: customers.legalName,
      email: customers.email,
      phone: customers.phone,
      website: customers.website,
      status: customers.status,
      type: customers.type,
      size: customers.size,
      industry: customers.industry,
      taxId: customers.taxId,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch contacts for export.
 */
async function fetchContacts(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(contacts.organizationId, organizationId)];
  if (dateRange?.start) {
    conditions.push(gte(contacts.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(contacts.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      id: contacts.id,
      customerId: contacts.customerId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      title: contacts.title,
      email: contacts.email,
      phone: contacts.phone,
      mobile: contacts.mobile,
      department: contacts.department,
      isPrimary: contacts.isPrimary,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .where(and(...conditions))
    .orderBy(desc(contacts.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch orders for export.
 */
async function fetchOrders(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(orders.organizationId, organizationId), sql`${orders.deletedAt} IS NULL`];
  if (dateRange?.start) {
    const startStr = dateRange.start instanceof Date ? dateRange.start.toISOString().slice(0, 10) : String(dateRange.start).slice(0, 10);
    conditions.push(gte(orders.orderDate, startStr));
  }
  if (dateRange?.end) {
    const endStr = dateRange.end instanceof Date ? dateRange.end.toISOString().slice(0, 10) : String(dateRange.end).slice(0, 10);
    conditions.push(lte(orders.orderDate, endStr));
  }

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      orderDate: orders.orderDate,
      dueDate: orders.dueDate,
      total: orders.total,
      subtotal: orders.subtotal,
      taxAmount: orders.taxAmount,
      discountAmount: orders.discountAmount,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch products for export.
 */
async function fetchProducts(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(products.organizationId, organizationId), sql`${products.deletedAt} IS NULL`];
  if (dateRange?.start) {
    conditions.push(gte(products.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(products.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      barcode: products.barcode,
      type: products.type,
      status: products.status,
      basePrice: products.basePrice,
      costPrice: products.costPrice,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch suppliers for export.
 */
async function fetchSuppliers(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(suppliers.organizationId, organizationId), sql`${suppliers.deletedAt} IS NULL`];
  if (dateRange?.start) {
    conditions.push(gte(suppliers.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(suppliers.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      id: suppliers.id,
      supplierCode: suppliers.supplierCode,
      name: suppliers.name,
      legalName: suppliers.legalName,
      email: suppliers.email,
      phone: suppliers.phone,
      website: suppliers.website,
      status: suppliers.status,
      supplierType: suppliers.supplierType,
      taxId: suppliers.taxId,
      createdAt: suppliers.createdAt,
      updatedAt: suppliers.updatedAt,
    })
    .from(suppliers)
    .where(and(...conditions))
    .orderBy(desc(suppliers.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch opportunities for export.
 */
async function fetchOpportunities(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(opportunities.organizationId, organizationId), sql`${opportunities.deletedAt} IS NULL`];
  if (dateRange?.start) {
    conditions.push(gte(opportunities.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(opportunities.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      description: opportunities.description,
      customerId: opportunities.customerId,
      contactId: opportunities.contactId,
      assignedTo: opportunities.assignedTo,
      stage: opportunities.stage,
      probability: opportunities.probability,
      value: opportunities.value,
      weightedValue: opportunities.weightedValue,
      expectedCloseDate: opportunities.expectedCloseDate,
      actualCloseDate: opportunities.actualCloseDate,
      createdAt: opportunities.createdAt,
      updatedAt: opportunities.updatedAt,
    })
    .from(opportunities)
    .where(and(...conditions))
    .orderBy(desc(opportunities.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch issues for export.
 */
async function fetchIssues(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(issues.organizationId, organizationId), sql`${issues.deletedAt} IS NULL`];
  if (dateRange?.start) {
    conditions.push(gte(issues.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(issues.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      id: issues.id,
      issueNumber: issues.issueNumber,
      title: issues.title,
      description: issues.description,
      type: issues.type,
      priority: issues.priority,
      status: issues.status,
      customerId: issues.customerId,
      assignedToUserId: issues.assignedToUserId,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      resolvedAt: issues.resolvedAt,
    })
    .from(issues)
    .where(and(...conditions))
    .orderBy(desc(issues.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch activities for export.
 */
async function fetchActivities(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(activities.organizationId, organizationId)];
  if (dateRange?.start) {
    conditions.push(gte(activities.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(activities.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      id: activities.id,
      userId: activities.userId,
      entityType: activities.entityType,
      entityId: activities.entityId,
      action: activities.action,
      description: activities.description,
      entityName: activities.entityName,
      source: activities.source,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.createdAt))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

/**
 * Fetch audit logs for export.
 */
async function fetchAuditLogs(
  organizationId: string,
  dateRange?: { start?: Date; end?: Date }
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(auditLogs.organizationId, organizationId)];
  if (dateRange?.start) {
    conditions.push(gte(auditLogs.timestamp, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(auditLogs.timestamp, dateRange.end));
  }

  const rows = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      timestamp: auditLogs.timestamp,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.timestamp))
    .limit(MAX_ROWS_PER_ENTITY);

  return rows.map(r => filterSensitiveKeys(r as Record<string, unknown>));
}

const FETCHERS: Record<string, (orgId: string, dateRange?: { start?: Date; end?: Date }) => Promise<Record<string, unknown>[]>> = {
  customers: fetchCustomers,
  contacts: fetchContacts,
  orders: fetchOrders,
  products: fetchProducts,
  suppliers: fetchSuppliers,
  opportunities: fetchOpportunities,
  issues: fetchIssues,
  activities: fetchActivities,
  audit_logs: fetchAuditLogs,
};

/**
 * Fetch all requested entities.
 */
export async function fetchEntitiesForExport(
  options: FetchEntitiesOptions
): Promise<EntityExportResult[]> {
  const { organizationId, entities, dateRange } = options;
  const results: EntityExportResult[] = [];

  const fetchers = entities.map(async (entity) => {
    const fetcher = FETCHERS[entity];
    if (!fetcher) {
      return { entity, rows: [] };
    }
    const rows = await fetcher(organizationId, dateRange);
    return { entity, rows };
  });

  const resolved = await Promise.all(fetchers);
  results.push(...resolved);
  return results;
}
