'use client'

import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useWarrantyEntitlement } from '@/hooks/warranty';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function issueLabel(issueCode: string | null | undefined) {
  if (issueCode === 'missing_serial_capture') return 'Missing serial capture';
  if (issueCode === 'policy_unresolved') return 'Warranty policy unresolved';
  return null;
}

function statusLabel(status: string) {
  if (status === 'pending_activation') return 'Pending Activation';
  if (status === 'needs_review') return 'Needs Review';
  if (status === 'activated') return 'Activated';
  return 'Voided';
}

export interface WarrantyEntitlementReviewDialogProps {
  entitlementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate: (entitlementId: string) => void;
}

export function WarrantyEntitlementReviewDialog({
  entitlementId,
  open,
  onOpenChange,
  onActivate,
}: WarrantyEntitlementReviewDialogProps) {
  const { data, isLoading, error } = useWarrantyEntitlement(entitlementId ?? '', open && !!entitlementId);

  const issue = issueLabel(data?.provisioningIssueCode);
  const canActivate =
    data?.activatedWarrantyId == null && data?.warrantyPolicyId != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Review Entitlement
          </DialogTitle>
          <DialogDescription>
            Inspect the delivery-backed coverage record before activating or escalating it.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Entitlement details are temporarily unavailable.'}
            </AlertDescription>
          </Alert>
        ) : data ? (
          <div className="space-y-4">
            <Card className="bg-muted/40">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={data.status === 'needs_review' ? 'destructive' : 'outline'}>
                      {statusLabel(data.status)}
                    </Badge>
                    <Badge variant="outline">
                      {data.evidenceType === 'serialized' ? 'Serialized' : 'Unitized'}
                    </Badge>
                    {issue ? <Badge variant="destructive">{issue}</Badge> : null}
                  </div>
                  <div className="text-lg font-semibold">
                    {data.productName ?? 'Unknown product'}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Delivered {formatDate(data.deliveredAt)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {data.activatedWarrantyId ? (
                    <Link
                      to="/support/warranties/$warrantyId"
                      params={{ warrantyId: data.activatedWarrantyId }}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      View Warranty
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onActivate(data.id)}
                      disabled={!canActivate}
                    >
                      Activate Warranty
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {data.status === 'needs_review' ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {data.provisioningIssueCode === 'policy_unresolved'
                    ? 'Coverage has been preserved, but the entitlement cannot be activated until the product resolves to a warranty policy.'
                    : 'Coverage has been preserved, but serial capture is incomplete. Review the shipment evidence and owner details before activating.'}
                </AlertDescription>
              </Alert>
            ) : null}

            {data.activatedWarrantyId ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  This entitlement has already been activated as {data.activatedWarrantyNumber}.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Commercial Source</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {data.commercialCustomer.name ?? 'Unknown commercial customer'}
                      </div>
                      <div className="text-muted-foreground">Purchased Via</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{data.orderNumber ?? 'Unknown order'}</div>
                      <div className="text-muted-foreground">Source Order</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{data.shipmentNumber ?? 'Unknown shipment'}</div>
                      <div className="text-muted-foreground">Delivered Shipment</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Coverage Unit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs uppercase">Policy</div>
                    <div className="font-medium">{data.policyName ?? 'Needs resolution'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase">Serial / Unit</div>
                    <div className="font-medium font-mono">
                      {data.productSerial ?? `Unit ${data.unitSequence ?? 'N/A'}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase">Evidence Type</div>
                    <div className="font-medium">
                      {data.evidenceType === 'serialized'
                        ? 'Serialized evidence captured'
                        : 'Unitized delivered quantity'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Owner Activation Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.ownerRecord ? (
                  <>
                    <div className="font-medium">{data.ownerRecord.fullName}</div>
                    {(data.ownerRecord.email || data.ownerRecord.phone) && (
                      <div className="text-muted-foreground">
                        {[data.ownerRecord.email, data.ownerRecord.phone].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    No owner of record has been captured yet. Activate this entitlement when the
                    beneficiary details are known.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
