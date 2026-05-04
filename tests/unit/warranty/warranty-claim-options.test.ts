import { describe, expect, it } from 'vitest';
import {
  warrantyClaimQuickFilterSchema,
  warrantyClaimQuickFilterValues,
  warrantyClaimStatusSchema,
} from '@/lib/schemas/warranty';
import { claimsSearchSchema } from '@/routes/_authenticated/support/claims/search-schema';
import {
  WARRANTY_CLAIM_STATUS_OPTIONS,
  WARRANTY_CLAIM_QUICK_FILTER_OPTIONS,
  WARRANTY_CLAIMANT_ROLE_LABELS,
} from '@/components/domain/warranty/warranty-claim-options';

describe('warranty claim shared options', () => {
  it('treats cancelled as a first-class claim status in the shared filter options', () => {
    expect(warrantyClaimStatusSchema.safeParse('cancelled').success).toBe(true);
    expect(WARRANTY_CLAIM_STATUS_OPTIONS.some((option) => option.value === 'cancelled')).toBe(true);
    expect(WARRANTY_CLAIM_STATUS_OPTIONS).toHaveLength(6);
  });

  it('keeps quick filter values aligned between schema, route parsing, and UI options', () => {
    const optionValues = WARRANTY_CLAIM_QUICK_FILTER_OPTIONS.map((option) => option.value);

    expect(optionValues).toEqual([...warrantyClaimQuickFilterValues]);
    expect(warrantyClaimQuickFilterSchema.safeParse('awaiting_decision').success).toBe(true);
    expect(
      claimsSearchSchema.safeParse({
        quickFilter: 'awaiting_decision',
        page: 1,
        pageSize: 20,
        sortBy: 'submittedAt',
        sortOrder: 'desc',
      }).success
    ).toBe(true);
  });

  it('uses the normalized claimant role labels in claim surfaces', () => {
    expect(WARRANTY_CLAIMANT_ROLE_LABELS.channel_partner).toBe('Channel Partner');
    expect(WARRANTY_CLAIMANT_ROLE_LABELS.owner).toBe('Owner');
  });
});
