/**
 * Product Search Server Functions
 *
 * Provides full-text search with PostgreSQL tsvector,
 * attribute-based filtering, autocomplete, and search analytics.
 */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { products, categories, productAttributes, productAttributeValues } from 'drizzle/schema';
import { eq, and, or, isNull, ilike, sql, desc, asc, inArray, gte, lte } from 'drizzle-orm';
import { withAuth } from '@/lib/server/protected';

// ============================================================================
// SEARCH ANALYTICS TABLE (would normally be in schema, but keeping inline for simplicity)
// ============================================================================

// For tracking search terms - in production this would be a proper table
interface SearchAnalyticsEntry {
  term: string;
  count: number;
  lastSearched: Date;
}

// In-memory analytics for demo (production would use database table)
// LRU cache with max size to prevent unbounded memory growth
const MAX_SEARCH_ANALYTICS_SIZE = 1000;
const searchAnalytics = new Map<string, SearchAnalyticsEntry>();

// ============================================================================
// FULL-TEXT SEARCH
// ============================================================================

/**
 * Search products with full-text search and filtering.
 */
export const searchProducts = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      query: z.string().min(1).max(200),
      categoryId: z.string().uuid().optional(),
      status: z.enum(['active', 'inactive', 'discontinued']).optional(),
      type: z.enum(['physical', 'service', 'digital', 'bundle']).optional(),
      minPrice: z.number().min(0).optional(),
      maxPrice: z.number().min(0).optional(),
      attributes: z
        .array(
          z.object({
            attributeId: z.string().uuid(),
            value: z.union([z.string(), z.number(), z.boolean()]),
            operator: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'contains']).default('eq'),
          })
        )
        .optional(),
      sortBy: z
        .enum(['relevance', 'name', 'price_asc', 'price_desc', 'created'])
        .default('relevance'),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Track search analytics
    trackSearchTerm(data.query);

    // Build search vector query
    // PostgreSQL full-text search using to_tsquery
    const searchTerms = data.query
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => `${t}:*`) // Prefix matching
      .join(' & ');

    // Base conditions
    const conditions = [
      eq(products.organizationId, ctx.organizationId),
      isNull(products.deletedAt),
    ];

    // Full-text search condition using PostgreSQL tsvector
    // This searches name, description, sku, and tags
    const searchCondition = sql`(
      to_tsvector('english', coalesce(${products.name}, '') || ' ' ||
                             coalesce(${products.description}, '') || ' ' ||
                             coalesce(${products.sku}, '') || ' ' ||
                             coalesce(array_to_string(${products.tags}, ' '), ''))
      @@ to_tsquery('english', ${searchTerms})
      OR ${products.name} ILIKE ${'%' + data.query + '%'}
      OR ${products.sku} ILIKE ${'%' + data.query + '%'}
    )`;

    conditions.push(searchCondition);

    // Optional filters
    if (data.categoryId) {
      conditions.push(eq(products.categoryId, data.categoryId));
    }
    if (data.status) {
      conditions.push(eq(products.status, data.status));
    }
    if (data.type) {
      conditions.push(eq(products.type, data.type));
    }
    if (data.minPrice !== undefined) {
      conditions.push(gte(products.basePrice, data.minPrice));
    }
    if (data.maxPrice !== undefined) {
      conditions.push(lte(products.basePrice, data.maxPrice));
    }

    // Calculate relevance score
    const relevanceScore = sql<number>`
      ts_rank(
        to_tsvector('english', coalesce(${products.name}, '') || ' ' ||
                               coalesce(${products.description}, '') || ' ' ||
                               coalesce(${products.sku}, '')),
        to_tsquery('english', ${searchTerms})
      ) +
      CASE WHEN ${products.name} ILIKE ${'%' + data.query + '%'} THEN 1.0 ELSE 0 END +
      CASE WHEN ${products.sku} ILIKE ${data.query + '%'} THEN 2.0 ELSE 0 END
    `.as('relevance_score');

    // Determine sort order
    let orderBy;
    switch (data.sortBy) {
      case 'relevance':
        orderBy = desc(relevanceScore);
        break;
      case 'name':
        orderBy = asc(products.name);
        break;
      case 'price_asc':
        orderBy = asc(products.basePrice);
        break;
      case 'price_desc':
        orderBy = desc(products.basePrice);
        break;
      case 'created':
        orderBy = desc(products.createdAt);
        break;
      default:
        orderBy = desc(relevanceScore);
    }

    // Execute search query
    const offset = (data.page - 1) * data.limit;

    const searchResults = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        type: products.type,
        status: products.status,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
        categoryId: products.categoryId,
        categoryName: categories.name,
        tags: products.tags,
        createdAt: products.createdAt,
        relevanceScore,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(data.limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // If attribute filters specified, filter results
    let filteredResults = searchResults;
    if (data.attributes && data.attributes.length > 0) {
      const matchingIds = await filterByAttributes(
        searchResults.map((r) => r.id),
        data.attributes
      );
      // Re-fetch full data for filtered IDs
      if (matchingIds.length > 0) {
        const filteredIds = matchingIds.map((r) => r.id);
        filteredResults = searchResults.filter((r) => filteredIds.includes(r.id));
      } else {
        filteredResults = [];
      }
    }

    return {
      results: filteredResults,
      pagination: {
        page: data.page,
        pageSize: data.limit,
        total,
        totalPages: Math.ceil(total / data.limit),
      },
      query: data.query,
    };
  });

