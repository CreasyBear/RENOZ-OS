import { z } from 'zod';
import {
  DEFAULT_KB_ARTICLE_SORT_FIELD,
  KB_ARTICLE_SORT_FIELDS,
} from '@/components/domain/support/knowledge-base/kb-article-sorting';

export const knowledgeBaseSearchSchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.enum(['all', 'draft', 'published', 'archived']).default('all').optional(),
  tags: z.string().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  sortBy: z.enum(KB_ARTICLE_SORT_FIELDS).default(DEFAULT_KB_ARTICLE_SORT_FIELD).optional(),
});
