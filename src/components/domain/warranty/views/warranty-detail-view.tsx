'use client';

/**
 * Warranty Detail View
 *
 * Pure UI component for warranty details, claims, and extensions.
 */

import { Link } from '@tanstack/react-router';
import {
  Calendar,
  User,
  Package,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared';
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
import {
  WarrantyCertificateButton,
  WarrantyClaimFormDialog,
  ClaimApprovalDialog,
  ExtendWarrantyDialog,
  WarrantyExtensionHistory,
} from '@/components/domain/warranty';
import {
  claimStatusConfig,
  claimTypeConfig,
  formatClaimDate,
  formatClaimCost,
} from '@/lib/warranty/claims-utils';
import type { WarrantyClaimTypeValue } from '@/hooks/warranty';
import type { WarrantyExtensionTypeValue } from '@/lib/schemas/warranty/extensions';
import type { WarrantyExtensionItem } from './warranty-extension-history';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyDetailViewWarranty {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSerial: string | null;
  warrantyPolicyId: string;
  policyName: string;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  registrationDate: string;
  expiryDate: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'voided' | 'transferred';
  currentCycleCount: number | null;
  cycleLimit: number | null;
  expiryAlertOptOut: boolean;
  lastExpiryAlertSent: string | null;
  certificateUrl: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string | null;
    productSku: string | null;
    productSerial: string | null;
    warrantyStartDate: string;
    warrantyEndDate: string;
    warrantyPeriodMonths: number;
    installationNotes: string | null;
  }>;
}

export interface WarrantyClaimListItem {
  id: string;
  claimNumber: string;
  claimType: string;
  status: string;
  cost: number | null;
  submittedAt: string | Date;
  description: string;
  cycleCountAtClaim: number | null;
  customer: { id: string; name: string | null };
  product: { id: string; name: string | null };
  warranty: { warrantyNumber: string; productSerial: string | null };
}

export interface WarrantyCertificateStatus {
  exists: boolean;
  certificateUrl: string | null;
}

export interface WarrantyDetailViewProps {
  warranty: WarrantyDetailViewWarranty;
  claims: WarrantyClaimListItem[];
  extensions: WarrantyExtensionItem[];
  certificateStatus: WarrantyCertificateStatus | null | undefined;
  isClaimsLoading: boolean;
  isExtensionsLoading: boolean;
  isExtensionsError: boolean;
  isCertificateLoading: boolean;
  isGeneratingCertificate: boolean;
  isRegeneratingCertificate: boolean;
  isOptOutUpdating: boolean;
  isSubmittingClaim: boolean;
  isSubmittingApproval: boolean;
  isSubmittingExtend: boolean;
  isClaimDialogOpen: boolean;
  isApprovalDialogOpen: boolean;
  isExtendDialogOpen: boolean;
  selectedClaimForApproval: WarrantyClaimListItem | null;
  onClaimRowClick: (claimId: string) => void;
  onReviewClaim: (claim: WarrantyClaimListItem) => void;
  onClaimDialogOpenChange: (open: boolean) => void;
  onApprovalDialogOpenChange: (open: boolean) => void;
  onExtendDialogOpenChange: (open: boolean) => void;
  onRetryExtensions: () => void;
  onClaimsSuccess: () => void;
  onExtensionsSuccess: () => void;
  onSubmitClaim: (payload: {
    warrantyId: string;
    claimType: WarrantyClaimTypeValue;
    description: string;
    cycleCountAtClaim?: number;
    notes?: string;
  }) => Promise<void>;
  onApproveClaim: (payload: { claimId: string; notes?: string }) => Promise<void>;
  onDenyClaim: (payload: { claimId: string; denialReason: string; notes?: string }) => Promise<void>;
  onExtendWarranty: (payload: {
    warrantyId: string;
    extensionType: WarrantyExtensionTypeValue;
    extensionMonths: number;
    price: number | null;
    notes: string | null;
  }) => Promise<void>;
  onToggleOptOut: (checked: boolean) => void;
  onGenerateCertificate: () => Promise<void>;
  onRegenerateCertificate: () => Promise<void>;
  onDownloadCertificate: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryBadge(daysUntilExpiry: number) {
  if (daysUntilExpiry <= 0) {
    return <StatusBadge status="Expired" variant="error" />;
  }
  if (daysUntilExpiry <= 7) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="error" />;
  }
  if (daysUntilExpiry <= 30) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="pending" />;
  }
  if (daysUntilExpiry <= 90) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="warning" />;
  }
  return <StatusBadge status={`${daysUntilExpiry} days left`} variant="neutral" />;
}

// ============================================================================
// VIEW
// ============================================================================

