'use client';

/**
 * Warranty Claims List View
 *
 * Pure UI component for claims filtering, table, and pagination.
 */

import { memo, useState } from 'react';
import {
  FileWarning,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  claimStatusConfig,
  claimTypeConfig,
  formatClaimDate,
  formatClaimCost,
} from '@/lib/warranty/claims-utils';
import {
  isWarrantyClaimStatusValue,
  isWarrantyClaimantRoleValue,
  isWarrantyClaimTypeValue,
} from '@/lib/schemas/warranty';
import type {
  WarrantyClaimListItem,
  WarrantyClaimsListViewProps,
} from '@/lib/schemas/warranty';
import {
  WARRANTY_CLAIM_STATUS_OPTIONS,
  WARRANTY_CLAIM_TYPE_OPTIONS,
  WARRANTY_CLAIMANT_MODE_OPTIONS,
  WARRANTY_CLAIMANT_ROLE_LABELS,
  WARRANTY_CLAIMANT_ROLE_OPTIONS,
  WARRANTY_CLAIM_QUICK_FILTER_OPTIONS,
} from '../warranty-claim-options';

// Re-export for convenience
export type { WarrantyClaimListItem, WarrantyClaimsListViewProps };

// ============================================================================
// MEMOIZED ROW (TABLE-STANDARDS §1)
// ============================================================================

