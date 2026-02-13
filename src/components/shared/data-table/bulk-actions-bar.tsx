import { memo, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkActionsBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Clear selection handler */
  onClear: () => void;
  /** Bulk action buttons/content */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Floating bar for bulk selection operations.
 *
 * Features entrance/exit animation for smoother UX.
 * Only renders when `selectedCount >= 2` (bulk implies multiple).
 *
 * @example
 * ```tsx
 * <BulkActionsBar
 *   selectedCount={selectedItems.length}
 *   onClear={() => clearSelection()}
 * >
 *   <Button size="sm" onClick={handleBulkDelete} variant="destructive">
 *     Delete Selected
 *   </Button>
 *   <Button size="sm" onClick={handleBulkExport}>
 *     Export
 *   </Button>
 * </BulkActionsBar>
 * ```
 */
export const BulkActionsBar = memo(function BulkActionsBar({
  selectedCount,
  onClear,
  children,
  className,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-lg",
            "bg-background dark:bg-card dark:border-border",
            className
          )}
        >
          <span className="text-sm text-muted-foreground tabular-nums">
            {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">{children}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="ml-auto h-7 px-2"
          >
            <X className="size-3.5 mr-1" />
            Clear
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

BulkActionsBar.displayName = "BulkActionsBar";
