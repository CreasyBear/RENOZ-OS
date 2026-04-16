import { z } from 'zod';
import { normalizeObjectInput } from '../_shared/patterns';
import {
  serviceOwnerInputSchema,
  serviceOwnerSchema,
} from './service-owners';

export const serviceLinkageReviewStatusValues = ['pending', 'resolved', 'dismissed'] as const;
export const serviceLinkageReviewStatusSchema = z.enum(serviceLinkageReviewStatusValues);
export type ServiceLinkageReviewStatus = z.infer<typeof serviceLinkageReviewStatusSchema>;

export const serviceLinkageReviewReasonValues = [
  'multiple_system_matches',
  'conflicting_owner_match',
  'backfill_manual_review',
 ] as const;
export const serviceLinkageReviewReasonSchema = z.enum(serviceLinkageReviewReasonValues);
export type ServiceLinkageReviewReason = z.infer<typeof serviceLinkageReviewReasonSchema>;

export function isServiceLinkageReviewStatus(
  value: unknown
): value is ServiceLinkageReviewStatus {
  return serviceLinkageReviewStatusSchema.safeParse(value).success;
}

export function isServiceLinkageReviewReason(
  value: unknown
): value is ServiceLinkageReviewReason {
  return serviceLinkageReviewReasonSchema.safeParse(value).success;
}

export const serviceLinkageReviewSnapshotSchema = z.object({
  ownerName: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerPhone: z.string().optional(),
  normalizedSiteAddressKey: z.string().nullable().optional(),
  siteAddress: z
    .object({
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
    })
    .nullable()
    .optional(),
  notes: z.string().optional(),
});
export type ServiceLinkageReviewSnapshot = z.infer<typeof serviceLinkageReviewSnapshotSchema>;

export const serviceLinkageReviewCandidateSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  commercialCustomer: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
    })
    .nullable(),
  currentOwner: serviceOwnerSchema.nullable(),
  siteAddressLabel: z.string().nullable(),
});

export type ServiceLinkageReviewCandidate = z.infer<typeof serviceLinkageReviewCandidateSchema>;

export const serviceLinkageReviewSummarySchema = z.object({
  id: z.string().uuid(),
  status: serviceLinkageReviewStatusSchema,
  reasonCode: serviceLinkageReviewReasonSchema,
  commercialCustomer: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
    })
    .nullable(),
  sourceWarranty: z
    .object({
      id: z.string().uuid(),
      warrantyNumber: z.string(),
    })
    .nullable(),
  sourceEntitlement: z
    .object({
      id: z.string().uuid(),
      orderNumber: z.string().nullable(),
      shipmentNumber: z.string().nullable(),
    })
    .nullable(),
  snapshot: serviceLinkageReviewSnapshotSchema,
  candidateCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type ServiceLinkageReviewSummary = z.infer<typeof serviceLinkageReviewSummarySchema>;

export const serviceLinkageReviewDetailSchema = serviceLinkageReviewSummarySchema.extend({
  sourceOrder: z
    .object({
      id: z.string().uuid(),
      orderNumber: z.string().nullable(),
    })
    .nullable(),
  project: z
    .object({
      id: z.string().uuid(),
      title: z.string().nullable(),
    })
    .nullable(),
  candidates: z.array(serviceLinkageReviewCandidateSchema),
});

export type ServiceLinkageReviewDetail = z.infer<typeof serviceLinkageReviewDetailSchema>;

export const listServiceLinkageReviewsSchema = normalizeObjectInput(
  z.object({
    status: serviceLinkageReviewStatusSchema.optional(),
    reasonCode: serviceLinkageReviewReasonSchema.optional(),
  })
);

export type ListServiceLinkageReviewsInput = z.infer<typeof listServiceLinkageReviewsSchema>;

export const getServiceLinkageReviewSchema = normalizeObjectInput(
  z.object({
    id: z.string().uuid(),
  })
);

export type GetServiceLinkageReviewInput = z.input<typeof getServiceLinkageReviewSchema>;

export const resolveServiceLinkageReviewSchema = z.object({
  reviewId: z.string().uuid(),
  resolutionType: z.enum(['link_existing', 'create_new']),
  serviceSystemId: z.string().uuid().optional(),
  owner: serviceOwnerInputSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export type ResolveServiceLinkageReviewInput = z.infer<
  typeof resolveServiceLinkageReviewSchema
>;
