/**
 * Get Generated Documents Server Function (INT-DOC-006-B)
 *
 * List generated documents for an entity with filtering, pagination, and metadata.
 * Provides document history and re-download capability.
 *
 * @see _Initiation/_prd/3-integrations/document-generation/document-generation.prd.json
 */

import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { z } from 'zod';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { generatedDocuments, orders, orderShipments } from 'drizzle/schema';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';

const SHIPMENT_OPERATIONAL_DOCUMENT_TYPES = new Set([
  'packing-slip',
  'dispatch-note',
  'delivery-note',
]);

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Query parameters for listing generated documents
 */
const generatedDocumentsQuerySchema = normalizeObjectInput(
  z.object({
    /** Entity type filter (e.g., 'order', 'warranty', 'job') */
    entityType: z.string(),
    /** Entity ID to get documents for */
    entityId: z.string().uuid(),
    /** Optional document type filter (e.g., 'quote', 'invoice', 'warranty_certificate') */
    documentType: z.string().optional(),
    /** Page size for cursor pagination (1-100, default 20) */
    limit: z.coerce.number().int().min(1).max(100).default(20),
    /** Cursor for pagination */
    cursor: z.string().optional(),
    /** Sort order (default desc = newest first) */
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
);

export type GeneratedDocumentsQuery = z.infer<typeof generatedDocumentsQuerySchema>;

/**
 * Schema for getting a single document by ID
 */
const getDocumentByIdSchema = normalizeObjectInput(
  z.object({
    id: z.string().uuid(),
  })
);

// ============================================================================
// GET GENERATED DOCUMENTS (LIST)
// ============================================================================

/**
 * List generated documents for an entity
 *
 * Returns documents with:
 * - filename, documentType, generatedAt, fileSize, storageUrl
 * - Cursor-based pagination for large document histories
 * - Filter by documentType
 *
 * Security:
 * - Requires order.read permission (documents are generated from orders/jobs/warranties)
 * - Always filters by organizationId for multi-tenant isolation
 *
 * @example
 * // Get all documents for an order
 * const { items, nextCursor } = await getGeneratedDocuments({
 *   data: { entityType: 'order', entityId: orderId }
 * });
 *
 * // Get only invoices for an order
 * const { items } = await getGeneratedDocuments({
 *   data: { entityType: 'order', entityId: orderId, documentType: 'invoice' }
 * });
 */
export const getGeneratedDocuments = createServerFn({ method: 'GET' })
  .inputValidator(generatedDocumentsQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    const { entityType, entityId, documentType, limit, cursor, sortOrder } = data;

    // Build where conditions - ALWAYS include organizationId for isolation
    const conditions = [
      eq(generatedDocuments.organizationId, ctx.organizationId),
      eq(generatedDocuments.entityType, entityType),
      eq(generatedDocuments.entityId, entityId),
    ];

    // Optional document type filter
    if (documentType) {
      conditions.push(eq(generatedDocuments.documentType, documentType));
    }

    // Add cursor condition if provided
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(
            generatedDocuments.createdAt,
            generatedDocuments.id,
            cursorPosition,
            sortOrder
          )
        );
      }
    }

    const whereClause = and(...conditions);
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    // Fetch pageSize + 1 for cursor pagination
    const results = await db
      .select({
        id: generatedDocuments.id,
        organizationId: generatedDocuments.organizationId,
        documentType: generatedDocuments.documentType,
        entityType: generatedDocuments.entityType,
        entityId: generatedDocuments.entityId,
        filename: generatedDocuments.filename,
        storageUrl: generatedDocuments.storageUrl,
        fileSize: generatedDocuments.fileSize,
        generatedAt: generatedDocuments.generatedAt,
        generatedById: generatedDocuments.generatedById,
        regenerationCount: generatedDocuments.regenerationCount,
        sourceRevision: generatedDocuments.sourceRevision,
        createdAt: generatedDocuments.createdAt,
      })
      .from(generatedDocuments)
      .where(whereClause)
      .orderBy(orderDirection(generatedDocuments.createdAt), orderDirection(generatedDocuments.id))
      .limit(limit + 1);

    const response = buildStandardCursorResponse(results, limit);

    if (entityType !== 'shipment') {
      return {
        ...response,
        items: response.items.map((item) => ({
          ...item,
          isStale: false,
          staleReason: undefined,
        })),
      };
    }

    const [shipment] = await db
      .select({
        operationalDocumentRevision: orderShipments.operationalDocumentRevision,
      })
      .from(orderShipments)
      .where(
        and(
          eq(orderShipments.id, entityId),
          eq(orderShipments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    const shipmentRevision = Number(shipment?.operationalDocumentRevision ?? 0);

    return {
      ...response,
      items: response.items.map((item) => {
        const isOperationalShipmentDoc =
          item.entityType === 'shipment' &&
          SHIPMENT_OPERATIONAL_DOCUMENT_TYPES.has(item.documentType);
        const isStale =
          isOperationalShipmentDoc &&
          Number(item.sourceRevision ?? 0) < shipmentRevision;

        return {
          ...item,
          isStale,
          staleReason: isStale
            ? 'Shipment details changed after this document was generated.'
            : undefined,
        };
      }),
    };
  });

// ============================================================================
// GET DOCUMENT BY ID
// ============================================================================

/**
 * Get a single generated document by ID
 *
 * Useful for fetching document details including download URL.
 */
export const getGeneratedDocumentById = createServerFn({ method: 'GET' })
  .inputValidator(getDocumentByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    const { id } = data;

    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.id, id),
          eq(generatedDocuments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!document) {
      setResponseStatus(404);
      throw new NotFoundError('Generated document not found', 'generatedDocument');
    }

    return document;
  });

