/**
 * Kanban Filters
 *
 * Filter popover for kanban boards with priority and assignee filters.
 * Based on Square UI task filter pattern.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, useState } from "react";
import {
  SlidersHorizontal,
  Check,
  Layers,
  Stars,
  AlertCircle,
  Hexagon,
  Minus,
  Users,
  User,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { KanbanFilters, KanbanPriority, KanbanFilterOption } from "./types";

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_PRIORITIES: KanbanFilterOption<KanbanPriority | "all">[] = [
  { id: "all", name: "All priorities", icon: Layers },
  { id: "urgent", name: "Urgent", icon: Stars, color: "text-pink-500" },
  { id: "high", name: "High", icon: AlertCircle, color: "text-orange-500" },
  { id: "medium", name: "Medium", icon: Hexagon, color: "text-cyan-500" },
  { id: "low", name: "Low", icon: Minus, color: "text-slate-400" },
];

const DEFAULT_ASSIGNEES: KanbanFilterOption[] = [
  { id: "all", name: "All assignees", icon: Users },
  { id: "me", name: "Assigned to me", icon: User },
  { id: "unassigned", name: "Unassigned", icon: UserX },
];

// ============================================================================
// FILTER SECTION
// ============================================================================

interface FilterSectionProps<T extends string> {
  title: string;
  icon: React.ReactNode;
  options: KanbanFilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

function FilterSection<T extends string>({
  title,
  icon,
  options,
  selected,
  onSelect,
}: FilterSectionProps<T>) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <div className="space-y-1">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Button
              key={option.id}
              variant="ghost"
              size="sm"
              className="w-full justify-between h-9 px-3"
              onClick={() => onSelect(option.id)}
            >
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <Icon
                    className={cn(
                      "size-4",
                      option.color || "text-muted-foreground"
                    )}
                  />
                )}
                <span className="text-sm">{option.name}</span>
              </div>
              {selected === option.id && (
                <Check className="size-4 text-primary" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// KANBAN FILTERS
// ============================================================================

export interface KanbanFiltersComponentProps {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
  priorityOptions?: KanbanFilterOption<KanbanPriority | "all">[];
  assigneeOptions?: KanbanFilterOption[];
  showPriority?: boolean;
  showAssignee?: boolean;
  className?: string;
}

export const KanbanFiltersPopover = memo(function KanbanFiltersPopover({
  filters,
  onChange,
  priorityOptions = DEFAULT_PRIORITIES,
  assigneeOptions = DEFAULT_ASSIGNEES,
  showPriority = true,
  showAssignee = true,
  className,
}: KanbanFiltersComponentProps) {
  const [open, setOpen] = useState(false);

  const hasActiveFilters =
    (filters.priority && filters.priority !== "all") ||
    (filters.assignee && filters.assignee !== "all");

  const activeFilterCount = [
    filters.priority && filters.priority !== "all",
    filters.assignee && filters.assignee !== "all",
  ].filter(Boolean).length;

  const handleClearAll = () => {
    onChange({
      ...filters,
      priority: "all",
      assignee: "all",
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn("gap-2", className)}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filter</span>
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className="size-5 p-0 justify-center bg-primary text-primary-foreground"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          {/* Priority filter */}
          {showPriority && (
            <FilterSection
              title="Priority"
              icon={<Layers className="size-4 text-muted-foreground" />}
              options={priorityOptions}
              selected={(filters.priority as KanbanPriority | "all") ?? "all"}
              onSelect={(value) =>
                onChange({ ...filters, priority: value === "all" ? undefined : value })
              }
            />
          )}

          {showPriority && showAssignee && <Separator />}

          {/* Assignee filter */}
          {showAssignee && (
            <FilterSection
              title="Assignee"
              icon={<Users className="size-4 text-muted-foreground" />}
              options={assigneeOptions}
              selected={filters.assignee ?? "all"}
              onSelect={(value) =>
                onChange({ ...filters, assignee: value === "all" ? undefined : value })
              }
            />
          )}

          <Separator />

          {/* Clear filters */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9"
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
          >
            Clear all filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// ============================================================================
// FILTER CHIPS (inline display of active filters)
// ============================================================================

export interface KanbanFilterChipsProps {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
  priorityOptions?: KanbanFilterOption<KanbanPriority | "all">[];
  assigneeOptions?: KanbanFilterOption[];
  className?: string;
}

export const KanbanFilterChips = memo(function KanbanFilterChips({
  filters,
  onChange,
  priorityOptions = DEFAULT_PRIORITIES,
  assigneeOptions = DEFAULT_ASSIGNEES,
  className,
}: KanbanFilterChipsProps) {
  const activePriority =
    filters.priority && filters.priority !== "all"
      ? priorityOptions.find((p) => p.id === filters.priority)
      : null;

  const activeAssignee =
    filters.assignee && filters.assignee !== "all"
      ? assigneeOptions.find((a) => a.id === filters.assignee)
      : null;

  if (!activePriority && !activeAssignee) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {activePriority && (
        <Badge
          variant="secondary"
          className="gap-1.5 cursor-pointer hover:bg-secondary/80"
          onClick={() => onChange({ ...filters, priority: "all" })}
        >
          {activePriority.icon && (
            <activePriority.icon
              className={cn("size-3", activePriority.color)}
            />
          )}
          {activePriority.name}
          <span className="text-muted-foreground ml-1">&times;</span>
        </Badge>
      )}

      {activeAssignee && (
        <Badge
          variant="secondary"
          className="gap-1.5 cursor-pointer hover:bg-secondary/80"
          onClick={() => onChange({ ...filters, assignee: "all" })}
        >
          {activeAssignee.icon && (
            <activeAssignee.icon className="size-3" />
          )}
          {activeAssignee.name}
          <span className="text-muted-foreground ml-1">&times;</span>
        </Badge>
      )}
    </div>
  );
});
