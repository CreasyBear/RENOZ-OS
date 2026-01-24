/**
 * Knowledge Base Server Functions
 *
 * Server functions for KB articles and categories CRUD operations.
 *
 * @see drizzle/schema/support/knowledge-base.ts
 * @see src/lib/schemas/support/knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007a
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql, count, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { kbArticles, kbCategories } from 'drizzle/schema/support/knowledge-base';
import { users } from 'drizzle/schema/users';
import { withAuth } from '@/lib/server/protected';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategorySchema,
  listCategoriesSchema,
  deleteCategorySchema,
  createArticleSchema,
  updateArticleSchema,
  getArticleSchema,
  listArticlesSchema,
  deleteArticleSchema,
  recordArticleFeedbackSchema,
  type KbCategoryResponse,
  type KbArticleResponse,
  type ListArticlesResponse,
} from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// HELPERS
// ============================================================================

function toCategoryResponse(row: {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  articleCount?: number;
}): KbCategoryResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    articleCount: row.articleCount,
  };
}

function toArticleResponse(row: {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  categoryId: string | null;
  tags: unknown;
  status: string;
  publishedAt: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
}): KbArticleResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    categoryId: row.categoryId,
    tags: (row.tags as string[]) ?? [],
    status: row.status as KbArticleResponse['status'],
    publishedAt: row.publishedAt,
    viewCount: row.viewCount,
    helpfulCount: row.helpfulCount,
    notHelpfulCount: row.notHelpfulCount,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    category:
      row.categoryId && row.categoryName
        ? {
            id: row.categoryId,
            name: row.categoryName,
            slug: row.categorySlug ?? '',
          }
        : null,
    author:
      row.createdBy && row.authorEmail
        ? {
            id: row.createdBy,
            name: row.authorName ?? null,
            email: row.authorEmail,
          }
        : null,
  };
}

// ============================================================================
// CATEGORY CRUD
// ============================================================================

export const createCategory = createServerFn({ method: 'POST' })
  .inputValidator(createCategorySchema)
  .handler(async ({ data }): Promise<KbCategoryResponse> => {
    const ctx = await withAuth();

    const [category] = await db
      .insert(kbCategories)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return toCategoryResponse(category);
  });

export const getCategory = createServerFn({ method: 'GET' })
  .inputValidator(getCategorySchema)
  .handler(async ({ data }): Promise<KbCategoryResponse> => {
    const ctx = await withAuth();

    const [category] = await db
      .select()
      .from(kbCategories)
      .where(
        and(
          eq(kbCategories.id, data.categoryId),
          eq(kbCategories.organizationId, ctx.organizationId),
          isNull(kbCategories.deletedAt)
        )
      )
      .limit(1);

    if (!category) {
      throw new Error('Category not found');
    }

    return toCategoryResponse(category);
  });

export const listCategories = createServerFn({ method: 'GET' })
  .inputValidator(listCategoriesSchema)
  .handler(async ({ data }): Promise<KbCategoryResponse[]> => {
    const ctx = await withAuth();

    const conditions = [
      eq(kbCategories.organizationId, ctx.organizationId),
      isNull(kbCategories.deletedAt),
    ];

    if (data.parentId !== undefined) {
      if (data.parentId === null) {
        conditions.push(isNull(kbCategories.parentId));
      } else {
        conditions.push(eq(kbCategories.parentId, data.parentId));
      }
    }

    if (data.isActive !== undefined) {
      conditions.push(eq(kbCategories.isActive, data.isActive));
    }

    const categories = await db
      .select()
      .from(kbCategories)
      .where(and(...conditions))
      .orderBy(asc(kbCategories.sortOrder), asc(kbCategories.name));

    return categories.map(toCategoryResponse);
  });

export const updateCategory = createServerFn({ method: 'POST' })
  .inputValidator(updateCategorySchema)
  .handler(async ({ data }): Promise<KbCategoryResponse> => {
    const ctx = await withAuth();

    // Verify exists
    const [existing] = await db
      .select({ id: kbCategories.id })
      .from(kbCategories)
      .where(
        and(
          eq(kbCategories.id, data.categoryId),
          eq(kbCategories.organizationId, ctx.organizationId),
          isNull(kbCategories.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Category not found');
    }

    const [updated] = await db
      .update(kbCategories)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(kbCategories.id, data.categoryId))
      .returning();

    return toCategoryResponse(updated);
  });

export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(deleteCategorySchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    await db
      .update(kbCategories)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(kbCategories.id, data.categoryId),
          eq(kbCategories.organizationId, ctx.organizationId)
        )
      );

    return { success: true };
  });

// ============================================================================
// ARTICLE CRUD
// ============================================================================

export const createArticle = createServerFn({ method: 'POST' })
  .inputValidator(createArticleSchema)
  .handler(async ({ data }): Promise<KbArticleResponse> => {
    const ctx = await withAuth();

    const [article] = await db
      .insert(kbArticles)
      .values({
        organizationId: ctx.organizationId,
        title: data.title,
        slug: data.slug,
        summary: data.summary ?? null,
        content: data.content,
        categoryId: data.categoryId ?? null,
        tags: data.tags ?? [],
        status: data.status ?? 'draft',
        publishedAt: data.status === 'published' ? new Date().toISOString() : null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Get author info
    const [author] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return toArticleResponse({
      ...article,
      authorName: author?.name ?? null,
      authorEmail: author?.email ?? null,
    });
  });

export const getArticle = createServerFn({ method: 'GET' })
  .inputValidator(getArticleSchema)
  .handler(async ({ data }): Promise<KbArticleResponse> => {
    const ctx = await withAuth();

    const [result] = await db
      .select({
        id: kbArticles.id,
        organizationId: kbArticles.organizationId,
        title: kbArticles.title,
        slug: kbArticles.slug,
        summary: kbArticles.summary,
        content: kbArticles.content,
        categoryId: kbArticles.categoryId,
        tags: kbArticles.tags,
        status: kbArticles.status,
        publishedAt: kbArticles.publishedAt,
        viewCount: kbArticles.viewCount,
        helpfulCount: kbArticles.helpfulCount,
        notHelpfulCount: kbArticles.notHelpfulCount,
        metaTitle: kbArticles.metaTitle,
        metaDescription: kbArticles.metaDescription,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
        createdBy: kbArticles.createdBy,
        updatedBy: kbArticles.updatedBy,
        categoryName: kbCategories.name,
        categorySlug: kbCategories.slug,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .leftJoin(users, eq(kbArticles.createdBy, users.id))
      .where(
        and(
          eq(kbArticles.id, data.articleId),
          eq(kbArticles.organizationId, ctx.organizationId),
          isNull(kbArticles.deletedAt)
        )
      )
      .limit(1);

    if (!result) {
      throw new Error('Article not found');
    }

    // Increment views if requested
    if (data.incrementViews) {
      await db
        .update(kbArticles)
        .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
        .where(eq(kbArticles.id, data.articleId));
    }

    return toArticleResponse(result);
  });

export const listArticles = createServerFn({ method: 'GET' })
  .inputValidator(listArticlesSchema)
  .handler(async ({ data }): Promise<ListArticlesResponse> => {
    const ctx = await withAuth();

    // Build conditions
    const conditions = [
      eq(kbArticles.organizationId, ctx.organizationId),
      isNull(kbArticles.deletedAt),
    ];

    if (data.categoryId) {
      conditions.push(eq(kbArticles.categoryId, data.categoryId));
    }
    if (data.status) {
      conditions.push(eq(kbArticles.status, data.status));
    }
    if (data.search) {
      conditions.push(
        sql`(${kbArticles.title} ILIKE ${`%${data.search}%`} OR ${kbArticles.content} ILIKE ${`%${data.search}%`})`
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(kbArticles)
      .where(and(...conditions));

    const totalCount = countResult?.total ?? 0;

    // Pagination
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Sorting
    const sortBy = data.sortBy ?? 'updatedAt';
    const sortOrder = data.sortOrder ?? 'desc';
    const orderColumn =
      sortBy === 'title'
        ? kbArticles.title
        : sortBy === 'viewCount'
          ? kbArticles.viewCount
          : sortBy === 'publishedAt'
            ? kbArticles.publishedAt
            : sortBy === 'createdAt'
              ? kbArticles.createdAt
              : kbArticles.updatedAt;
    const order = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    // Fetch
    const results = await db
      .select({
        id: kbArticles.id,
        organizationId: kbArticles.organizationId,
        title: kbArticles.title,
        slug: kbArticles.slug,
        summary: kbArticles.summary,
        content: kbArticles.content,
        categoryId: kbArticles.categoryId,
        tags: kbArticles.tags,
        status: kbArticles.status,
        publishedAt: kbArticles.publishedAt,
        viewCount: kbArticles.viewCount,
        helpfulCount: kbArticles.helpfulCount,
        notHelpfulCount: kbArticles.notHelpfulCount,
        metaTitle: kbArticles.metaTitle,
        metaDescription: kbArticles.metaDescription,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
        createdBy: kbArticles.createdBy,
        updatedBy: kbArticles.updatedBy,
        categoryName: kbCategories.name,
        categorySlug: kbCategories.slug,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .leftJoin(users, eq(kbArticles.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(order)
      .limit(pageSize)
      .offset(offset);

    return {
      data: results.map(toArticleResponse),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });

export const updateArticle = createServerFn({ method: 'POST' })
  .inputValidator(updateArticleSchema)
  .handler(async ({ data }): Promise<KbArticleResponse> => {
    const ctx = await withAuth();

    // Verify exists
    const [existing] = await db
      .select({ id: kbArticles.id, status: kbArticles.status })
      .from(kbArticles)
      .where(
        and(
          eq(kbArticles.id, data.articleId),
          eq(kbArticles.organizationId, ctx.organizationId),
          isNull(kbArticles.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Article not found');
    }

    // Handle publishedAt
    let publishedAt: string | null | undefined = undefined;
    if (data.status === 'published' && existing.status !== 'published') {
      publishedAt = new Date().toISOString();
    } else if (data.status && data.status !== 'published') {
      publishedAt = null;
    }

    const [updated] = await db
      .update(kbArticles)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.status !== undefined && { status: data.status }),
        ...(publishedAt !== undefined && { publishedAt }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(kbArticles.id, data.articleId))
      .returning();

    // Get category and author info
    let categoryName: string | null = null;
    let categorySlug: string | null = null;
    if (updated.categoryId) {
      const [category] = await db
        .select({ name: kbCategories.name, slug: kbCategories.slug })
        .from(kbCategories)
        .where(eq(kbCategories.id, updated.categoryId))
        .limit(1);
      categoryName = category?.name ?? null;
      categorySlug = category?.slug ?? null;
    }

    const [author] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return toArticleResponse({
      ...updated,
      categoryName,
      categorySlug,
      authorName: author?.name ?? null,
      authorEmail: author?.email ?? null,
    });
  });

export const deleteArticle = createServerFn({ method: 'POST' })
  .inputValidator(deleteArticleSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    await db
      .update(kbArticles)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(kbArticles.id, data.articleId), eq(kbArticles.organizationId, ctx.organizationId))
      );

    return { success: true };
  });

export const recordArticleFeedback = createServerFn({ method: 'POST' })
  .inputValidator(recordArticleFeedbackSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Verify article exists
    const [article] = await db
      .select({ id: kbArticles.id })
      .from(kbArticles)
      .where(
        and(
          eq(kbArticles.id, data.articleId),
          eq(kbArticles.organizationId, ctx.organizationId),
          isNull(kbArticles.deletedAt)
        )
      )
      .limit(1);

    if (!article) {
      throw new Error('Article not found');
    }

    // Update feedback count
    if (data.helpful) {
      await db
        .update(kbArticles)
        .set({ helpfulCount: sql`${kbArticles.helpfulCount} + 1` })
        .where(eq(kbArticles.id, data.articleId));
    } else {
      await db
        .update(kbArticles)
        .set({ notHelpfulCount: sql`${kbArticles.notHelpfulCount} + 1` })
        .where(eq(kbArticles.id, data.articleId));
    }

    return { success: true };
  });
