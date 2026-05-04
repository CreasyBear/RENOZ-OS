import type { WarrantyDetail, WarrantyPendingServiceReview } from '@/lib/schemas/warranty';

export function getServiceLinkagePresentation(
  status: WarrantyDetail['serviceLinkageStatus']
): {
  label: string;
  description: string;
  badgeClassName: string;
} {
  switch (status) {
    case 'linked':
      return {
        label: 'Linked',
        description: 'This warranty is linked to a live service-system record.',
        badgeClassName:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
      };
    case 'pending_review':
      return {
        label: 'Pending Review',
        description: 'A linkage review is blocking automatic system assignment.',
        badgeClassName:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
      };
    case 'unlinked':
      return {
        label: 'Unlinked',
        description: 'This warranty is not linked to a service-system record yet.',
        badgeClassName:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
      };
    case 'owner_missing':
      return {
        label: 'Owner Missing',
        description: 'A service system exists, but there is no current owner assigned yet.',
        badgeClassName:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
      };
  }
}

export function formatServiceReviewReason(
  reasonCode: WarrantyPendingServiceReview['reasonCode']
): string {
  return reasonCode.replaceAll('_', ' ');
}
