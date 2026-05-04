'use client';

import { ExternalLink, FileWarning, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  claimStatusConfig,
  claimTypeConfig,
  formatClaimCost,
  formatClaimDate,
} from '@/lib/warranty/claims-utils';
import { isWarrantyClaimTypeValue } from '@/lib/schemas/warranty';
import type { WarrantyClaimListItem, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

interface WarrantyClaimsHistoryCardProps {
  claims: WarrantyClaimListItem[];
  canFileClaim: boolean;
  isClaimsLoading: boolean;
  isClaimsError?: boolean;
  pendingClaimAction?: WarrantyDetailViewProps['pendingClaimAction'];
  onClaimRowClick: (claimId: string) => void;
  onResolveClaimRow?: (claimId: string) => void;
  onReviewClaim: (claim: WarrantyClaimListItem) => void;
  onClaimDialogOpenChange: (open: boolean) => void;
  onRetryClaims?: () => void;
}

export function WarrantyClaimsHistoryCard({
  claims,
  canFileClaim,
  isClaimsLoading,
  isClaimsError = false,
  pendingClaimAction,
  onClaimRowClick,
  onResolveClaimRow,
  onReviewClaim,
  onClaimDialogOpenChange,
  onRetryClaims,
}: WarrantyClaimsHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" />
              Claims History
            </CardTitle>
            <CardDescription>
              {isClaimsError
                ? 'Claim history is temporarily unavailable for this warranty.'
                : `${claims.length} claim${claims.length !== 1 ? 's' : ''} filed for this warranty`}
            </CardDescription>
          </div>
          {canFileClaim && (
            <Button variant="outline" size="sm" onClick={() => onClaimDialogOpenChange(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Claim
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isClaimsLoading ? (
          <ClaimsTableSkeleton />
        ) : isClaimsError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>
                Warranty claims are temporarily unavailable. Please refresh and try again.
              </span>
              {onRetryClaims ? (
                <Button variant="outline" size="sm" onClick={onRetryClaims}>
                  Retry
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : claims.length === 0 ? (
          <div className="py-8 text-center">
            <FileWarning className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No claims filed</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              If you&apos;re experiencing issues with this product, you can file a warranty
              claim.
            </p>
            {canFileClaim && (
              <Button variant="outline" onClick={() => onClaimDialogOpenChange(true)}>
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
                const claimTypeCfg = isWarrantyClaimTypeValue(claim.claimType)
                  ? claimTypeConfig[claim.claimType]
                  : undefined;
                const isPendingReview =
                  pendingClaimAction?.claimId === claim.id &&
                  pendingClaimAction.action === 'review';
                const isPendingOpen =
                  pendingClaimAction?.claimId === claim.id &&
                  pendingClaimAction.action === 'open';
                const isPendingResolve =
                  pendingClaimAction?.claimId === claim.id &&
                  pendingClaimAction.action === 'resolve';

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
                            disabled={isPendingReview}
                            aria-label={`Review claim ${claim.claimNumber}`}
                          >
                            {isPendingReview ? 'Opening...' : 'Review'}
                          </Button>
                        )}
                        {claim.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              (onResolveClaimRow ?? onClaimRowClick)(claim.id);
                            }}
                            disabled={isPendingResolve}
                            aria-label={`Resolve claim ${claim.claimNumber}`}
                          >
                            {isPendingResolve ? 'Opening...' : 'Resolve'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            onClaimRowClick(claim.id);
                          }}
                          disabled={isPendingOpen}
                          aria-label={`View claim ${claim.claimNumber}`}
                        >
                          {isPendingOpen ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                          ) : (
                            <ExternalLink className="h-4 w-4" />
                          )}
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
  );
}

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
