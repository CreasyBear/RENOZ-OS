/**
 * Warranty Extension History Component
 *
 * Displays a table/list of all extensions for a specific warranty.
 * Shows extension dates, months, type, price, notes, and approver.
 *
 * Features:
 * - Loading skeleton during data fetch
 * - Empty state when no extensions exist
 * - Type badges with color coding
 * - Formatted dates in Australian format
 * - Responsive layout
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-007c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-007c.wireframe.md
 */

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CalendarPlus, History, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDateAustralian } from '@/lib/warranty/date-utils';
import type { WarrantyExtensionTypeValue } from '@/lib/schemas/warranty/extensions';
import { formatPrice } from '../orders/creation/order-creation-wizard/types';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyExtensionHistoryProps {
  /** The warranty ID to show extensions for */
  warrantyId: string;
  /** Original expiry date of the warranty */
  originalExpiryDate?: Date | string;
  /** Callback to open extend warranty dialog */
  onExtendClick?: () => void;
  /** Whether to show the extend button in the header */
  showExtendButton?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** From route container (useWarrantyExtensions). */
  extensions?: WarrantyExtensionItem[];
  /** From route container (useWarrantyExtensions). */
  isLoading?: boolean;
  /** From route container (useWarrantyExtensions). */
  isError?: boolean;
  /** From route container (useWarrantyExtensions). */
  onRetry?: () => void;
}

export interface WarrantyExtensionItem {
  id: string;
  warrantyId: string;
  warrantyNumber: string;
  extensionType: WarrantyExtensionTypeValue;
  extensionMonths: number;
  previousExpiryDate: string;
  newExpiryDate: string;
  price: number | null;
  notes: string | null;
  approvedById: string | null;
  createdAt: string;
}

// ============================================================================
// EXTENSION TYPE BADGE
// ============================================================================

const EXTENSION_TYPE_STYLES: Record<
  WarrantyExtensionTypeValue,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  paid_extension: { label: 'Paid', variant: 'default' },
  promotional: { label: 'Promotional', variant: 'secondary' },
  loyalty_reward: { label: 'Loyalty', variant: 'outline' },
  goodwill: { label: 'Goodwill', variant: 'outline' },
};

function ExtensionTypeBadge({ type }: { type: WarrantyExtensionTypeValue }) {
  const style = EXTENSION_TYPE_STYLES[type] ?? { label: type, variant: 'outline' as const };
  return <Badge variant={style.variant}>{style.label}</Badge>;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ExtensionHistorySkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-9 w-28" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ originalExpiryDate }: { originalExpiryDate?: Date | string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-muted rounded-full p-3">
        <History className="text-muted-foreground size-6" />
      </div>
      <h3 className="mt-4 text-sm font-medium">No extensions on record</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        This warranty has not been extended. The expiry date reflects the original policy duration.
      </p>
      {originalExpiryDate && (
        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">Original Expiry:</span>{' '}
          <span className="font-medium">{formatDateAustralian(originalExpiryDate)}</span>
        </p>
      )}
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-destructive/10 rounded-full p-3">
        <AlertCircle className="text-destructive size-6" />
      </div>
      <h3 className="mt-4 text-sm font-medium">Failed to load extensions</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        There was a problem loading the extension history.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 size-4" />
        Retry
      </Button>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WarrantyExtensionHistory({
  warrantyId: _warrantyId,
  originalExpiryDate,
  onExtendClick,
  showExtendButton = true,
  className,
  extensions,
  isLoading,
  isError,
  onRetry,
}: WarrantyExtensionHistoryProps) {
  const extensionItems = extensions ?? [];

  // Calculate total months extended
  const totalMonthsExtended = React.useMemo(() => {
    if (!extensionItems.length) return 0;
    return extensionItems.reduce((sum, ext) => sum + ext.extensionMonths, 0);
  }, [extensionItems]);

  if (isLoading) {
    return <ExtensionHistorySkeleton />;
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <History className="text-muted-foreground size-5" />
          <CardTitle className="text-base font-medium">Extension History</CardTitle>
          {extensionItems.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {extensionItems.length} extension{extensionItems.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {showExtendButton && onExtendClick && (
          <Button size="sm" onClick={onExtendClick}>
            <CalendarPlus className="mr-2 size-4" />
            Extend
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState onRetry={() => onRetry?.()} />
        ) : extensionItems.length === 0 ? (
          <EmptyState originalExpiryDate={originalExpiryDate} />
        ) : (
          <>
            {/* Summary */}
            {totalMonthsExtended > 0 && (
              <div className="bg-muted/50 mb-4 rounded-lg p-3">
                <p className="text-muted-foreground text-sm">
                  Total Extended:{' '}
                  <span className="text-foreground font-medium">
                    {totalMonthsExtended} month{totalMonthsExtended !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            )}

            {/* Table */}
            <Table aria-label="Warranty extension history">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Extension</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">New Expiry</TableHead>
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extensionItems.map((extension) => (
                  <TableRow key={extension.id}>
                    <TableCell className="font-medium">
                      {formatDateAustralian(extension.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="text-primary font-medium">
                        +{extension.extensionMonths} mo
                      </span>
                      {extension.price && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({formatPrice(extension.price)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ExtensionTypeBadge type={extension.extensionType} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDateAustralian(extension.newExpiryDate)}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                      {extension.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Original Expiry Footer */}
            {originalExpiryDate && (
              <div className="mt-4 border-t pt-4">
                <p className="text-muted-foreground text-sm">
                  Original Expiry Date:{' '}
                  <span className="text-foreground font-medium">
                    {formatDateAustralian(originalExpiryDate)}
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPACT VERSION (for inline display)
// ============================================================================

export interface WarrantyExtensionHistoryCompactProps {
  /** The warranty ID to show extensions for */
  warrantyId: string;
  /** Maximum number of items to show */
  maxItems?: number;
  /** From route container (useWarrantyExtensions). */
  extensions?: WarrantyExtensionItem[];
  /** From route container (useWarrantyExtensions). */
  isLoading?: boolean;
}

export function WarrantyExtensionHistoryCompact({
  warrantyId: _warrantyId,
  maxItems = 3,
  extensions,
  isLoading,
}: WarrantyExtensionHistoryCompactProps) {
  const extensionItems = extensions ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (extensionItems.length === 0) {
    return <p className="text-muted-foreground text-sm">No extensions on record</p>;
  }

  const displayedExtensions = extensionItems.slice(0, maxItems);
  const remainingCount = extensionItems.length - maxItems;

  return (
    <div className="space-y-2">
      {displayedExtensions.map((extension) => (
        <div key={extension.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-medium">+{extension.extensionMonths} mo</span>
            <ExtensionTypeBadge type={extension.extensionType} />
          </div>
          <span className="text-muted-foreground">{formatDateAustralian(extension.createdAt)}</span>
        </div>
      ))}
      {remainingCount > 0 && (
        <p className="text-muted-foreground text-xs">
          +{remainingCount} more extension{remainingCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
