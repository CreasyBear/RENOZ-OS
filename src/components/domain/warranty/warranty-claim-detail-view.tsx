'use client';

/**
 * Warranty Claim Detail View
 *
 * Pure UI component for claim details and timeline.
 */

import { Link } from '@tanstack/react-router';
import {
  FileWarning,
  Shield,
  User,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  Battery,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { formatClaimDateTime, formatClaimCost, resolutionTypeConfig, type SlaDueStatus } from '@/lib/warranty/claims-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyClaimDetailViewProps {
  claim: {
    id: string;
    claimNumber: string;
    claimType: string;
    status: string;
    description: string;
    cost: number | null;
    submittedAt: string | Date;
    updatedAt?: string | Date;
    resolvedAt?: string | Date | null;
    approvedAt?: string | Date | null;
    denialReason?: string | null;
    resolutionType?: string | null;
    resolutionNotes?: string | null;
    notes?: string | null;
    cycleCountAtClaim?: number | null;
    customerId: string;
    product?: { id?: string | null; name?: string | null } | null;
    warrantyId: string;
    warranty?: { warrantyNumber?: string | null } | null;
    customer?: { name?: string | null } | null;
    approvedByUser?: { name?: string | null; email?: string | null } | null;
    slaTracking?: {
      responseDueAt?: Date | string | null;
      resolutionDueAt?: Date | string | null;
      respondedAt?: Date | string | null;
      resolvedAt?: Date | string | null;
    } | null;
  };
  responseSla: SlaDueStatus | null;
  resolutionSla: SlaDueStatus | null;
}

// ============================================================================
// VIEW
// ============================================================================

