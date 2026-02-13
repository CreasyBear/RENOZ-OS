/**
 * Kanban Quick Add
 *
 * Inline input for quickly adding items to a column.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, useState, useRef, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// TYPES
// ============================================================================

export interface QuickAddData {
  title: string;
  description?: string;
}

export interface KanbanQuickAddProps {
  /** Called when item is submitted */
  onAdd: (data: QuickAddData) => void | Promise<void>;
  /** Placeholder text for title input */
  placeholder?: string;
  /** Show description field */
  showDescription?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Initial expanded state */
  defaultExpanded?: boolean;
  /** Loading state during submission */
  isLoading?: boolean;
  /** Callback when cancelled */
  onCancel?: () => void;
  className?: string;
}

// ============================================================================
// QUICK ADD COMPONENT
// ============================================================================

export const KanbanQuickAdd = memo(function KanbanQuickAdd({
  onAdd,
  placeholder = "Add a task...",
  showDescription = false,
  autoFocus = false,
  defaultExpanded = false,
  isLoading = false,
  onCancel,
  className,
}: KanbanQuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded && autoFocus) {
      inputRef.current?.focus();
    }
  }, [isExpanded, autoFocus]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setIsExpanded(false);
    onCancel?.();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!title.trim()) return;

    await onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
    });

    // Reset form
    setTitle("");
    setDescription("");

    // Keep expanded for quick consecutive adds
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Collapsed state - Square UI ghost button
  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
          "rounded-xl h-10",
          className
        )}
        onClick={handleExpand}
      >
        <Plus className="h-4 w-4" />
        {placeholder}
      </Button>
    );
  }

  // Expanded state - Square UI card form
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        // Square UI: rounded-2xl, border-border/70
        "bg-background rounded-2xl border border-border/70 p-4 space-y-3",
        className
      )}
    >
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task title"
        disabled={isLoading}
        className="border-0 p-0 h-auto text-xs font-medium focus-visible:ring-0 placeholder:text-muted-foreground"
      />

      {showDescription && (
        <Textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a description..."
          disabled={isLoading}
          rows={2}
          className="border-0 p-0 min-h-0 text-xs resize-none focus-visible:ring-0 placeholder:text-muted-foreground"
        />
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <div className="text-[10px] text-muted-foreground pt-2">
          Enter to add, Esc to cancel
        </div>
        <div className="flex items-center gap-1.5 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-7 rounded-lg px-3"
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
});

// ============================================================================
// COLUMN QUICK ADD (for use in column footer)
// ============================================================================

export interface ColumnQuickAddProps extends Omit<KanbanQuickAddProps, "onAdd"> {
  /** Column key for context */
  columnKey: string;
  /** Called when item is added with column context */
  onAdd: (columnKey: string, data: QuickAddData) => void | Promise<void>;
}

export const ColumnQuickAdd = memo(function ColumnQuickAdd({
  columnKey,
  onAdd,
  ...props
}: ColumnQuickAddProps) {
  const handleAdd = async (data: QuickAddData) => {
    await onAdd(columnKey, data);
  };

  return <KanbanQuickAdd onAdd={handleAdd} {...props} />;
});
