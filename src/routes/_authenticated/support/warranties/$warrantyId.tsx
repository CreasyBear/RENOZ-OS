/**
 * Warranty Detail Route
 *
 * Displays warranty details with opt-out toggle for expiry alerts,
 * certificate generation, and claims history tab.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003d, DOM-WAR-004c, DOM-WAR-006c
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  User,
  Package,
  Shield,
  BellOff,
  Bell,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileWarning,
  Plus,
  ExternalLink,
} from 'lucide-react';

import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getWarranty } from '@/server/functions/warranty/warranties';
import { useUpdateWarrantyOptOut } from '@/hooks/warranty';
import { toast } from 'sonner';
import {
  WarrantyCertificateButton,
  WarrantyClaimFormDialog,
  ClaimApprovalDialog,
  ExtendWarrantyDialog,
  WarrantyExtensionHistory,
} from '@/components/domain/warranty';
import {
  useWarrantyClaimsByWarranty,
  useCreateWarrantyClaim,
  useApproveClaim,
  useDenyClaim,
  useWarrantyCertificate,
  useGenerateWarrantyCertificate,
  useRegenerateWarrantyCertificate,
  useWarrantyExtensions,
  useExtendWarranty,
  type WarrantyClaimStatusValue,
  type WarrantyClaimTypeValue,
} from '@/hooks/warranty';
import {
  claimStatusConfig,
  claimTypeConfig,
  formatClaimDate,
  formatClaimCost,
} from '@/lib/warranty/claims-utils';
import { useConfirmation } from '@/hooks';
import type { WarrantyExtensionTypeValue } from '@/lib/schemas/warranty/extensions';

export const Route = createFileRoute('/_authenticated/support/warranties/$warrantyId')({
  loader: async ({ params }) => {
    const warranty = await getWarranty({ data: { id: params.warrantyId } });
    if (!warranty) {
      throw new Error('Warranty not found');
    }
    return warranty;
  },
  component: WarrantyDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/warranties" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Warranty Details"
        description="Loading warranty information..."
      />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// Status badge styling
const statusStyles: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
> = {
  active: { variant: 'default', label: 'Active' },
  expiring_soon: { variant: 'outline', label: 'Expiring Soon' },
  expired: { variant: 'destructive', label: 'Expired' },
  voided: { variant: 'destructive', label: 'Voided' },
  transferred: { variant: 'secondary', label: 'Transferred' },
};

// Policy type labels
const policyTypeLabels: Record<string, string> = {
  battery_performance: 'Battery Performance',
  inverter_manufacturer: 'Inverter Manufacturer',
  installation_workmanship: 'Installation Workmanship',
};

/**
 * Format date for display (Australian format DD/MM/YYYY)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Calculate days until expiry
 */
function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency badge for days until expiry
 */
function getExpiryBadge(daysUntilExpiry: number) {
  if (daysUntilExpiry <= 0) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  if (daysUntilExpiry <= 7) {
    return <Badge variant="destructive">{daysUntilExpiry} days left</Badge>;
  }
  if (daysUntilExpiry <= 30) {
    return <Badge className="bg-orange-500 hover:bg-orange-600">{daysUntilExpiry} days left</Badge>;
  }
  if (daysUntilExpiry <= 90) {
    return (
      <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
        {daysUntilExpiry} days left
      </Badge>
    );
  }
  return <Badge variant="secondary">{daysUntilExpiry} days left</Badge>;
}