export function WarrantyClaimDetailView({
  claim,
  responseSla,
  resolutionSla,
}: WarrantyClaimDetailViewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Customer
              </Label>
              <div className="flex items-center gap-2">
                <User className="text-muted-foreground h-4 w-4" />
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: claim.customerId }}
                  className="text-primary hover:underline"
                >
                  {claim.customer?.name ?? 'Unknown Customer'}
                </Link>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Product
              </Label>
              <div className="flex items-center gap-2">
                <Package className="text-muted-foreground h-4 w-4" />
                <Link
                  to="/products/$productId"
                  params={{ productId: claim.product?.id ?? '' }}
                  className="text-primary hover:underline"
                >
                  {claim.product?.name ?? 'Unknown Product'}
                </Link>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Warranty
              </Label>
              <div className="flex items-center gap-2">
                <Shield className="text-muted-foreground h-4 w-4" />
                <Link
                  to="/support/warranties/$warrantyId"
                  params={{ warrantyId: claim.warrantyId }}
                  className="text-primary hover:underline"
                >
                  {claim.warranty?.warrantyNumber}
                </Link>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Submitted
              </Label>
              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <span>{formatClaimDateTime(claim.submittedAt)}</span>
              </div>
            </div>

            {claim.cycleCountAtClaim !== null && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Cycle Count at Claim
                </Label>
                <div className="flex items-center gap-2">
                  <Battery className="text-muted-foreground h-4 w-4" />
                  <span>{claim.cycleCountAtClaim?.toLocaleString()} cycles</span>
                </div>
              </div>
            )}

            {claim.cost !== null && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Resolution Cost
                </Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="text-muted-foreground h-4 w-4" />
                  <span>{formatClaimCost(claim.cost)}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs tracking-wider uppercase">
              Description
            </Label>
            <p className="text-sm whitespace-pre-wrap">{claim.description}</p>
          </div>

          {claim.resolutionType && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Resolution
                </Label>
                <div className="flex items-center gap-2">
                  <Badge className={resolutionTypeConfig[claim.resolutionType as keyof typeof resolutionTypeConfig]?.color ?? ''}>
                    {resolutionTypeConfig[claim.resolutionType as keyof typeof resolutionTypeConfig]?.label ?? claim.resolutionType}
                  </Badge>
                  {claim.resolutionNotes && (
                    <span className="text-muted-foreground text-sm">
                      - {claim.resolutionNotes}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {claim.denialReason && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Denial Reason
                </Label>
                <p className="text-destructive text-sm">{claim.denialReason}</p>
              </div>
            </>
          )}

          {claim.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Notes
                </Label>
                <pre className="text-muted-foreground font-sans text-sm whitespace-pre-wrap">
                  {claim.notes}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs tracking-wider uppercase">
              Response SLA
            </Label>
            {claim.slaTracking?.respondedAt ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Responded {formatClaimDateTime(claim.slaTracking.respondedAt)}</span>
              </div>
            ) : responseSla ? (
              <div className="flex items-center gap-2 text-sm">
                {responseSla.status === 'breached' ? (
                  <AlertTriangle className="text-destructive h-4 w-4" />
                ) : responseSla.status === 'at_risk' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Clock className="text-muted-foreground h-4 w-4" />
                )}
                <span
                  className={
                    responseSla.status === 'breached'
                      ? 'text-destructive'
                      : responseSla.status === 'at_risk'
                        ? 'text-yellow-600'
                        : ''
                  }
                >
                  {responseSla.label}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No SLA configured</span>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs tracking-wider uppercase">
              Resolution SLA
            </Label>
            {claim.slaTracking?.resolvedAt ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Resolved {formatClaimDateTime(claim.slaTracking.resolvedAt)}</span>
              </div>
            ) : resolutionSla ? (
              <div className="flex items-center gap-2 text-sm">
                {resolutionSla.status === 'breached' ? (
                  <AlertTriangle className="text-destructive h-4 w-4" />
                ) : resolutionSla.status === 'at_risk' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Clock className="text-muted-foreground h-4 w-4" />
                )}
                <span
                  className={
                    resolutionSla.status === 'breached'
                      ? 'text-destructive'
                      : resolutionSla.status === 'at_risk'
                        ? 'text-yellow-600'
                        : ''
                  }
                >
                  {resolutionSla.label}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No SLA configured</span>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs tracking-wider uppercase">
              Timeline
            </Label>
            <div className="space-y-3 pt-2">
              <TimelineItem
                icon={<FileWarning className="h-4 w-4" />}
                title="Submitted"
                date={claim.submittedAt}
                isComplete
              />
              <TimelineItem
                icon={<Clock className="h-4 w-4" />}
                title="Under Review"
                date={claim.slaTracking?.respondedAt ?? undefined}
                isComplete={claim.status !== 'under_review'}
              />
              {(claim.status === 'approved' || claim.status === 'resolved') && (
                <TimelineItem
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Approved"
                  date={claim.approvedAt ?? undefined}
                  user={claim.approvedByUser?.name ?? claim.approvedByUser?.email ?? undefined}
                  isComplete
                />
              )}
              {claim.status === 'denied' && (
                <TimelineItem
                  icon={<XCircle className="h-4 w-4" />}
                  title="Denied"
                  date={claim.updatedAt}
                  isComplete
                  variant="destructive"
                />
              )}
              {claim.status === 'resolved' && (
                <TimelineItem
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Resolved"
                  date={claim.resolvedAt ?? undefined}
                  isComplete
                  variant="success"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TIMELINE ITEM
// ============================================================================

interface TimelineItemProps {
  icon: React.ReactNode;
  title: string;
  date?: string | Date | null;
  user?: string | null;
  isComplete?: boolean;
  variant?: 'default' | 'success' | 'destructive';
}

function TimelineItem({
  icon,
  title,
  date,
  user,
  isComplete,
  variant = 'default',
}: TimelineItemProps) {
  const colorClasses = {
    default: isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
    success: 'bg-green-500 text-white',
    destructive: 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`rounded-full p-1.5 ${colorClasses[variant]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {date && <p className="text-muted-foreground text-xs">{formatClaimDateTime(date)}</p>}
        {user && <p className="text-muted-foreground text-xs">by {user}</p>}
      </div>
    </div>
  );
}