/**
 * Filter products by attribute values.
 */
async function filterByAttributes(
  productIds: string[],
  attributes: Array<{
    attributeId: string;
    value: string | number | boolean;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  }>
): Promise<Array<{ id: string }>> {
  if (productIds.length === 0) return [];

  // Get attribute values for these products
  const attrValues = await db
    .select({
      productId: productAttributeValues.productId,
      attributeId: productAttributeValues.attributeId,
      value: productAttributeValues.value,
    })
    .from(productAttributeValues)
    .where(
      and(
        inArray(productAttributeValues.productId, productIds),
        inArray(
          productAttributeValues.attributeId,
          attributes.map((a) => a.attributeId)
        )
      )
    );

  // Group by product
  const productAttrMap = new Map<string, Map<string, unknown>>();
  for (const av of attrValues) {
    if (!productAttrMap.has(av.productId)) {
      productAttrMap.set(av.productId, new Map());
    }
    productAttrMap.get(av.productId)!.set(av.attributeId, av.value);
  }

  // Filter products that match all attribute conditions
  const matchingProducts: Array<{ id: string }> = [];

  for (const productId of productIds) {
    const attrs = productAttrMap.get(productId);
    if (!attrs) continue;

    let allMatch = true;
    for (const filter of attributes) {
      const value = attrs.get(filter.attributeId);
      if (!matchesFilter(value, filter.value, filter.operator)) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      matchingProducts.push({ id: productId });
    }
  }

  return matchingProducts;
}

/**
 * Check if a value matches a filter condition.
 */
function matchesFilter(
  actualValue: unknown,
  filterValue: string | number | boolean,
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
): boolean {
  if (actualValue === null || actualValue === undefined) {
    return false;
  }

  switch (operator) {
    case 'eq':
      return actualValue === filterValue;
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'gt':
      return Number(actualValue) > Number(filterValue);
    case 'lt':
      return Number(actualValue) < Number(filterValue);
    case 'gte':
      return Number(actualValue) >= Number(filterValue);
    case 'lte':
      return Number(actualValue) <= Number(filterValue);
    default:
      return actualValue === filterValue;
  }
}

// ============================================================================
// AUTOCOMPLETE & SUGGESTIONS
// ============================================================================

/**
 * Get search suggestions based on partial query.
 */
