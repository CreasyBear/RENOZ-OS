/**
 * Warranty Claims List Page
 *
 * Displays all warranty claims with filtering, sorting, and pagination.
 * Links to claim detail view and allows status updates.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-006c.wireframe.md
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import {
  FileWarning,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  X,
} from 'lucide-react';

import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  useWarrantyClaims,
  type WarrantyClaimStatusValue,
  type WarrantyClaimTypeValue,
} from '@/hooks/warranty';
import {
  claimStatusConfig,
  claimTypeConfig,
  formatClaimDate,
  formatClaimCost,
} from '@/lib/warranty/claims-utils';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const claimsSearchSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'approved', 'denied', 'resolved']).optional(),
  type: z
    .enum(['cell_degradation', 'bms_fault', 'inverter_failure', 'installation_defect', 'other'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  sortBy: z.enum(['submittedAt', 'claimNumber', 'status', 'claimType']).default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const Route = createFileRoute('/_authenticated/support/claims/')({
  validateSearch: claimsSearchSchema,
  component: ClaimsListPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Warranty Claims"
        description="Manage warranty claims and track resolutions"
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// STATUS OPTIONS
// ============================================================================

const STATUS_OPTIONS: { value: WarrantyClaimStatusValue; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'resolved', label: 'Resolved' },
];

const TYPE_OPTIONS: { value: WarrantyClaimTypeValue; label: string }[] = [
  { value: 'cell_degradation', label: 'Cell Degradation' },
  { value: 'bms_fault', label: 'BMS Fault' },
  { value: 'inverter_failure', label: 'Inverter Failure' },
  { value: 'installation_defect', label: 'Installation Defect' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// COMPONENT
// ============================================================================

function ClaimsListPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch claims
  const { data, isLoading, error, refetch } = useWarrantyClaims({
    status: search.status,
    claimType: search.type,
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
  });

  // Update search params
  const updateSearch = (updates: Partial<z.infer<typeof claimsSearchSchema>>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        // Reset to page 1 when filters change
        page: 'page' in updates ? updates.page : 1,
      }),
    });
  };

  // Clear all filters
  const clearFilters = () => {
    navigate({
      search: {
        page: 1,
        pageSize: search.pageSize,
        sortBy: 'submittedAt',
        sortOrder: 'desc',
      },
    });
  };

  const hasActiveFilters = search.status || search.type;
  const claims = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <FileWarning className="h-6 w-6" />
            Warranty Claims
          </div>
        }
        description="Manage warranty claims and track resolutions"
      />

      {/* Filter Bar */}
      <Card className="mt-6">
        <CardContent className="p-4">
          {/* Desktop Filters */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select
              value={search.status ?? 'all'}
              onValueChange={(value) =>
                updateSearch({
                  status: value === 'all' ? undefined : (value as WarrantyClaimStatusValue),
                })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={search.type ?? 'all'}
              onValueChange={(value) =>
                updateSearch({
                  type: value === 'all' ? undefined : (value as WarrantyClaimTypeValue),
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}

            <div className="text-muted-foreground ml-auto text-sm">
              {pagination.total} claim{pagination.total !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Mobile Filters */}
          <div className="flex items-center justify-between md:hidden">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {(search.status ? 1 : 0) + (search.type ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[50vh]">
                <SheetHeader>
                  <SheetTitle>Filter Claims</SheetTitle>
                  <SheetDescription>Filter warranty claims by status and type</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={search.status ?? 'all'}
                      onValueChange={(value) =>
                        updateSearch({
                          status: value === 'all' ? undefined : (value as WarrantyClaimStatusValue),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {STATUS_OPTIONS.map((option) => (
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
                      value={search.type ?? 'all'}
                      onValueChange={(value) =>
                        updateSearch({
                          type: value === 'all' ? undefined : (value as WarrantyClaimTypeValue),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {TYPE_OPTIONS.map((option) => (
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
                        clearFilters();
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

      {/* Claims Table */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {isLoading ? (
            <ClaimsTableSkeleton />
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="text-destructive mx-auto mb-4 h-12 w-12" />
              <h3 className="text-lg font-semibold">Failed to load claims</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              <Button onClick={() => refetch()}>Retry</Button>
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
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
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
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Cost</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => {
                    const statusConfig =
                      claimStatusConfig[claim.status as WarrantyClaimStatusValue];
                    const typeConfig = claimTypeConfig[claim.claimType as WarrantyClaimTypeValue];

                    return (
                      <TableRow
                        key={claim.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          navigate({
                            to: '/support/claims/$claimId' as string,
                            params: { claimId: claim.id },
                          })
                        }
                      >
                        <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{claim.customer?.name ?? 'Unknown'}</span>
                            <span className="text-muted-foreground hidden text-xs sm:inline">
                              {claim.warranty?.warrantyNumber}
                            </span>
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
                          <Badge className={statusConfig?.color ?? ''}>
                            {statusConfig?.label ?? claim.status}
                          </Badge>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate({
                                to: '/support/claims/$claimId' as string,
                                params: { claimId: claim.id },
                              });
                            }}
                            aria-label={`View claim ${claim.claimNumber}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <div className="text-muted-foreground text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSearch({ page: pagination.page - 1 })}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSearch({ page: pagination.page + 1 })}
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
    </PageLayout>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

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
