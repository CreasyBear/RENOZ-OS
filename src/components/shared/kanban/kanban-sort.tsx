/* eslint-disable react-refresh/only-export-components -- Component exports component + sort config */
/**
 * Kanban Sort
 *
 * Sort dropdown for kanban boards supporting multiple sort fields.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  User,
  Flag,
  Type,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// TYPES
// ============================================================================

export type KanbanSortField =
  | "status"
  | "priority"
  | "dueDate"
  | "createdAt"
  | "updatedAt"
  | "assignee"
  | "title";

export type KanbanSortDirection = "asc" | "desc";

export interface KanbanSortOption {
  field: KanbanSortField;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface KanbanSortValue {
  field: KanbanSortField;
  direction: KanbanSortDirection;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

export const DEFAULT_SORT_OPTIONS: KanbanSortOption[] = [
  { field: "priority", label: "Priority", icon: Flag },
  { field: "dueDate", label: "Due Date", icon: Calendar },
  { field: "createdAt", label: "Created", icon: Clock },
  { field: "updatedAt", label: "Updated", icon: Clock },
  { field: "assignee", label: "Assignee", icon: User },
  { field: "title", label: "Alphabetical", icon: Type },
];

// ============================================================================
// SORT DROPDOWN
// ============================================================================

export interface KanbanSortDropdownProps {
  /** Current sort value */
  value?: KanbanSortValue;
  /** Called when sort changes */
  onChange: (value: KanbanSortValue) => void;
  /** Available sort options */
  options?: KanbanSortOption[];
  /** Button variant */
  variant?: "default" | "outline" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show label in button */
  showLabel?: boolean;
  className?: string;
}

export const KanbanSortDropdown = memo(function KanbanSortDropdown({
  value,
  onChange,
  options = DEFAULT_SORT_OPTIONS,
  variant = "outline",
  size = "sm",
  showLabel = true,
  className,
}: KanbanSortDropdownProps) {
  const currentOption = value
    ? options.find((opt) => opt.field === value.field)
    : null;

  const handleFieldSelect = (field: KanbanSortField) => {
    if (value?.field === field) {
      // Toggle direction if same field
      onChange({
        field,
        direction: value.direction === "asc" ? "desc" : "asc",
      });
    } else {
      // Default to descending for new field
      onChange({ field, direction: "desc" });
    }
  };

  const handleDirectionToggle = () => {
    if (value) {
      onChange({
        ...value,
        direction: value.direction === "asc" ? "desc" : "asc",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={cn("gap-2", className)}>
          <ArrowUpDown className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline">
              {currentOption ? currentOption.label : "Sort"}
            </span>
          )}
          {value && (
            <span className="text-muted-foreground">
              {value.direction === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = value?.field === option.field;

            return (
              <DropdownMenuItem
                key={option.field}
                onClick={() => handleFieldSelect(option.field)}
                className={cn(isSelected && "bg-accent")}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <span className="text-muted-foreground">
                    {value?.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        {value && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDirectionToggle}>
              {value.direction === "asc" ? (
                <>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Sort Descending
                </>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Sort Ascending
                </>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
