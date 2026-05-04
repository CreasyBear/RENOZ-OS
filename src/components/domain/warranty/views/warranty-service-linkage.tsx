'use client';

import { Link } from '@tanstack/react-router';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateAustralian } from '@/lib/warranty';
import {
  formatServiceReviewReason,
  getServiceLinkagePresentation,
} from '@/components/domain/warranty/views/warranty-service-linkage-utils';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

type WarrantyServiceLinkageContext = Pick<
  WarrantyDetail,
  | 'serviceLinkageStatus'
  | 'serviceSystem'
  | 'currentOwner'
  | 'ownerRecord'
  | 'pendingServiceReview'
  | 'systemHistoryPreview'
>;

function formatServiceDate(dateString: string): string {
  return formatDateAustralian(dateString, 'numeric');
}

interface WarrantyServiceSystemCardProps {
  warranty: WarrantyServiceLinkageContext;
  onOpenTransferOwnership?: () => void;
  isTransferringOwnership?: boolean;
}

export function WarrantyServiceSystemCard({
  warranty,
  onOpenTransferOwnership,
  isTransferringOwnership = false,
}: WarrantyServiceSystemCardProps) {
  const serviceLinkage = getServiceLinkagePresentation(warranty.serviceLinkageStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Service System</CardTitle>
        <CardDescription>
          Canonical installed-system record used for ownership and support context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('rounded-full', serviceLinkage.badgeClassName)}>
            {serviceLinkage.label}
          </Badge>
        </div>
        <div className="text-muted-foreground">{serviceLinkage.description}</div>
        {warranty.serviceSystem ? (
          <>
            <div className="space-y-1">
              <Link
                to="/support/service-systems/$serviceSystemId"
                params={{ serviceSystemId: warranty.serviceSystem.id }}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {warranty.serviceSystem.displayName}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              {warranty.serviceSystem.siteAddressLabel ? (
                <div className="text-muted-foreground">
                  {warranty.serviceSystem.siteAddressLabel}
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Current owner</div>
              <div className="font-medium">
                {warranty.currentOwner?.fullName ??
                  warranty.ownerRecord?.fullName ??
                  'Not assigned'}
              </div>
              {warranty.currentOwner?.email ? (
                <div className="text-muted-foreground">{warranty.currentOwner.email}</div>
              ) : null}
            </div>
            {warranty.systemHistoryPreview.length > 0 ? (
              <div className="rounded-md border border-dashed p-3">
                <div className="text-muted-foreground mb-2 text-xs uppercase">
                  Recent system history
                </div>
                <div className="space-y-2">
                  {warranty.systemHistoryPreview.slice(0, 2).map((entry) => (
                    <div key={entry.id}>
                      <div className="font-medium">
                        {entry.description ?? entry.action.replaceAll('_', ' ')}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatServiceDate(entry.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {onOpenTransferOwnership ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={onOpenTransferOwnership}
                disabled={isTransferringOwnership}
              >
                {isTransferringOwnership ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  'Transfer Ownership'
                )}
              </Button>
            ) : null}
            <Link
              to="/support/service-systems/$serviceSystemId"
              params={{ serviceSystemId: warranty.serviceSystem.id }}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full justify-center')}
            >
              Open System Detail
            </Link>
          </>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="font-medium">No service system linked yet</div>
              <div className="text-muted-foreground">
                Resolve the linkage review queue or complete the external migration workflow before relying on system ownership here.
              </div>
            </div>
            {warranty.pendingServiceReview ? (
              <Link
                to="/support/service-linkage-reviews/$reviewId"
                params={{ reviewId: warranty.pendingServiceReview.id }}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full justify-center')}
              >
                Open Pending Review
              </Link>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WarrantyServiceMissionControlProps {
  warranty: WarrantyServiceLinkageContext;
}

export function WarrantyServiceMissionControl({
  warranty,
}: WarrantyServiceMissionControlProps) {
  const serviceLinkage = getServiceLinkagePresentation(warranty.serviceLinkageStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Mission Control</CardTitle>
        <CardDescription>
          See commercial lineage, current ownership, service linkage health, and what
          to do next without leaving the warranty workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground mb-1 text-xs uppercase">
              Linkage Status
            </div>
            <Badge variant="outline" className={cn('rounded-full', serviceLinkage.badgeClassName)}>
              {serviceLinkage.label}
            </Badge>
            <div className="text-muted-foreground mt-2 text-sm">
              {serviceLinkage.description}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground mb-1 text-xs uppercase">
              Current Owner
            </div>
            <div className="font-medium">
              {warranty.currentOwner?.fullName ?? 'No current owner assigned'}
            </div>
            <div className="text-muted-foreground mt-2 text-sm">
              {warranty.currentOwner?.email ??
                warranty.currentOwner?.phone ??
                'Use transfer or review flows to update ownership.'}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground mb-1 text-xs uppercase">
              Service System
            </div>
            {warranty.serviceSystem ? (
              <>
                <Link
                  to="/support/service-systems/$serviceSystemId"
                  params={{ serviceSystemId: warranty.serviceSystem.id }}
                  className="font-medium text-primary hover:underline"
                >
                  {warranty.serviceSystem.displayName}
                </Link>
                <div className="text-muted-foreground mt-2 text-sm">
                  {warranty.serviceSystem.siteAddressLabel ?? 'No site address captured'}
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">No system linked</div>
                <div className="text-muted-foreground mt-2 text-sm">
                  This warranty is still outside the canonical installed-system graph.
                </div>
              </>
            )}
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground mb-1 text-xs uppercase">
              Next Step
            </div>
            {warranty.pendingServiceReview ? (
              <>
                <div className="font-medium">
                  Review {formatServiceReviewReason(warranty.pendingServiceReview.reasonCode)}
                </div>
                <Link
                  to="/support/service-linkage-reviews/$reviewId"
                  params={{ reviewId: warranty.pendingServiceReview.id }}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2 h-auto px-0')}
                >
                  Open linkage review
                </Link>
              </>
            ) : warranty.serviceSystem ? (
              <>
                <div className="font-medium">Inspect system history</div>
                <Link
                  to="/support/service-systems/$serviceSystemId"
                  params={{ serviceSystemId: warranty.serviceSystem.id }}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2 h-auto px-0')}
                >
                  Open system detail
                </Link>
              </>
            ) : (
              <>
                <div className="font-medium">Finish service linkage</div>
                <div className="text-muted-foreground mt-2 text-sm">
                  Use the linkage review queue or your external migration process to attach this warranty to a service system.
                </div>
              </>
            )}
          </div>
        </div>

        {warranty.systemHistoryPreview.length > 0 ? (
          <div className="grid gap-3">
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground mb-2 text-xs uppercase">
                System History Preview
              </div>
              <div className="space-y-2">
                {warranty.systemHistoryPreview.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>{entry.description ?? entry.action.replaceAll('_', ' ')}</div>
                    <div className="text-muted-foreground whitespace-nowrap">
                      {formatServiceDate(entry.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
