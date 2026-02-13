/**
 * Approval Table Component
 *
 * Table display for approval items using shared DataTable component.
 * Uses TanStack Table with memoized column definitions.
 *
 * @see docs/design-system/TABLE-STANDARDS.md
 */

import { memo, useMemo } from 'react';
import { DataTable } from '@/components/shared/data-table';
import { createApprovalColumns } from './approval-columns';
import { cn } from '@/lib/utils';
import { APPROVAL_TABS } from './approval-dashboard';
import type { ApprovalItem } from '@/lib/schemas/approvals';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalTableProps {
  items: ApprovalItem[];
  activeTab: string;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onDecisionClick: (item: ApprovalItem) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ApprovalTable = memo(function ApprovalTable({
  items,
  activeTab,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onDecisionClick,
}: ApprovalTableProps) {
  const isPendingTab = activeTab === APPROVAL_TABS.PENDING;

  // Create columns based on active tab
  const columns = useMemo(
    () =>
      createApprovalColumns({
        isPendingTab,
        onSelect: onItemSelect,
        onSelectAll,
        onDecisionClick,
        selectedItems,
        allItems: items,
      }),
    [isPendingTab, onItemSelect, onSelectAll, onDecisionClick, selectedItems, items]
  );

  // Handle row click (only on pending tab)
  const handleRowClick = useMemo(
    () => (isPendingTab ? (item: ApprovalItem) => onDecisionClick(item) : undefined),
    [isPendingTab, onDecisionClick]
  );

  // Handle selection change - DataTable provides selected row objects
  const handleSelectionChange = useMemo(
    () =>
      isPendingTab
        ? (selectedRows: ApprovalItem[]) => {
            const selectedIds = new Set(selectedRows.map((row) => row.id));
            const currentSelectedSet = new Set(selectedItems);

            // Sync selection: add newly selected, remove newly deselected
            items.forEach((item) => {
              const wasSelected = currentSelectedSet.has(item.id);
              const isNowSelected = selectedIds.has(item.id);
              if (wasSelected !== isNowSelected) {
                onItemSelect(item.id, isNowSelected);
              }
            });
          }
        : undefined,
    [isPendingTab, items, selectedItems, onItemSelect]
  );

  return (
    <div className="overflow-x-auto">
      <DataTable
        data={items}
        columns={columns}
        enableRowSelection={isPendingTab}
        enableSorting={true}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        className={cn(
          '[&_td]:content-visibility-auto',
          isPendingTab && '[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:cursor-pointer'
        )}
      />
    </div>
  );
});