export const getSearchSuggestions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      query: z.string().min(1).max(100),
      limit: z.number().int().min(1).max(20).default(10),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const searchTerm = data.query.trim();
    if (searchTerm.length < 2) {
      return { suggestions: [] };
    }

    // Get matching products for product name suggestions
    const productSuggestions = await db
      .select({
        type: sql<string>`'product'`.as('type'),
        value: products.name,
        id: products.id,
        sku: products.sku,
      })
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt),
          eq(products.status, 'active'),
          or(ilike(products.name, `${searchTerm}%`), ilike(products.sku, `${searchTerm}%`))
        )
      )
      .limit(data.limit);

    // Get matching category names
    const categorySuggestions = await db
      .select({
        type: sql<string>`'category'`.as('type'),
        value: categories.name,
        id: categories.id,
      })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, ctx.organizationId),
          ilike(categories.name, `${searchTerm}%`)
        )
      )
      .limit(5);

    // Get popular search terms matching the query
    const popularTerms = getMatchingPopularTerms(searchTerm, 5);

    // Combine and format suggestions
    const suggestions = [
      ...popularTerms.map((term) => ({
        type: 'recent' as const,
        value: term,
        id: null,
      })),
      ...categorySuggestions.map((c) => ({
        type: 'category' as const,
        value: c.value,
        id: c.id,
      })),
      ...productSuggestions.map((p) => ({
        type: 'product' as const,
        value: p.value,
        id: p.id,
        sku: p.sku,
      })),
    ].slice(0, data.limit);

    return { suggestions };
  });

/**
 * Get popular/trending search terms.
 */
export const getPopularSearchTerms = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      limit: z.number().int().min(1).max(20).default(10),
    })
  )
  .handler(async ({ data }) => {
    await withAuth();

    // Get most searched terms (sorted by count)
    const terms = Array.from(searchAnalytics.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, data.limit)
      .map((entry) => ({
        term: entry.term,
        count: entry.count,
      }));

    return { terms };
  });

/**
 * Track a search term for analytics.
 * Implements LRU eviction to prevent unbounded memory growth.
 */
function trackSearchTerm(term: string): void {
  const normalizedTerm = term.toLowerCase().trim();
  if (normalizedTerm.length < 2) return;

  const existing = searchAnalytics.get(normalizedTerm);
  if (existing) {
    // Move to end (most recently used) by deleting and re-inserting
    searchAnalytics.delete(normalizedTerm);
    existing.count++;
    existing.lastSearched = new Date();
    searchAnalytics.set(normalizedTerm, existing);
  } else {
    // Evict oldest entry if at capacity (LRU eviction)
    if (searchAnalytics.size >= MAX_SEARCH_ANALYTICS_SIZE) {
      const firstKey = searchAnalytics.keys().next().value;
      if (firstKey) {
        searchAnalytics.delete(firstKey);
      }
    }

    searchAnalytics.set(normalizedTerm, {
      term: normalizedTerm,
      count: 1,
      lastSearched: new Date(),
    });
  }
}

/**
 * Get popular terms matching a prefix (internal helper).
 */
function getMatchingPopularTerms(prefix: string, limit: number): string[] {
  const normalizedPrefix = prefix.toLowerCase().trim();
  return Array.from(searchAnalytics.values())
    .filter((entry) => entry.term.startsWith(normalizedPrefix))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.term);
}

// ============================================================================
// FACETED SEARCH
// ============================================================================

/**
 * Get available facets/filters for a search query.
 */
