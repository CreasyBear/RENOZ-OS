/**
 * Knowledge Base Hooks
 *
 * TanStack Query hooks for KB articles and categories.
 *
 * @see src/server/functions/knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007a
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  createCategory,
  getCategory,
  listCategories,
  updateCategory,
  deleteCategory,
  createArticle,
  getArticle,
  listArticles,
  updateArticle,
  deleteArticle,
  recordArticleFeedback,
} from '@/server/functions/support/knowledge-base';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesInput,
  CreateArticleInput,
  UpdateArticleInput,
  ListArticlesInput,
  KbArticleStatus,
} from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// CATEGORY HOOKS
// ============================================================================

export interface UseKbCategoriesOptions {
  parentId?: string | null;
  isActive?: boolean;
  includeArticleCount?: boolean;
  enabled?: boolean;
}

export function useKbCategories({
  parentId,
  isActive,
  includeArticleCount = false,
  enabled = true,
}: UseKbCategoriesOptions = {}) {
  const filters: Partial<ListCategoriesInput> = {
    parentId,
    isActive,
    includeArticleCount,
  };

  return useQuery({
    queryKey: queryKeys.support.kbCategoryList(filters),
    queryFn: () => listCategories({ data: { ...filters, includeArticleCount } }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export interface UseKbCategoryOptions {
  categoryId: string;
  enabled?: boolean;
}

export function useKbCategory({ categoryId, enabled = true }: UseKbCategoryOptions) {
  return useQuery({
    queryKey: queryKeys.support.kbCategoryDetail(categoryId),
    queryFn: () => getCategory({ data: { categoryId } }),
    enabled: enabled && !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateKbCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) => createCategory({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.kbCategories() });
    },
  });
}

export function useUpdateKbCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCategoryInput) => updateCategory({ data }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.support.kbCategoryDetail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.support.kbCategoryList() });
    },
  });
}

export function useDeleteKbCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => deleteCategory({ data: { categoryId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.kbCategories() });
    },
  });
}

// ============================================================================
// ARTICLE HOOKS
// ============================================================================

export interface UseKbArticlesOptions {
  categoryId?: string;
  status?: KbArticleStatus;
  tags?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: ListArticlesInput['sortBy'];
  sortOrder?: ListArticlesInput['sortOrder'];
  enabled?: boolean;
}

export function useKbArticles({
  categoryId,
  status,
  tags,
  search,
  page = 1,
  pageSize = 20,
  sortBy = 'updatedAt',
  sortOrder = 'desc',
  enabled = true,
}: UseKbArticlesOptions = {}) {
  const filters: Partial<ListArticlesInput> = {
    categoryId,
    status,
    tags,
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };

  return useQuery({
    queryKey: queryKeys.support.kbArticleList(filters),
    queryFn: () =>
      listArticles({
        data: {
          ...filters,
          page: page ?? 1,
          pageSize: pageSize ?? 20,
          sortBy: sortBy ?? 'updatedAt',
          sortOrder: sortOrder ?? 'desc',
        },
      }),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

export interface UseKbArticleOptions {
  articleId: string;
  incrementViews?: boolean;
  enabled?: boolean;
}

export function useKbArticle({
  articleId,
  incrementViews = false,
  enabled = true,
}: UseKbArticleOptions) {
  return useQuery({
    queryKey: queryKeys.support.kbArticleDetail(articleId),
    queryFn: () => getArticle({ data: { articleId, incrementViews } }),
    enabled: enabled && !!articleId,
    staleTime: 60 * 1000,
  });
}

export function useCreateKbArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateArticleInput) => createArticle({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.kbArticles() });
    },
  });
}

export function useUpdateKbArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateArticleInput) => updateArticle({ data }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.support.kbArticleDetail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.support.kbArticleList() });
    },
  });
}

export function useDeleteKbArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => deleteArticle({ data: { articleId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.kbArticles() });
    },
  });
}

export function useRecordArticleFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { articleId: string; helpful: boolean }) => recordArticleFeedback({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.kbArticleDetail(variables.articleId),
      });
    },
  });
}
