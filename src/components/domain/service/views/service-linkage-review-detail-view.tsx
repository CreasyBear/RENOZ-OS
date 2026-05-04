'use client';

import { Link } from '@tanstack/react-router';
import { AlertTriangle, Link2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceLinkageReviewDetail } from '@/lib/schemas/service';

export interface ServiceLinkageReviewDetailViewProps {
  review: ServiceLinkageReviewDetail;
  onLinkExisting: (serviceSystemId: string) => void;
  onCreateNew: () => void;
  isSubmitting?: boolean;
}

export function ServiceLinkageReviewDetailView({
  review,
  onLinkExisting,
  onCreateNew,
  isSubmitting,
}: ServiceLinkageReviewDetailViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Service Linkage Review</h1>
        <p className="text-muted-foreground text-sm">
          Resolve ambiguous owner/system linkage without guessing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Review Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Reason: {review.reasonCode.replaceAll('_', ' ')}</div>
          {review.sourceWarranty ? (
            <div>
              Warranty:{' '}
              <Link
                to="/support/warranties/$warrantyId"
                params={{ warrantyId: review.sourceWarranty.id }}
                className="text-primary hover:underline"
              >
                {review.sourceWarranty.warrantyNumber}
              </Link>
            </div>
          ) : null}
          {review.commercialCustomer ? (
            <div>Purchased via {review.commercialCustomer.name ?? 'Commercial customer'}</div>
          ) : null}
          {review.snapshot.ownerName ? <div>Requested owner: {review.snapshot.ownerName}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Candidate Systems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {review.candidates.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reusable candidate systems were captured for this review.</p>
          ) : (
            review.candidates.map((candidate) => (
              <div key={candidate.id} className="rounded-md border p-3">
                <div className="font-medium">{candidate.displayName}</div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {candidate.currentOwner ? `Current owner: ${candidate.currentOwner.fullName}` : 'No current owner'}
                </div>
                {candidate.siteAddressLabel ? (
                  <div className="text-muted-foreground text-sm">{candidate.siteAddressLabel}</div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/support/service-systems/$serviceSystemId"
                    params={{ serviceSystemId: candidate.id }}
                    className="text-primary text-sm hover:underline"
                  >
                    View system
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => onLinkExisting(candidate.id)}
                    disabled={isSubmitting}
                  >
                    <Link2 className="h-4 w-4" />
                    Link This System
                  </Button>
                </div>
              </div>
            ))
          )}
          <Button className="gap-2" onClick={onCreateNew} disabled={isSubmitting}>
            <PlusCircle className="h-4 w-4" />
            Create New System
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