// ============================================================================
// GET DOCUMENT COUNTS BY TYPE
// ============================================================================

/**
 * Schema for counting documents by type
 */
const documentCountsSchema = normalizeObjectInput(
  z.object({
    entityType: z.string(),
    entityId: z.string().uuid(),
  })
);

const orderDocumentAggregateSchema = normalizeObjectInput(
  z.object({
    orderId: z.string().uuid(),
  })
);

/**
 * Get counts of documents by type for an entity
 *
 * With the unique constraint on (org, entity, docType), each count will be 0 or 1.
 * This effectively tells you which document types exist for the entity.
 */
export const getDocumentCountsByType = createServerFn({ method: 'GET' })
  .inputValidator(documentCountsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    const { entityType, entityId } = data;

    const counts = await db
      .select({
        documentType: generatedDocuments.documentType,
        count: sql<number>`count(*)::int`,
      })
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.organizationId, ctx.organizationId),
          eq(generatedDocuments.entityType, entityType),
          eq(generatedDocuments.entityId, entityId)
        )
      )
      .groupBy(generatedDocuments.documentType);

    // Convert to a record for easy access
    const countsByType: Record<string, number> = {};
    for (const row of counts) {
      countsByType[row.documentType] = row.count;
    }

    return {
      total: Object.values(countsByType).reduce((sum, count) => sum + count, 0),
      byType: countsByType,
    };
  });

export const getOrderGeneratedDocuments = createServerFn({ method: 'GET' })
  .inputValidator(orderDocumentAggregateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    const orderDocuments = await db
      .select({
        id: generatedDocuments.id,
        organizationId: generatedDocuments.organizationId,
        documentType: generatedDocuments.documentType,
        entityType: generatedDocuments.entityType,
        entityId: generatedDocuments.entityId,
        filename: generatedDocuments.filename,
        storageUrl: generatedDocuments.storageUrl,
        fileSize: generatedDocuments.fileSize,
        generatedAt: generatedDocuments.generatedAt,
        generatedById: generatedDocuments.generatedById,
        regenerationCount: generatedDocuments.regenerationCount,
        sourceRevision: generatedDocuments.sourceRevision,
        createdAt: generatedDocuments.createdAt,
      })
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.organizationId, ctx.organizationId),
          eq(generatedDocuments.entityType, 'order'),
          eq(generatedDocuments.entityId, data.orderId),
          inArray(generatedDocuments.documentType, ['quote', 'invoice', 'pro-forma'])
        )
      );

    const shipmentsById = new Map(
      (
        await db
          .select({
            id: orderShipments.id,
            shipmentNumber: orderShipments.shipmentNumber,
            operationalDocumentRevision: orderShipments.operationalDocumentRevision,
          })
          .from(orderShipments)
          .where(
            and(
              eq(orderShipments.organizationId, ctx.organizationId),
              eq(orderShipments.orderId, data.orderId)
            )
          )
      ).map((shipment) => [shipment.id, shipment])
    );

    const shipmentIds = Array.from(shipmentsById.keys());

    const shipmentDocuments =
      shipmentIds.length === 0
        ? []
        : await db
            .select({
              id: generatedDocuments.id,
              organizationId: generatedDocuments.organizationId,
              documentType: generatedDocuments.documentType,
              entityType: generatedDocuments.entityType,
              entityId: generatedDocuments.entityId,
              filename: generatedDocuments.filename,
              storageUrl: generatedDocuments.storageUrl,
              fileSize: generatedDocuments.fileSize,
              generatedAt: generatedDocuments.generatedAt,
              generatedById: generatedDocuments.generatedById,
              regenerationCount: generatedDocuments.regenerationCount,
              sourceRevision: generatedDocuments.sourceRevision,
              createdAt: generatedDocuments.createdAt,
            })
            .from(generatedDocuments)
            .where(
              and(
                eq(generatedDocuments.organizationId, ctx.organizationId),
                eq(generatedDocuments.entityType, 'shipment'),
                inArray(generatedDocuments.entityId, shipmentIds)
              )
            );

    return [...orderDocuments, ...shipmentDocuments]
      .map((document) => {
        const shipment = document.entityType === 'shipment'
          ? shipmentsById.get(document.entityId)
          : null;
        const isStale =
          document.entityType === 'shipment' &&
          SHIPMENT_OPERATIONAL_DOCUMENT_TYPES.has(document.documentType) &&
          Number(document.sourceRevision ?? 0) <
            Number(shipment?.operationalDocumentRevision ?? 0);

        return {
          ...document,
          shipmentNumber: shipment?.shipmentNumber,
          isStale,
          staleReason: isStale
            ? 'Shipment details changed after this document was generated.'
            : undefined,
        };
      })
      .sort((a, b) => {
        const left = new Date(a.createdAt).getTime();
        const right = new Date(b.createdAt).getTime();
        return right - left;
      });
  });
