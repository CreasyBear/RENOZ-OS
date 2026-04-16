import { describe, expect, it } from 'vitest';
import {
  serviceLinkageReviewReasonValues,
  serviceLinkageReviewStatusValues,
  serviceSystemOwnershipStatusValues,
} from '@/lib/schemas/service';
import { serviceSystemsSearchSchema } from '@/routes/_authenticated/support/service-systems/search-schema';
import { serviceLinkageReviewsSearchSchema } from '@/routes/_authenticated/support/service-linkage-reviews/search-schema';
import {
  SERVICE_LINKAGE_REVIEW_REASON_OPTIONS,
  SERVICE_LINKAGE_REVIEW_STATUS_OPTIONS,
  SERVICE_SYSTEM_OWNERSHIP_STATUS_OPTIONS,
} from '@/components/domain/service/service-options';

describe('service search schemas', () => {
  it('keeps service system ownership filters aligned between route schema and UI options', () => {
    expect(SERVICE_SYSTEM_OWNERSHIP_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      ...serviceSystemOwnershipStatusValues,
    ]);
    expect(
      serviceSystemsSearchSchema.safeParse({ ownershipStatus: 'owned', search: 'alpha' }).success
    ).toBe(true);
  });

  it('keeps linkage review status and reason filters aligned between route schema and UI options', () => {
    expect(SERVICE_LINKAGE_REVIEW_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      ...serviceLinkageReviewStatusValues,
    ]);
    expect(SERVICE_LINKAGE_REVIEW_REASON_OPTIONS.map((option) => option.value)).toEqual([
      ...serviceLinkageReviewReasonValues,
    ]);
    expect(
      serviceLinkageReviewsSearchSchema.safeParse({
        status: 'pending',
        reasonCode: 'multiple_system_matches',
      }).success
    ).toBe(true);
  });
});
