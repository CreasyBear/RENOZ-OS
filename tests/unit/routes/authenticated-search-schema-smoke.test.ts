import { describe, expect, it, vi } from 'vitest';

vi.mock('@/trigger/jobs', () => new Proxy({}, {
  get: () => ({ trigger: vi.fn() }),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({})),
}));
import {
  searchParamsSchema as customerSearchParamsSchema,
} from '@/routes/_authenticated/customers/index';
import {
  searchSchema as warrantiesSearchSchema,
} from '@/routes/_authenticated/support/warranties/index';
import {
  claimsSearchSchema,
} from '@/routes/_authenticated/support/claims/search-schema';
import {
  rmasSearchSchema,
} from '@/routes/_authenticated/support/rmas/index';
import {
  knowledgeBaseSearchSchema,
} from '@/routes/_authenticated/support/knowledge-base-search-schema';
import {
  searchParamsSchema as productSearchParamsSchema,
} from '@/routes/_authenticated/products/index';
import {
  DEFAULT_WARRANTY_SORT_DIRECTION,
  DEFAULT_WARRANTY_SORT_FIELD,
} from '@/components/domain/warranty/warranty-sorting';
import {
  DEFAULT_WARRANTY_CLAIM_SORT_FIELD,
} from '@/components/domain/warranty/warranty-claim-sorting';
import {
  DEFAULT_RMA_SORT_FIELD,
} from '@/components/domain/support/rma/rma-sorting';
import {
  DEFAULT_KB_ARTICLE_SORT_FIELD,
} from '@/components/domain/support/knowledge-base/kb-article-sorting';

describe('authenticated search schema smoke', () => {
  it('rejects unsupported customer sort fields', () => {
    expect(() =>
      customerSearchParamsSchema.parse({
        sortBy: 'notReal',
      })
    ).toThrow();
  });

  it('falls back to the default warranty sort when the URL is invalid', () => {
    const parsed = warrantiesSearchSchema.parse({
      sortBy: 'broken',
      sortOrder: 'invalid',
    });

    expect(parsed.sortBy).toBe(DEFAULT_WARRANTY_SORT_FIELD);
    expect(parsed.sortOrder).toBe(DEFAULT_WARRANTY_SORT_DIRECTION);
  });

  it('defaults the claims list to the manifest-backed sort contract', () => {
    const parsed = claimsSearchSchema.parse({});

    expect(parsed.sortBy).toBe(DEFAULT_WARRANTY_CLAIM_SORT_FIELD);
    expect(parsed.sortOrder).toBe('desc');
  });

  it('defaults the RMA list to the manifest-backed sort contract', () => {
    const parsed = rmasSearchSchema.parse({});

    expect(parsed.sortBy).toBe(DEFAULT_RMA_SORT_FIELD);
    expect(parsed.sortOrder).toBe('desc');
  });

  it('defaults knowledge base sorting to the manifest-backed field', () => {
    const parsed = knowledgeBaseSearchSchema.parse({});

    expect(parsed.sortBy).toBe(DEFAULT_KB_ARTICLE_SORT_FIELD);
    expect(parsed.page).toBe(1);
  });

  it('rejects unsupported product sort fields from the URL', () => {
    expect(() =>
      productSearchParamsSchema.parse({
        sortBy: 'type',
      })
    ).toThrow();
  });
});