export function WarrantyDetailView({
  warranty,
  claims,
  extensions,
  certificateStatus,
  isClaimsLoading,
  isExtensionsLoading,
  isExtensionsError,
  isCertificateLoading,
  isGeneratingCertificate,
  isRegeneratingCertificate,
  isOptOutUpdating,
  isSubmittingClaim,
  isSubmittingApproval,
  isSubmittingExtend,
  isClaimDialogOpen,
  isApprovalDialogOpen,
  isExtendDialogOpen,
  selectedClaimForApproval,
  onClaimRowClick,
  onReviewClaim,
  onClaimDialogOpenChange,
  onApprovalDialogOpenChange,
  onExtendDialogOpenChange,
  onRetryExtensions,
  onClaimsSuccess,
  onExtensionsSuccess,
  onSubmitClaim,
  onApproveClaim,
  onDenyClaim,
  onExtendWarranty,
  onToggleOptOut,
  onGenerateCertificate,
  onRegenerateCertificate,
  onDownloadCertificate,
}: WarrantyDetailViewProps) {
  const daysUntilExpiry = getDaysUntilExpiry(warranty.expiryDate);
  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';
  const approvalClaim = selectedClaimForApproval ?? null;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview">
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
                      hasCertificate={certificateStatus?.exists ?? false}
                      certificateUrl={certificateStatus?.certificateUrl ?? null}
                      isLoadingStatus={isCertificateLoading}
                      isGenerating={isGeneratingCertificate}
                      isRegenerating={isRegeneratingCertificate}
                      onGenerate={onGenerateCertificate}
                      onRegenerate={onRegenerateCertificate}
                      onDownload={onDownloadCertificate}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      {warranty.expiryAlertOptOut ? (
                        <BellOff className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <Bell className="text-primary h-4 w-4" />
                      )}
                      <span>Expiry Alerts</span>
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      {warranty.expiryAlertOptOut
                        ? 'Alerts are disabled for this warranty'
                        : 'Receive alerts at 90, 60, and 30 days before expiry'}
                    </p>
                  </div>
                  <Switch
                    id="opt-out-toggle"
                    checked={!warranty.expiryAlertOptOut}
                    onCheckedChange={(checked) => onToggleOptOut(!checked)}
                    disabled={isOptOutUpdating}
                    aria-label={warranty.expiryAlertOptOut ? 'Enable expiry alerts' : 'Disable expiry alerts'}
                  />
                </div>

                {isOptOutUpdating && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </div>
                )}

                <Separator />

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

                <div className="flex items-center gap-2 text-sm">
                  {warranty.expiryAlertOptOut ? (
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Covered Items
                </CardTitle>
                <CardDescription>
                  Products and components covered under this certificate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {warranty.items.length === 0 ? (
                  <div className="text-muted-foreground text-sm">No items recorded.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warranty.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName ?? 'Unknown'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.productSku ?? '—'}
                          </TableCell>
                          <TableCell className="font-mono">
                            {item.productSerial ?? '—'}
                          </TableCell>
                          <TableCell>{formatDate(item.warrantyStartDate)}</TableCell>
                          <TableCell>{formatDate(item.warrantyEndDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <WarrantyExtensionHistory
              warrantyId={warranty.id}
              originalExpiryDate={warranty.expiryDate}
              onExtendClick={() => onExtendDialogOpenChange(true)}
              extensions={extensions}
              isLoading={isExtensionsLoading}
              isError={isExtensionsError}
              onRetry={onRetryExtensions}
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
                  <Button size="sm" onClick={() => onClaimDialogOpenChange(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Claim
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isClaimsLoading ? (
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
                    <Button onClick={() => onClaimDialogOpenChange(true)}>
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
                      const claimTypeCfg =
                        claimTypeConfig[claim.claimType as WarrantyClaimTypeValue];

                      return (
                        <TableRow
                          key={claim.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => onClaimRowClick(claim.id)}
                        >
                          <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {claimTypeCfg?.label ?? claim.claimType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={claim.status}
                              statusConfig={claimStatusConfig}
                            />
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
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onReviewClaim(claim);
                                  }}
                                  aria-label={`Review claim ${claim.claimNumber}`}
                                >
                                  Review
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onClaimRowClick(claim.id);
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

      <WarrantyClaimFormDialog
        open={isClaimDialogOpen}
        onOpenChange={onClaimDialogOpenChange}
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
        onSubmit={onSubmitClaim}
        isSubmitting={isSubmittingClaim}
        onSuccess={onClaimsSuccess}
      />

      {approvalClaim && (
        <ClaimApprovalDialog
          open={isApprovalDialogOpen}
          onOpenChange={onApprovalDialogOpenChange}
          claim={{
            id: approvalClaim.id,
            claimNumber: approvalClaim.claimNumber,
            claimType: approvalClaim.claimType,
            status: approvalClaim.status,
            description: approvalClaim.description,
            cost: approvalClaim.cost,
            submittedAt: approvalClaim.submittedAt,
            cycleCountAtClaim: approvalClaim.cycleCountAtClaim,
            warranty: {
              warrantyNumber: warranty.warrantyNumber,
              productSerial: warranty.productSerial,
            },
            customer: {
              name: approvalClaim.customer.name ?? 'Unknown Customer',
            },
            product: {
              name: approvalClaim.product.name ?? 'Unknown Product',
            },
          }}
          onApprove={onApproveClaim}
          onDeny={onDenyClaim}
          isSubmitting={isSubmittingApproval}
          onSuccess={onClaimsSuccess}
        />
      )}

      <ExtendWarrantyDialog
        open={isExtendDialogOpen}
        onOpenChange={onExtendDialogOpenChange}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          customerName: warranty.customerName ?? undefined,
          expiryDate: warranty.expiryDate,
          status: warranty.status,
        }}
        onSubmit={onExtendWarranty}
        isSubmitting={isSubmittingExtend}
        onSuccess={onExtensionsSuccess}
      />
    </div>
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
