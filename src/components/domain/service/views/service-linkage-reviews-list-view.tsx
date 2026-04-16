'use client';

import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ServiceLinkageReviewReason,
  ServiceLinkageReviewStatus,
  ServiceLinkageReviewSummary,
} from '@/lib/schemas/service';
import {
  isServiceLinkageReviewReason,
  isServiceLinkageReviewStatus,
} from '@/lib/schemas/service';
import {
  SERVICE_LINKAGE_REVIEW_REASON_OPTIONS,
  SERVICE_LINKAGE_REVIEW_STATUS_OPTIONS,
} from '../service-options';

export interface ServiceLinkageReviewsListViewProps {
  reviews: ServiceLinkageReviewSummary[];
  status: ServiceLinkageReviewStatus;
  reasonCode?: ServiceLinkageReviewReason;
  onStatusChange: (status: ServiceLinkageReviewStatus) => void;
  onReasonCodeChange: (reasonCode: ServiceLinkageReviewReason | undefined) => void;
}

export function ServiceLinkageReviewsListView({
  reviews,
  status,
  reasonCode,
  onStatusChange,
  onReasonCodeChange,
}: ServiceLinkageReviewsListViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Review Queue</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Select
            value={status}
            onValueChange={(value) => {
              if (isServiceLinkageReviewStatus(value)) {
                onStatusChange(value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_LINKAGE_REVIEW_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={reasonCode ?? 'all'}
            onValueChange={(value) =>
              onReasonCodeChange(
                value === 'all'
                  ? undefined
                  : isServiceLinkageReviewReason(value)
                    ? value
                    : undefined
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              {SERVICE_LINKAGE_REVIEW_REASON_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-sm">
        {reviews.length} review{reviews.length === 1 ? '' : 's'}
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No service linkage reviews match the current filters.
          </CardContent>
        </Card>
      ) : (
        reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {review.commercialCustomer?.name ?? 'Unassigned customer'} ·{' '}
                {review.reasonCode.replaceAll('_', ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-1 text-sm">
                {review.sourceWarranty ? (
                  <div>Warranty {review.sourceWarranty.warrantyNumber}</div>
                ) : null}
                {review.snapshot.ownerName ? <div>Owner {review.snapshot.ownerName}</div> : null}
                <div className="text-muted-foreground">
                  Status {review.status.replaceAll('_', ' ')} ·{' '}
                  {review.candidateCount} candidate system{review.candidateCount === 1 ? '' : 's'}
                </div>
              </div>
              <Button asChild variant="outline">
                <Link
                  to="/support/service-linkage-reviews/$reviewId"
                  params={{ reviewId: review.id }}
                >
                  Review Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
