/**
 * PipelineFilters Component
 *
 * Filter bar for the pipeline board with search, stage filter, assignee, and date range.
 * Supports URL persistence for shareable filter states.
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */

import { memo, useCallback } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineFiltersState {
  search: string;
  stages: OpportunityStage[];
  assignedTo: string | null;
  minValue: number | null;
  maxValue: number | null;
  includeWonLost: boolean;
}

export interface PipelineFiltersProps {
  filters: PipelineFiltersState;
  onChange: (filters: PipelineFiltersState) => void;
  assignees?: Array<{ id: string; name: string }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGE_OPTIONS: Array<{ value: OpportunityStage; label: string }> = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const PipelineFilters = memo(function PipelineFilters({
  filters,
  onChange,
  assignees = [],
}: PipelineFiltersProps) {
  // Count active filters
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.stages.length +
    (filters.assignedTo ? 1 : 0) +
    (filters.minValue ? 1 : 0) +
    (filters.maxValue ? 1 : 0) +
    (filters.includeWonLost ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Update helpers
  const updateSearch = useCallback(
    (search: string) => onChange({ ...filters, search }),
    [filters, onChange]
  );

  const updateAssignee = useCallback(
    (assignedTo: string | null) => onChange({ ...filters, assignedTo }),
    [filters, onChange]
  );

  const toggleStage = useCallback(
    (stage: OpportunityStage) => {
      const stages = filters.stages.includes(stage)
        ? filters.stages.filter((s) => s !== stage)
        : [...filters.stages, stage];
      onChange({ ...filters, stages });
    },
    [filters, onChange]
  );

  const updateIncludeWonLost = useCallback(
    (includeWonLost: boolean) => onChange({ ...filters, includeWonLost }),
    [filters, onChange]
  );

  const clearFilters = useCallback(() => {
    onChange({
      search: "",
      stages: [],
      assignedTo: null,
      minValue: null,
      maxValue: null,
      includeWonLost: false,
    });
  }, [onChange]);

  const removeStage = useCallback(
    (stage: OpportunityStage) => {
      onChange({
        ...filters,
        stages: filters.stages.filter((s) => s !== stage),
      });
    },
    [filters, onChange]
  );

  return (
    <div className="space-y-3" role="search" aria-label="Filter opportunities">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={filters.search}
            onChange={(e) => updateSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Assignee Filter */}
        {assignees.length > 0 && (
          <Select
            value={filters.assignedTo ?? "all"}
            onValueChange={(value) =>
              updateAssignee(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* More Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filter Opportunities</h4>

              {/* Stage Filters */}
              <div className="space-y-2">
                <Label>Stages</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STAGE_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`stage-${option.value}`}
                        checked={filters.stages.includes(option.value)}
                        onCheckedChange={() => toggleStage(option.value)}
                      />
                      <label
                        htmlFor={`stage-${option.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Include Won/Lost */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-won-lost"
                  checked={filters.includeWonLost}
                  onCheckedChange={(checked) =>
                    updateIncludeWonLost(checked === true)
                  }
                />
                <label
                  htmlFor="include-won-lost"
                  className="text-sm cursor-pointer"
                >
                  Include Won/Lost
                </label>
              </div>

              {/* Value Range (TODO: Implement slider) */}
              <div className="space-y-2">
                <Label>Value Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minValue ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...filters,
                        minValue: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="flex-1"
                  />
                  <span className="self-center">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxValue ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...filters,
                        maxValue: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Pills */}
      {(filters.stages.length > 0 || filters.assignedTo) && (
        <div className="flex flex-wrap gap-2">
          {filters.stages.map((stage) => (
            <Badge
              key={stage}
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => removeStage(stage)}
            >
              {STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {filters.assignedTo && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => updateAssignee(null)}
            >
              {assignees.find((a) => a.id === filters.assignedTo)?.name ??
                "Assigned"}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
});

export default PipelineFilters;
