/**
 * Approval Bulk Actions Component
 *
 * Bulk action bar with improved discoverability.
 * Shows disabled button when no selection to improve UX.
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkApprove: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ApprovalBulkActions = memo(function ApprovalBulkActions({
  selectedCount,
  onClearSelection,
  onBulkApprove,
}: ApprovalBulkActionsProps) {
  const hasSelection = selectedCount >= 2;

  // Hide entire bulk actions card when fewer than 2 selected
  if (!hasSelection) return null;

  return (
    <Card className="transition-all duration-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {hasSelection ? (
              <>
                {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
              </>
            ) : (
              <span className="text-muted-foreground/70">
                Select items to perform bulk actions
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClearSelection}
              disabled={!hasSelection}
              className="transition-colors"
            >
              Clear Selection
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={onBulkApprove}
                      disabled={!hasSelection}
                      className="transition-colors"
                      aria-label={
                        hasSelection
                          ? `Bulk approve ${selectedCount} items`
                          : 'Select items to bulk approve'
                      }
                    >
                      Bulk Approve
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasSelection && (
                  <TooltipContent>
                    <p>Select one or more items to enable bulk approval</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
