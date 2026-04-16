'use client'

import { Link } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2, Clock3, Package, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  WarrantyEntitlementListItem,
  WarrantyEntitlementStatus,
} from '@/lib/schemas/warranty/entitlements';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadgeVariant(status: WarrantyEntitlementStatus) {
  if (status === 'activated') return 'default';
  if (status === 'needs_review') return 'destructive';
  if (status === 'voided') return 'secondary';
  return 'outline';
}

function statusLabel(status: WarrantyEntitlementStatus) {
  if (status === 'pending_activation') return 'Pending Activation';
  if (status === 'needs_review') return 'Needs Review';
  if (status === 'activated') return 'Activated';
  return 'Voided';
}

function issueLabel(issueCode: WarrantyEntitlementListItem['provisioningIssueCode']) {
  if (issueCode === 'missing_serial_capture') return 'Missing serial capture';
  if (issueCode === 'policy_unresolved') return 'Warranty policy unresolved';
  return null;
}

export interface WarrantyEntitlementsListViewProps {
  entitlements: WarrantyEntitlementListItem[];
  total: number;
  search: string;
  status: WarrantyEntitlementStatus | 'all';
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: WarrantyEntitlementStatus | 'all') => void;
  onActivate: (entitlement: WarrantyEntitlementListItem) => void;
  onReview: (entitlementId: string) => void;
}

export function WarrantyEntitlementsListView({
  entitlements,
  total,
  search,
  status,
  isLoading,
  onSearchChange,
  onStatusChange,
  onActivate,
  onReview,
}: WarrantyEntitlementsListViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Entitlement Queue</CardTitle>
          <CardDescription>
            Delivered items that are covered commercially and can become owned warranties.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search order, shipment, customer, product, or serial"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(value) => onStatusChange(value as WarrantyEntitlementStatus | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending_activation">Pending activation</SelectItem>
              <SelectItem value="needs_review">Needs review</SelectItem>
              <SelectItem value="activated">Activated</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-sm">{total} entitlement{total === 1 ? '' : 's'}</div>

      <div className="space-y-3">
        {entitlements.map((entitlement) => {
          const issue = issueLabel(entitlement.provisioningIssueCode);
          const canActivate =
            entitlement.activatedWarrantyId == null && entitlement.warrantyPolicyId != null;

          return (
            <Card key={entitlement.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusBadgeVariant(entitlement.status)}>
                        {statusLabel(entitlement.status)}
                      </Badge>
                      <Badge variant="outline">
                        {entitlement.evidenceType === 'serialized' ? 'Serialized' : 'Unitized'}
                      </Badge>
                      {issue ? (
                        <Badge variant="destructive">{issue}</Badge>
                      ) : null}
                    </div>

                    <div className="text-base font-semibold">
                      {entitlement.productName ?? 'Unknown product'}
                    </div>

                    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                      <span>Purchased via {entitlement.customerName ?? 'Unknown customer'}</span>
                      <span>Order {entitlement.orderNumber ?? 'Unknown'}</span>
                      <span>Shipment {entitlement.shipmentNumber ?? 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReview(entitlement.id)}
                    >
                      Review Details
                    </Button>
                    {entitlement.activatedWarrantyId ? (
                      <Link
                        to="/support/warranties/$warrantyId"
                        params={{ warrantyId: entitlement.activatedWarrantyId }}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                      >
                        View Warranty
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onActivate(entitlement)}
                        disabled={!canActivate}
                      >
                        Activate Warranty
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs uppercase">
                      <Package className="size-3.5" />
                      Coverage Unit
                    </div>
                    <div className="font-medium">
                      {entitlement.productSerial
                        ? entitlement.productSerial
                        : `Unit ${entitlement.unitSequence ?? 'N/A'}`}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs uppercase">
                      <Clock3 className="size-3.5" />
                      Delivered
                    </div>
                    <div className="font-medium">
                      {formatDate(entitlement.deliveredAt)}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground mb-1 text-xs uppercase">Policy</div>
                    <div className="font-medium">{entitlement.policyName ?? 'Needs resolution'}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground mb-1 text-xs uppercase">
                      Activated Warranty
                    </div>
                    <div className="font-medium">
                      {entitlement.activatedWarrantyNumber ?? 'Not activated yet'}
                    </div>
                  </div>
                </div>

                {entitlement.status === 'needs_review' ? (
                  <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
                    <div className="text-muted-foreground">
                      {entitlement.provisioningIssueCode === 'policy_unresolved'
                        ? 'This entitlement exists so coverage is visible, but it cannot be activated until a warranty policy is resolved. Open review details to inspect the source shipment and coverage context.'
                        : 'Coverage has been preserved, but serial capture is incomplete. Open review details to inspect the delivered source and activate when owner details are confirmed.'}
                    </div>
                  </div>
                ) : null}

                {entitlement.activatedWarrantyId ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    Activated as {entitlement.activatedWarrantyNumber}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        {!isLoading && entitlements.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground p-8 text-center text-sm">
              No entitlement records match the current filters.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