function WarrantyDetailPage() {
  const navigate = Route.useNavigate();
  const warranty = Route.useLoaderData();
  const confirm = useConfirmation();
  const [isOptedOut, setIsOptedOut] = useState(warranty.expiryAlertOptOut);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedClaimForApproval, setSelectedClaimForApproval] = useState<
    (typeof claims)[0] | null
  >(null);

  // Fetch claims for this warranty
  const {
    data: claimsData,
    isLoading: claimsLoading,
    refetch: refetchClaims,
  } = useWarrantyClaimsByWarranty(warranty.id);
  const claims = claimsData?.items ?? [];
  const createClaimMutation = useCreateWarrantyClaim();
  const approveClaimMutation = useApproveClaim();
  const denyClaimMutation = useDenyClaim();

  const {
    data: extensionsData,
    isLoading: extensionsLoading,
    isError: extensionsError,
    refetch: refetchExtensions,
  } = useWarrantyExtensions(warranty.id);

  const extendMutation = useExtendWarranty();

  const { data: certificateData, isLoading: certificateLoading } = useWarrantyCertificate(
    warranty.id
  );
  const generateCertificateMutation = useGenerateWarrantyCertificate();
  const regenerateCertificateMutation = useRegenerateWarrantyCertificate();

  const statusStyle = statusStyles[warranty.status] ?? statusStyles.active;
  const daysUntilExpiry = getDaysUntilExpiry(warranty.expiryDate);
  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';

  // Mutation for updating opt-out setting
  const updateOptOutMutation = useUpdateWarrantyOptOut();

  const handleOptOutToggle = (checked: boolean) => {
    // Optimistically update UI
    setIsOptedOut(checked);
    updateOptOutMutation.mutate(
      { warrantyId: warranty.id, optOut: checked },
      {
        onSuccess: (result) => {
          setIsOptedOut(result.optOut);
          toast.success(
            result.optOut
              ? 'Expiry alerts disabled for this warranty'
              : 'Expiry alerts enabled for this warranty'
          );
        },
        onError: (error) => {
          setIsOptedOut(!checked);
          toast.error('Failed to update notification settings');
          console.error('Update opt-out error:', error);
        },
      }
    );
  };

  const handleGenerateCertificate = async () => {
    const result = await generateCertificateMutation.mutateAsync({
      warrantyId: warranty.id,
      forceRegenerate: false,
    });

    if (result.success && result.certificateUrl) {
      window.open(result.certificateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRegenerateCertificate = async () => {
    const confirmed = await confirm.confirm({
      title: 'Regenerate Warranty Certificate',
      description:
        'Are you sure you want to regenerate this warranty certificate? The previous certificate will be replaced.',
      confirmLabel: 'Regenerate',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      const result = await regenerateCertificateMutation.mutateAsync({
        warrantyId: warranty.id,
        reason: 'User requested regeneration',
      });

      if (result.success && result.certificateUrl) {
        window.open(result.certificateUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleDownloadCertificate = () => {
    if (certificateData?.certificateUrl) {
      window.open(certificateData.certificateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmitClaim = async (payload: {
    warrantyId: string;
    claimType: WarrantyClaimTypeValue;
    description: string;
    cycleCountAtClaim?: number;
    notes?: string;
  }) => {
    await createClaimMutation.mutateAsync(payload);
  };

  const handleApproveClaim = async (payload: { claimId: string; notes?: string }) => {
    await approveClaimMutation.mutateAsync(payload);
  };

  const handleDenyClaim = async (payload: {
    claimId: string;
    denialReason: string;
    notes?: string;
  }) => {
    await denyClaimMutation.mutateAsync(payload);
  };

  const handleExtendWarranty = async (payload: {
    warrantyId: string;
    extensionType: WarrantyExtensionTypeValue;
    extensionMonths: number;
    price: number | null;
    notes: string | null;
  }) => {
    await extendMutation.mutateAsync(payload);
  };

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({
                  to: '/reports/expiring-warranties',
                  search: { range: '30', status: 'active', sort: 'expiry_asc', page: 1 },
                })
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="text-muted-foreground h-5 w-5" />
                <span>{warranty.warrantyNumber}</span>
                <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {policyTypeLabels[warranty.policyType]} Warranty
              </p>
            </div>
          </div>
        }
        actions={
          canFileClaim && (
            <Button onClick={() => setClaimDialogOpen(true)}>
              <FileWarning className="mr-2 h-4 w-4" />
              File a Claim
            </Button>
          )
        }
      />

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="claims" className="relative">
            Claims
            {claims.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {claims.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Warranty Details Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Warranty Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                      Customer
                    </Label>
                    <div className="flex items-center gap-2">
                      <User className="text-muted-foreground h-4 w-4" />
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: warranty.customerId }}
                        className="text-primary hover:underline"
                      >
                        {warranty.customerName ?? 'Unknown Customer'}
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
                        params={{ productId: warranty.productId }}
                        className="text-primary hover:underline"
                      >
                        {warranty.productName ?? 'Unknown Product'}
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                      Serial Number
                    </Label>
                    <p className="font-mono">{warranty.productSerial ?? 'N/A'}</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                      Policy
                    </Label>
                    <p>{warranty.policyName}</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                      Registration Date
                    </Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      <span>{formatDate(warranty.registrationDate)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                      Expiry Date
                    </Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      <span>{formatDate(warranty.expiryDate)}</span>
                      {getExpiryBadge(daysUntilExpiry)}
                    </div>
                  </div>

                  {/* Cycle information for battery warranties */}
                  {warranty.policyType === 'battery_performance' && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                          Current Cycles
                        </Label>
                        <p>{warranty.currentCycleCount ?? 'Not tracked'}</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                          Cycle Limit
                        </Label>
                        <p>{warranty.cycleLimit ?? 'No limit'}</p>
                      </div>
                    </>
                  )}
                </div>

                {warranty.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                        Notes
                      </Label>
                      <p className="text-sm">{warranty.notes}</p>
                    </div>
                  </>
                )}

                {/* Certificate Actions - DOM-WAR-004c */}
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Warranty Certificate
                  </Label>
                  <div className="flex items-center gap-2">
                    <WarrantyCertificateButton
                      warrantyId={warranty.id}
                      warrantyNumber={warranty.warrantyNumber}
                      variant="outline"
                      size="sm"
                      hasCertificate={certificateData?.exists ?? false}
                      certificateUrl={certificateData?.certificateUrl}
                      isLoadingStatus={certificateLoading}
                      isGenerating={generateCertificateMutation.isPending}
                      isRegenerating={regenerateCertificateMutation.isPending}
                      onGenerate={handleGenerateCertificate}
                      onRegenerate={handleRegenerateCertificate}
                      onDownload={handleDownloadCertificate}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Manage expiry alert notifications for this warranty
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="opt-out-toggle"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      {isOptedOut ? (
                        <BellOff className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <Bell className="text-primary h-4 w-4" />
                      )}
                      <span>Expiry Alerts</span>
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      {isOptedOut
                        ? 'Alerts are disabled for this warranty'
                        : 'Receive alerts at 90, 60, and 30 days before expiry'}
                    </p>
                  </div>
                  <Switch
                    id="opt-out-toggle"
                    checked={!isOptedOut}
                    onCheckedChange={(checked) => handleOptOutToggle(!checked)}
                    disabled={updateOptOutMutation.isPending}
                    aria-label={isOptedOut ? 'Enable expiry alerts' : 'Disable expiry alerts'}
                  />
                </div>

                {updateOptOutMutation.isPending && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </div>
                )}

                <Separator />

                {/* Last alert sent info */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Last Alert Sent
                  </Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <span>
                      {warranty.lastExpiryAlertSent
                        ? formatDate(warranty.lastExpiryAlertSent)
                        : 'No alerts sent yet'}
                    </span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 text-sm">
                  {isOptedOut ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-muted-foreground">
                        You will not receive expiry reminders for this warranty
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Expiry reminders are active</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <WarrantyExtensionHistory
              warrantyId={warranty.id}
              originalExpiryDate={warranty.expiryDate}
              onExtendClick={() => setExtendDialogOpen(true)}
              extensions={extensionsData?.extensions ?? []}
              isLoading={extensionsLoading}
              isError={extensionsError}
              onRetry={refetchExtensions}
            />
          </div>
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5" />
                    Claims History
                  </CardTitle>
                  <CardDescription>
                    {claims.length} claim{claims.length !== 1 ? 's' : ''} filed for this warranty
                  </CardDescription>
                </div>
                {canFileClaim && (
                  <Button size="sm" onClick={() => setClaimDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Claim
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {claimsLoading ? (
                <ClaimsTableSkeleton />
              ) : claims.length === 0 ? (
                <div className="py-8 text-center">
                  <FileWarning className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <h3 className="text-lg font-semibold">No claims filed</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    If you&apos;re experiencing issues with this product, you can file a warranty
                    claim.
                  </p>
                  {canFileClaim && (
                    <Button onClick={() => setClaimDialogOpen(true)}>
                      <FileWarning className="mr-2 h-4 w-4" />
                      File a Claim
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Cost</TableHead>
                      <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => {
                      const claimStatusCfg =
                        claimStatusConfig[claim.status as WarrantyClaimStatusValue];
                      const claimTypeCfg =
                        claimTypeConfig[claim.claimType as WarrantyClaimTypeValue];

                      return (
                        <TableRow
                          key={claim.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() =>
                            navigate({
                              to: '/support/claims/$claimId',
                              params: { claimId: claim.id },
                              search: {},
                            })
                          }
                        >
                          <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {claimTypeCfg?.label ?? claim.claimType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={claimStatusCfg?.color ?? ''}>
                              {claimStatusCfg?.label ?? claim.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatClaimCost(claim.cost)}
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                            {formatClaimDate(claim.submittedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {(claim.status === 'submitted' ||
                                claim.status === 'under_review') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClaimForApproval(claim);
                                    setApprovalDialogOpen(true);
                                  }}
                                  aria-label={`Review claim ${claim.claimNumber}`}
                                >
                                  Review
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({
                                    to: '/support/claims/$claimId',
                                    params: { claimId: claim.id },
                                    search: {},
                                  });
                                }}
                                aria-label={`View claim ${claim.claimNumber}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Claim Form Dialog */}
      <WarrantyClaimFormDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          customerName: warranty.customerName ?? undefined,
          status: warranty.status,
          policyType: warranty.policyType ?? undefined,
          currentCycleCount: warranty.currentCycleCount ?? undefined,
          cycleLimit: warranty.cycleLimit ?? undefined,
        }}
        onSubmit={handleSubmitClaim}
        isSubmitting={createClaimMutation.isPending}
        onSuccess={() => refetchClaims()}
      />

      {/* Claim Approval Dialog */}
      {selectedClaimForApproval && (
        <ClaimApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={(open) => {
            setApprovalDialogOpen(open);
            if (!open) setSelectedClaimForApproval(null);
          }}
          claim={{
            id: selectedClaimForApproval.id,
            claimNumber: selectedClaimForApproval.claimNumber,
            claimType: selectedClaimForApproval.claimType,
            status: selectedClaimForApproval.status,
            description: selectedClaimForApproval.description,
            cost: selectedClaimForApproval.cost,
            submittedAt: selectedClaimForApproval.submittedAt,
            cycleCountAtClaim: selectedClaimForApproval.cycleCountAtClaim,
            warranty: {
              warrantyNumber: warranty.warrantyNumber,
              productSerial: warranty.productSerial,
            },
            customer: selectedClaimForApproval.customer,
            product: selectedClaimForApproval.product,
          }}
          onApprove={handleApproveClaim}
          onDeny={handleDenyClaim}
          isSubmitting={approveClaimMutation.isPending || denyClaimMutation.isPending}
          onSuccess={() => refetchClaims()}
        />
      )}

      <ExtendWarrantyDialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          customerName: warranty.customerName ?? undefined,
          expiryDate: warranty.expiryDate,
          status: warranty.status,
        }}
        onSubmit={handleExtendWarranty}
        isSubmitting={extendMutation.isPending}
        onSuccess={() => refetchExtensions()}
      />
    </PageLayout>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ClaimsTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[120px]" />
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="hidden h-6 w-[80px] md:block" />
          <Skeleton className="hidden h-6 w-[80px] sm:block" />
        </div>
      ))}
    </div>
  );
}
