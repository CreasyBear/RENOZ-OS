import type {
  ServiceLinkageReviewReason,
  ServiceLinkageReviewStatus,
  ServiceSystemOwnershipStatus,
} from '@/lib/schemas/service';

export const SERVICE_SYSTEM_OWNERSHIP_STATUS_OPTIONS: Array<{
  value: ServiceSystemOwnershipStatus;
  label: string;
}> = [
  { value: 'owned', label: 'Has current owner' },
  { value: 'unassigned', label: 'Unassigned' },
];

export const SERVICE_LINKAGE_REVIEW_STATUS_OPTIONS: Array<{
  value: ServiceLinkageReviewStatus;
  label: string;
}> = [
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export const SERVICE_LINKAGE_REVIEW_REASON_OPTIONS: Array<{
  value: ServiceLinkageReviewReason;
  label: string;
}> = [
  { value: 'multiple_system_matches', label: 'Multiple system matches' },
  { value: 'conflicting_owner_match', label: 'Conflicting owner match' },
  { value: 'backfill_manual_review', label: 'Backfill manual review' },
];
