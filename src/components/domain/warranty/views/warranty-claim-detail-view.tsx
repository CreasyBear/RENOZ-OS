'use client';

/**
 * Warranty Claim Detail View
 *
 * Pure UI component for claim details and timeline.
 */

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  User,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Battery,
  PanelRight,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  formatClaimDateTime,
  formatClaimCost,
  getClaimStatusConfigForEntityHeader,
  resolutionTypeConfig,
} from '@/lib/warranty/claims-utils';
import {
  useAlertDismissals,
  generateAlertIdWithValue,
} from '@/hooks/_shared/use-alert-dismissals';

// Import types from schemas per SCHEMA-TRACE.md
import {
  isWarrantyClaimResolutionTypeValue,
  isWarrantyClaimStatusValue,
  type WarrantyClaimDetailViewProps,
} from '@/lib/schemas/warranty';
import { EntityHeader } from '@/components/shared/detail-view';

// ============================================================================
// VIEW
// ============================================================================

export function WarrantyClaimDetailView({
  claim,
  primaryAction,
  secondaryActions = [],
  responseSla,
  resolutionSla,
  requestInfoEvents = [],
}: WarrantyClaimDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      tone: 'critical' | 'warning';
      title: string;
      description: string;
      actionLabel: string;
      onAction: () => void;
    }> = [];

    if (responseSla?.status === 'breached') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claim.id,
          'response_sla_breached',
          responseSla.label
        ),
        tone: 'critical',
        title: 'Response SLA breached',
        description: responseSla.label,
        actionLabel: 'View SLA',
        onAction: () => setActiveTab('sla'),
      });
    } else if (responseSla?.status === 'at_risk') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claim.id,
          'response_sla_at_risk',
          responseSla.label
        ),
        tone: 'warning',
        title: 'Response SLA at risk',
        description: responseSla.label,
        actionLabel: 'View SLA',
        onAction: () => setActiveTab('sla'),
      });
    }

    if (resolutionSla?.status === 'breached') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claim.id,
          'resolution_sla_breached',
          resolutionSla.label
        ),
        tone: 'critical',
        title: 'Resolution SLA breached',
        description: resolutionSla.label,
        actionLabel: 'View SLA',
        onAction: () => setActiveTab('sla'),
      });
    } else if (resolutionSla?.status === 'at_risk') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claim.id,
          'resolution_sla_at_risk',
          resolutionSla.label
        ),
        tone: 'warning',
        title: 'Resolution SLA at risk',
        description: resolutionSla.label,
        actionLabel: 'View SLA',
        onAction: () => setActiveTab('sla'),
      });
    }

    return items;
  }, [claim.id, resolutionSla, responseSla]);

  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id)).slice(0, 3);
  const actionTimeline = useMemo(() => {
    const events: Array<{ label: string; detail?: string; at?: string | Date | null }> = [
      { label: 'Claim submitted', at: claim.submittedAt },
    ];
    requestInfoEvents.forEach((e) => {
      events.push({
        label: 'Requested more info',
        detail: e.actorName,
        at: e.at,
      });
    });
    if (claim.status === 'under_review') {
      events.push({ label: 'Moved to under review', at: claim.updatedAt ?? claim.submittedAt });
    }
    if (claim.approvedAt) {
      events.push({
        label: 'Claim approved',
        detail: claim.approvedByUser?.name ?? claim.approvedByUser?.email ?? undefined,
        at: claim.approvedAt,
      });
    }
    if (claim.denialReason) {
      events.push({ label: 'Claim denied', detail: claim.denialReason, at: claim.updatedAt });
    }
    if (claim.status === 'cancelled') {
      events.push({ label: 'Claim cancelled', at: claim.updatedAt });
    }
    if (claim.resolutionType || claim.resolutionNotes || claim.resolvedAt) {
      events.push({
        label: 'Claim resolved',
        detail: claim.resolutionType ?? claim.resolutionNotes ?? undefined,
        at: claim.resolvedAt ?? claim.updatedAt,
      });
    }
    const filtered = events.filter((event) => !!event.at);
    filtered.sort((a, b) => new Date(a.at!).getTime() - new Date(b.at!).getTime());
    return filtered;
  }, [
    claim.submittedAt,
    claim.status,
    claim.updatedAt,
    claim.approvedAt,
    claim.approvedByUser?.name,
    claim.approvedByUser?.email,
    claim.denialReason,
    claim.resolutionType,
    claim.resolutionNotes,
    claim.resolvedAt,
    requestInfoEvents,
  ]);

  const stages = [
    { id: 'submitted', label: 'Submitted' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'resolved', label: 'Resolved' },
  ];

  const stageIndex = stages.findIndex((stage) => stage.id === claim.status);
  const isTerminal = claim.status === 'denied' || claim.status === 'cancelled';

  const productContent = claim.product?.id ? (
    <Link
      to="/products/$productId"
      params={{ productId: claim.product?.id }}
      className="text-primary hover:underline"
    >
      {claim.product?.name ?? 'Unknown Product'}
    </Link>
  ) : (
    <span>{claim.product?.name ?? 'Unknown Product'}</span>
  );

  const sidebarContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Claim Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Claim #</span>
            <span className="font-mono">{claim.claimNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="capitalize">{claim.status.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Submitted</span>
            <span>{formatClaimDateTime(claim.submittedAt)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Warranty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link
            to="/support/warranties/$warrantyId"
            params={{ warrantyId: claim.warrantyId }}
            className="text-primary hover:underline"
          >
            Warranty {claim.warranty?.warrantyNumber ?? ''}
          </Link>
          <div className="text-muted-foreground">
            Customer: {claim.customer?.name ?? 'Unknown'}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-6">
        {/* Zone 1: Header — EntityHeader for consistency with warranty/issue/RMA */}
        <section className="flex flex-col gap-4">
          <EntityHeader
            name={`Claim ${claim.claimNumber}`}
            subtitle={
              <>
                {claim.product?.name ?? 'Unknown Product'} · Warranty {claim.warranty?.warrantyNumber ?? ''}
              </>
            }
            avatarFallback="C"
            status={
              isWarrantyClaimStatusValue(claim.status)
                ? getClaimStatusConfigForEntityHeader(claim.status)
                : { value: claim.status, variant: 'neutral' as const }
            }
            primaryAction={primaryAction}
            secondaryActions={secondaryActions}
            trailingContent={
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                    aria-label="Toggle claim sidebar"
                  >
                    <PanelRight className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px]">
                  <SheetHeader>
                    <SheetTitle>Claim details</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-6">{sidebarContent}</div>
                </SheetContent>
              </Sheet>
            }
          />

          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Claim progress</div>
              {isTerminal && (
                <Badge variant="destructive" className="capitalize">
                  {claim.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {stages.map((stage, index) => {
                const isCompleted = stageIndex >= index && !isTerminal;
                const isCurrent = stage.id === claim.status;
                return (
                  <div key={stage.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium',
                        isCompleted && 'border-primary bg-primary text-primary-foreground',
                        isCurrent && !isCompleted && 'border-primary text-primary',
                        !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      {isCompleted ? '✓' : '•'}
                    </div>
                    <span
                      className={cn(
                        'text-xs',
                        isCompleted && 'text-foreground',
                        !isCompleted && 'text-muted-foreground'
                      )}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {visibleAlerts.length > 0 && (
          <section className="space-y-2">
            {visibleAlerts.map((alert) => (
              <Alert
                key={alert.id}
                variant={alert.tone === 'critical' ? 'destructive' : 'default'}
              >
                <AlertDescription className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">{alert.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={alert.onAction}>
                      {alert.actionLabel}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Dismiss alert"
                      onClick={() => dismiss(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </section>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
          </TabsList>

          {activeTab === 'overview' && (
            <TabsContent value="overview" className="mt-4">
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
                            search={{}}
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
                          {productContent}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                          Warranty
                        </Label>
                        <div className="flex items-center gap-2">
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
                            <Badge
                              className={
                                isWarrantyClaimResolutionTypeValue(claim.resolutionType)
                                  ? resolutionTypeConfig[claim.resolutionType]?.color ?? ''
                                  : ''
                              }
                            >
                              {isWarrantyClaimResolutionTypeValue(claim.resolutionType)
                                ? resolutionTypeConfig[claim.resolutionType]?.label ?? claim.resolutionType
                                : claim.resolutionType}
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

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Claim Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Link
                        to="/support/warranties/$warrantyId"
                        params={{ warrantyId: claim.warrantyId }}
                        className="text-primary hover:underline"
                      >
                        View warranty
                      </Link>
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: claim.customerId }}
                        search={{}}
                        className="text-primary hover:underline"
                      >
                        View customer
                      </Link>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Action Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {actionTimeline.map((event, index) => (
                        <div key={`${event.label}-${index}`} className="space-y-1">
                          <div className="font-medium">{event.label}</div>
                          {event.detail && (
                            <div className="text-muted-foreground text-xs">{event.detail}</div>
                          )}
                          <div className="text-muted-foreground text-xs">
                            {formatClaimDateTime(event.at as Date | string)}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {activeTab === 'sla' && (
            <TabsContent value="sla" className="mt-4">
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
                      <span className="text-sm text-muted-foreground">No response SLA configured.</span>
                    )}
                  </div>

                  <Separator />

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
                      <span className="text-sm text-muted-foreground">No resolution SLA configured.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <aside className="hidden lg:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto">
        {sidebarContent}
      </aside>
    </div>
  );
}
