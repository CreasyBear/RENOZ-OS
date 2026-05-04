'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRightLeft, MapPin, Package, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceSystemDetail } from '@/lib/schemas/service';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { getActivitiesFeedSearch } from '@/lib/activities';

export interface ServiceSystemDetailViewProps {
  serviceSystem: ServiceSystemDetail;
  activities: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  onTransferOwnership: () => void;
  isTransferring?: boolean;
}

export function ServiceSystemDetailView({
  serviceSystem,
  activities,
  activitiesLoading,
  activitiesError,
  onTransferOwnership,
  isTransferring,
}: ServiceSystemDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{serviceSystem.displayName}</h1>
          <p className="text-muted-foreground text-sm">
            Canonical installed system record for ownership, warranty, and support context.
          </p>
        </div>
        <Button className="gap-2" onClick={onTransferOwnership} disabled={isTransferring}>
          <ArrowRightLeft className="h-4 w-4" />
          Transfer Ownership
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Linked Warranties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceSystem.linkedWarranties.map((warranty) => (
                <div key={warranty.id} className="rounded-md border p-3">
                  <Link
                    to="/support/warranties/$warrantyId"
                    params={{ warrantyId: warranty.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {warranty.warrantyNumber}
                  </Link>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {warranty.productName ?? 'Unknown product'}
                    {warranty.productSerial ? ` · ${warranty.productSerial}` : ''}
                  </div>
                  <div className="text-muted-foreground mt-1 text-sm">
                    Purchased via {warranty.customerName ?? 'Unknown customer'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Ownership Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceSystem.ownershipHistory.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <div className="font-medium">{entry.owner.fullName}</div>
                  <div className="text-muted-foreground text-sm">
                    {entry.startedAt.slice(0, 10)}
                    {entry.endedAt ? ` to ${entry.endedAt.slice(0, 10)}` : ' to current'}
                  </div>
                  {entry.transferReason ? (
                    <div className="text-muted-foreground mt-1 text-sm">{entry.transferReason}</div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <UnifiedActivityTimeline
            activities={activities}
            isLoading={activitiesLoading}
            hasError={!!activitiesError}
            error={activitiesError ?? undefined}
            title="System History"
            description="Canonical installed-system events across linkage, backfill, and ownership changes."
            showFilters={true}
            viewAllSearch={getActivitiesFeedSearch('service_system')}
            emptyMessage="No system history recorded yet"
            emptyDescription="System events will appear here as this installed-system record changes."
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Current Owner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">{serviceSystem.currentOwner?.fullName ?? 'Unassigned'}</div>
              {serviceSystem.currentOwner?.email ? (
                <div className="text-muted-foreground">{serviceSystem.currentOwner.email}</div>
              ) : null}
              {serviceSystem.currentOwner?.phone ? (
                <div className="text-muted-foreground">{serviceSystem.currentOwner.phone}</div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Install Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>{serviceSystem.siteAddress ? Object.values(serviceSystem.siteAddress).filter(Boolean).join(', ') : 'No site address captured'}</div>
              {serviceSystem.commercialCustomer ? (
                <div className="text-muted-foreground">
                  Purchased via {serviceSystem.commercialCustomer.name ?? 'Commercial customer'}
                </div>
              ) : null}
              {serviceSystem.sourceOrder ? (
                <div className="text-muted-foreground">
                  Source order {serviceSystem.sourceOrder.orderNumber ?? serviceSystem.sourceOrder.id}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
