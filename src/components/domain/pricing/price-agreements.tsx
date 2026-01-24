/**
 * Price Agreements Component
 *
 * Manage supplier price agreements with approval workflow.
 * Shows agreement list with status, validity, and actions.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

import { Link } from '@tanstack/react-router';
import {
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type PriceAgreementRow,
  type PriceAgreementStatus,
  priceAgreementStatusLabels,
} from '@/lib/schemas/pricing';

// ============================================================================
// TYPES
// ============================================================================

interface PriceAgreementsProps {
  agreements: PriceAgreementRow[];
  isLoading?: boolean;
  onAddAgreement?: () => void;
  onViewAgreement?: (id: string) => void;
  onEditAgreement?: (id: string) => void;
  onSubmitForApproval?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onDelete?: (id: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const statusVariants: Record<
  PriceAgreementStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'secondary',
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
  expired: 'secondary',
  cancelled: 'secondary',
};

const statusIcons: Record<PriceAgreementStatus, typeof CheckCircle> = {
  draft: FileText,
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  expired: AlertCircle,
  cancelled: XCircle,
};

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);
  return expiry > today && expiry <= in30Days;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="text-muted-foreground mb-3 h-12 w-12" />
      <p className="font-medium">No Price Agreements</p>
      <p className="text-muted-foreground mb-4 text-sm">
        Create pricing agreements with your suppliers.
      </p>
      {onAdd && (
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          New Agreement
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PriceAgreements({
  agreements,
  isLoading = false,
  onAddAgreement,
  onViewAgreement,
  onEditAgreement,
  onSubmitForApproval,
  onApprove,
  onReject,
  onDelete,
}: PriceAgreementsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (agreements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState onAdd={onAddAgreement} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price Agreements</CardTitle>
        {onAddAgreement && (
          <Button size="sm" onClick={onAddAgreement}>
            <Plus className="mr-2 h-4 w-4" />
            New Agreement
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agreement</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-center">Discount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((agreement) => {
                const StatusIcon = statusIcons[agreement.status];
                const expiringSoon = isExpiringSoon(agreement.expiryDate);

                return (
                  <TableRow key={agreement.id}>
                    <TableCell>
                      <div>
                        <p
                          className={`font-medium ${
                            onViewAgreement ? 'cursor-pointer hover:underline' : ''
                          }`}
                          onClick={() => onViewAgreement?.(agreement.id)}
                        >
                          {agreement.agreementNumber}
                        </p>
                        <p className="text-muted-foreground text-sm">{agreement.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/suppliers/$supplierId"
                        params={{ supplierId: agreement.supplierId }}
                        className="text-sm hover:underline"
                      >
                        {agreement.supplierName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(agreement.effectiveDate)}</p>
                        {agreement.expiryDate && (
                          <p
                            className={`text-xs ${
                              expiringSoon ? 'font-medium text-orange-600' : 'text-muted-foreground'
                            }`}
                          >
                            to {formatDate(agreement.expiryDate)}
                            {expiringSoon && ' (expiring soon)'}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{agreement.totalItems}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {agreement.discountPercent ? (
                        <span className="font-medium">{agreement.discountPercent}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariants[agreement.status]} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {priceAgreementStatusLabels[agreement.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewAgreement && (
                            <DropdownMenuItem onClick={() => onViewAgreement(agreement.id)}>
                              View Details
                            </DropdownMenuItem>
                          )}
                          {onEditAgreement && agreement.status === 'draft' && (
                            <DropdownMenuItem onClick={() => onEditAgreement(agreement.id)}>
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onSubmitForApproval && agreement.status === 'draft' && (
                            <DropdownMenuItem onClick={() => onSubmitForApproval(agreement.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              Submit for Approval
                            </DropdownMenuItem>
                          )}
                          {onApprove && agreement.status === 'pending' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onApprove(agreement.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              {onReject && (
                                <DropdownMenuItem
                                  onClick={() => onReject(agreement.id, 'Terms not acceptable')}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {onDelete &&
                            (agreement.status === 'draft' || agreement.status === 'rejected') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDelete(agreement.id)}
                                  className="text-destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export { PriceAgreements };
export type { PriceAgreementsProps };