export const getSearchFacets = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      query: z.string().optional(),
      categoryId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(products.organizationId, ctx.organizationId),
      isNull(products.deletedAt),
    ];

    if (data.categoryId) {
      conditions.push(eq(products.categoryId, data.categoryId));
    }

    if (data.query && data.query.length > 0) {
      conditions.push(
        or(ilike(products.name, containsPattern(data.query)), ilike(products.sku, containsPattern(data.query)))!
      );
    }

    // Get status counts
    const statusCounts = await db
      .select({
        status: products.status,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(and(...conditions))
      .groupBy(products.status);

    // Get type counts
    const typeCounts = await db
      .select({
        type: products.type,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(and(...conditions))
      .groupBy(products.type);

    // Get category counts
    const categoryCounts = await db
      .select({
        categoryId: products.categoryId,
        categoryName: categories.name,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .groupBy(products.categoryId, categories.name);

    // Get price range
    const priceRange = await db
      .select({
        minPrice: sql<number>`min(${products.basePrice})`,
        maxPrice: sql<number>`max(${products.basePrice})`,
      })
      .from(products)
      .where(and(...conditions));

    // Get filterable attributes and their values
    const filterableAttrs = await db
      .select({
        id: productAttributes.id,
        name: productAttributes.name,
        type: productAttributes.attributeType,
      })
      .from(productAttributes)
      .where(
        and(
          eq(productAttributes.organizationId, ctx.organizationId),
          eq(productAttributes.isFilterable, true),
          eq(productAttributes.isActive, true)
        )
      );

    return {
      facets: {
        status: statusCounts.map((s) => ({
          value: s.status,
          count: Number(s.count),
        })),
        type: typeCounts.map((t) => ({
          value: t.type,
          count: Number(t.count),
        })),
        category: categoryCounts
          .filter((c) => c.categoryId)
          .map((c) => ({
            id: c.categoryId,
            name: c.categoryName,
            count: Number(c.count),
          })),
        priceRange: {
          min: priceRange[0]?.minPrice ?? 0,
          max: priceRange[0]?.maxPrice ?? 0,
        },
        attributes: filterableAttrs,
      },
    };
  });

// ============================================================================
// SEARCH ANALYTICS
// ============================================================================

/**
 * Record a search event for analytics.
 */
export const recordSearchEvent = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      query: z.string(),
      resultCount: z.number().int().min(0),
      clickedProductId: z.string().uuid().optional(),
      filters: z.record(z.string(), z.unknown()).optional(),
    })
  )
  .handler(async ({ data }) => {
    await withAuth();

    // Track the search term
    trackSearchTerm(data.query);

    // In production, this would write to a search_events table
    // for detailed analytics (queries, results, clicks, conversions)

    return { success: true };
  });

/**
 * Get search analytics summary.
 */
export const getSearchAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      period: z.enum(['day', 'week', 'month']).default('week'),
    })
  )
  .handler(async ({ data }) => {
    await withAuth();

    // Get all search terms
    const allTerms = Array.from(searchAnalytics.values());
    const totalSearches = allTerms.reduce((sum, t) => sum + t.count, 0);

    // Top terms
    const topTerms = allTerms
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((t) => ({
        term: t.term,
        count: t.count,
        percentage: totalSearches > 0 ? (t.count / totalSearches) * 100 : 0,
      }));

    // Zero result terms (would need tracking in production)
    const zeroResultTerms: string[] = [];

    return {
      analytics: {
        totalSearches,
        uniqueTerms: allTerms.length,
        topTerms,
        zeroResultTerms,
        period: data.period,
      },
    };
  });

// ============================================================================
// RELATED PRODUCTS
// ============================================================================

/**
 * Get related/similar products based on attributes and category.
 */
export const getRelatedProducts = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      limit: z.number().int().min(1).max(20).default(6),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get the source product
    const [sourceProduct] = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        type: products.type,
        basePrice: products.basePrice,
        tags: products.tags,
      })
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .limit(1);

    if (!sourceProduct) {
      return { relatedProducts: [] };
    }

    // Find related products based on category and price range
    const priceRange = sourceProduct.basePrice * 0.3; // 30% price variance

    const conditions = [
      eq(products.organizationId, ctx.organizationId),
      isNull(products.deletedAt),
      eq(products.status, 'active'),
      sql`${products.id} != ${data.productId}`,
    ];

    // Prioritize same category
    if (sourceProduct.categoryId) {
      conditions.push(eq(products.categoryId, sourceProduct.categoryId));
    }

    // Similar price range
    conditions.push(gte(products.basePrice, sourceProduct.basePrice - priceRange));
    conditions.push(lte(products.basePrice, sourceProduct.basePrice + priceRange));

    const relatedProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        basePrice: products.basePrice,
        type: products.type,
        categoryId: products.categoryId,
      })
      .from(products)
      .where(and(...conditions))
      .limit(data.limit);

    return { relatedProducts };
  });