const ClaimTableRow = memo(function ClaimTableRow({
  claim,
  onRowClick,
}: {
  claim: WarrantyClaimListItem;
  onRowClick: (claimId: string) => void;
}) {
  const typeConfig = isWarrantyClaimTypeValue(claim.claimType)
    ? claimTypeConfig[claim.claimType]
    : undefined;

  return (
    <TableRow
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onRowClick(claim.id)}
    >
      <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {claim.commercialCustomer?.name ?? claim.customer?.name ?? 'Unknown'}
          </span>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            {claim.warranty?.warrantyNumber ?? '—'}
          </span>
          {claim.claimant?.displayName &&
            (claim.claimant.role !== 'channel_partner' ||
              claim.claimant.displayName !==
                (claim.commercialCustomer?.name ?? claim.customer?.name ?? null)) && (
              <span className="text-muted-foreground mt-1 inline-flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {WARRANTY_CLAIMANT_ROLE_LABELS[claim.claimant.role] ?? claim.claimant.role}
                </Badge>
                Claimant: {claim.claimant.displayName}
              </span>
            )}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {claim.product?.name ?? 'Unknown'}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="whitespace-nowrap">
          {typeConfig?.label ?? claim.claimType}
        </Badge>
      </TableCell>
      <TableCell>
        <StatusBadge status={claim.status} statusConfig={claimStatusConfig} />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {formatClaimCost(claim.cost)}
      </TableCell>
      <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
        {formatClaimDate(claim.submittedAt)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onRowClick(claim.id);
          }}
          aria-label={`View claim ${claim.claimNumber}`}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

// ============================================================================
// VIEW
// ============================================================================

export function WarrantyClaimsListView({
  commercialCustomerOptions,
  customerId,
  claimantRole,
  claimantMode,
  status,
  type,
  quickFilter,
  claims,
  pagination,
  isLoading,
  error,
  onCommercialCustomerChange,
  onClaimantRoleChange,
  onClaimantModeChange,
  onStatusChange,
  onTypeChange,
  onQuickFilterChange,
  onClearFilters,
  onPageChange,
  onRowClick,
  onRetry,
}: WarrantyClaimsListViewProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const hasActiveFilters = Boolean(
    customerId || claimantRole || claimantMode || status || type || quickFilter
  );
  const activeFilterCount =
    (customerId ? 1 : 0) +
    (claimantRole ? 1 : 0) +
    (claimantMode ? 1 : 0) +
    (status ? 1 : 0) +
    (type ? 1 : 0) +
    (quickFilter ? 1 : 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="hidden items-center gap-4 md:flex">
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select
              value={customerId ?? 'all'}
              onValueChange={(value) =>
                onCommercialCustomerChange(value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Purchased Via" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Purchased Via</SelectItem>
                {commercialCustomerOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={claimantMode ?? 'all'}
              onValueChange={(value) =>
                onClaimantModeChange(
                  value === 'all'
                    ? undefined
                    : value === 'channel_partner' || value === 'direct'
                      ? value
                      : undefined
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Claim Paths" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Claim Paths</SelectItem>
                {WARRANTY_CLAIMANT_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={claimantRole ?? 'all'}
              onValueChange={(value) =>
                onClaimantRoleChange(
                  value === 'all'
                    ? undefined
                    : isWarrantyClaimantRoleValue(value)
                      ? value
                      : undefined
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Claimants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Claimants</SelectItem>
                {WARRANTY_CLAIMANT_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status ?? 'all'}
              onValueChange={(value) =>
                onStatusChange(
                  value === 'all' ? undefined : isWarrantyClaimStatusValue(value) ? value : undefined
                )
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {WARRANTY_CLAIM_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={type ?? 'all'}
              onValueChange={(value) =>
                onTypeChange(
                  value === 'all' ? undefined : isWarrantyClaimTypeValue(value) ? value : undefined
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {WARRANTY_CLAIM_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}

            <div className="text-muted-foreground ml-auto text-sm">
              {pagination.total} claim{pagination.total !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {WARRANTY_CLAIM_QUICK_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={quickFilter === option.value ? 'default' : 'outline'}
                onClick={() =>
                  onQuickFilterChange(quickFilter === option.value ? undefined : option.value)
                }
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between md:hidden">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[50vh]">
                <SheetHeader>
                  <SheetTitle>Filter Claims</SheetTitle>
                  <SheetDescription>
                    Filter warranty claims by commercial channel, claimant path, and status
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purchased Via</label>
                    <Select
                      value={customerId ?? 'all'}
                      onValueChange={(value) =>
                        onCommercialCustomerChange(value === 'all' ? undefined : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Purchased Via" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Purchased Via</SelectItem>
                        {commercialCustomerOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Claim Path</label>
                    <Select
                      value={claimantMode ?? 'all'}
                      onValueChange={(value) =>
                        onClaimantModeChange(
                          value === 'all'
                            ? undefined
                            : value === 'channel_partner' || value === 'direct'
                              ? value
                              : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Claim Paths" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Claim Paths</SelectItem>
                        {WARRANTY_CLAIMANT_MODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Claimant Role</label>
                    <Select
                      value={claimantRole ?? 'all'}
                      onValueChange={(value) =>
                        onClaimantRoleChange(
                          value === 'all'
                            ? undefined
                            : isWarrantyClaimantRoleValue(value)
                              ? value
                              : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Claimants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Claimants</SelectItem>
                        {WARRANTY_CLAIMANT_ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={status ?? 'all'}
                      onValueChange={(value) =>
                        onStatusChange(
                          value === 'all'
                            ? undefined
                            : isWarrantyClaimStatusValue(value)
                              ? value
                              : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {WARRANTY_CLAIM_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Claim Type</label>
                    <Select
                      value={type ?? 'all'}
                      onValueChange={(value) =>
                        onTypeChange(
                          value === 'all'
                            ? undefined
                            : isWarrantyClaimTypeValue(value)
                              ? value
                              : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {WARRANTY_CLAIM_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        onClearFilters();
                        setMobileFiltersOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <span className="text-muted-foreground text-sm">
              {pagination.total} claim{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <ClaimsTableSkeleton />
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="text-destructive mx-auto mb-4 h-12 w-12" />
              <h3 className="text-lg font-semibold">Failed to load claims</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {error.message || 'An error occurred'}
              </p>
              <Button onClick={onRetry}>Retry</Button>
            </div>
          ) : claims.length === 0 ? (
            <div className="p-8 text-center">
              <FileWarning className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="text-lg font-semibold">No claims found</h3>
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'No warranty claims have been submitted yet'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={onClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Claim #</TableHead>
                    <TableHead>Purchased Via</TableHead>
                    <TableHead className="hidden md:table-cell">Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Cost</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <ClaimTableRow key={claim.id} claim={claim} onRowClick={onRowClick} />
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <div className="text-muted-foreground text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClaimsTableSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-[120px]" />
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="hidden h-6 w-[150px] md:block" />
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="hidden h-6 w-[80px] lg:block" />
          <Skeleton className="hidden h-6 w-[80px] md:block" />
        </div>
      ))}
    </div>
  );
}
