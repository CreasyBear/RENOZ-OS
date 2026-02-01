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
 * Only renders when `selectedCount > 0`.
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
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border",
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
