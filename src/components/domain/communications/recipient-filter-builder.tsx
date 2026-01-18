/**
 * RecipientFilterBuilder Component
 *
 * Dynamic filter UI for building recipient selection criteria.
 * Supports filtering by tags, status, customer type with add/remove rows.
 *
 * @see DOM-COMMS-003d
 */

"use client";

import { useState, useCallback } from "react";
import { Plus, X, Users, Tag, UserCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface RecipientCriteria {
  tags?: string[];
  statuses?: string[];
  customerTypes?: string[];
  contactIds?: string[];
  customerIds?: string[];
  excludeContactIds?: string[];
}

export interface RecipientFilterBuilderProps {
  value: RecipientCriteria;
  onChange: (criteria: RecipientCriteria) => void;
  className?: string;
}

type FilterType = "tags" | "statuses" | "customerTypes";

interface FilterRow {
  id: string;
  type: FilterType;
  values: string[];
}

// ============================================================================
// FILTER TYPE CONFIG
// ============================================================================

const FILTER_TYPE_CONFIG: Record<
  FilterType,
  {
    label: string;
    icon: typeof Tag;
    placeholder: string;
    options: { value: string; label: string }[];
  }
> = {
  tags: {
    label: "Customer Tags",
    icon: Tag,
    placeholder: "Enter tag...",
    options: [
      { value: "vip", label: "VIP" },
      { value: "priority", label: "Priority" },
      { value: "new", label: "New Customer" },
      { value: "returning", label: "Returning" },
      { value: "wholesale", label: "Wholesale" },
      { value: "retail", label: "Retail" },
    ],
  },
  statuses: {
    label: "Customer Status",
    icon: UserCheck,
    placeholder: "Select status...",
    options: [
      { value: "lead", label: "Lead" },
      { value: "prospect", label: "Prospect" },
      { value: "customer", label: "Customer" },
      { value: "inactive", label: "Inactive" },
      { value: "churned", label: "Churned" },
    ],
  },
  customerTypes: {
    label: "Customer Type",
    icon: Building2,
    placeholder: "Select type...",
    options: [
      { value: "individual", label: "Individual" },
      { value: "business", label: "Business" },
      { value: "enterprise", label: "Enterprise" },
      { value: "government", label: "Government" },
      { value: "nonprofit", label: "Nonprofit" },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function criteriaToRows(criteria: RecipientCriteria): FilterRow[] {
  const rows: FilterRow[] = [];

  if (criteria.tags && criteria.tags.length > 0) {
    rows.push({ id: generateId(), type: "tags", values: criteria.tags });
  }
  if (criteria.statuses && criteria.statuses.length > 0) {
    rows.push({ id: generateId(), type: "statuses", values: criteria.statuses });
  }
  if (criteria.customerTypes && criteria.customerTypes.length > 0) {
    rows.push({ id: generateId(), type: "customerTypes", values: criteria.customerTypes });
  }

  return rows;
}

function rowsToCriteria(rows: FilterRow[]): RecipientCriteria {
  const criteria: RecipientCriteria = {};

  for (const row of rows) {
    if (row.values.length > 0) {
      criteria[row.type] = row.values;
    }
  }

  return criteria;
}

// ============================================================================
// FILTER ROW COMPONENT
// ============================================================================

function FilterRowComponent({
  row,
  onChange,
  onRemove,
  usedTypes,
}: {
  row: FilterRow;
  onChange: (row: FilterRow) => void;
  onRemove: () => void;
  usedTypes: Set<FilterType>;
}) {
  const config = FILTER_TYPE_CONFIG[row.type];
  const [inputValue, setInputValue] = useState("");

  const handleAddValue = (value: string) => {
    if (value && !row.values.includes(value)) {
      onChange({ ...row, values: [...row.values, value] });
    }
    setInputValue("");
  };

  const handleRemoveValue = (value: string) => {
    onChange({ ...row, values: row.values.filter((v) => v !== value) });
  };

  const handleTypeChange = (newType: FilterType) => {
    onChange({ ...row, type: newType, values: [] });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAddValue(inputValue.trim());
    }
  };

  // Available filter types (exclude already used ones, except current)
  const availableTypes = (Object.keys(FILTER_TYPE_CONFIG) as FilterType[]).filter(
    (type) => type === row.type || !usedTypes.has(type)
  );

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30"
      role="group"
      aria-label={`Filter by ${config.label}`}
    >
      <div className="flex items-center gap-2">
        <Select value={row.type} onValueChange={(v) => handleTypeChange(v as FilterType)}>
          <SelectTrigger className="w-[180px]" aria-label="Filter type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((type) => {
              const typeConfig = FILTER_TYPE_CONFIG[type];
              const TypeIcon = typeConfig.icon;
              return (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4" />
                    {typeConfig.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">includes</span>

        {row.type === "tags" ? (
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            className="flex-1 max-w-[200px]"
            aria-label="Add tag value"
          />
        ) : (
          <Select onValueChange={handleAddValue}>
            <SelectTrigger className="flex-1 max-w-[200px]" aria-label="Select value">
              <SelectValue placeholder={config.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {config.options
                .filter((opt) => !row.values.includes(opt.value))
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="shrink-0"
          aria-label="Remove filter"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected Values */}
      {row.values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1" role="list" aria-label="Selected values">
          {row.values.map((value) => {
            const option = config.options.find((o) => o.value === value);
            return (
              <Badge
                key={value}
                variant="secondary"
                className="gap-1 pr-1"
                role="listitem"
              >
                {option?.label ?? value}
                <button
                  type="button"
                  onClick={() => handleRemoveValue(value)}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label={`Remove ${option?.label ?? value}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RecipientFilterBuilder({
  value,
  onChange,
  className,
}: RecipientFilterBuilderProps) {
  const [rows, setRows] = useState<FilterRow[]>(() => criteriaToRows(value));

  const updateCriteria = useCallback(
    (newRows: FilterRow[]) => {
      setRows(newRows);
      onChange(rowsToCriteria(newRows));
    },
    [onChange]
  );

  const handleAddRow = () => {
    const usedTypes = new Set(rows.map((r) => r.type));
    const availableTypes = (Object.keys(FILTER_TYPE_CONFIG) as FilterType[]).filter(
      (type) => !usedTypes.has(type)
    );

    if (availableTypes.length === 0) return;

    const newRow: FilterRow = {
      id: generateId(),
      type: availableTypes[0],
      values: [],
    };
    updateCriteria([...rows, newRow]);
  };

  const handleRowChange = (index: number, row: FilterRow) => {
    const newRows = [...rows];
    newRows[index] = row;
    updateCriteria(newRows);
  };

  const handleRowRemove = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    updateCriteria(newRows);
  };

  const usedTypes = new Set(rows.map((r) => r.type));
  const canAddMore = usedTypes.size < Object.keys(FILTER_TYPE_CONFIG).length;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Recipient Filters
        </CardTitle>
        <CardDescription>
          Add filters to target specific contacts. Leave empty to include all contacts with email addresses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No filters applied - all contacts will be included</p>
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Active filters">
            {rows.map((row, index) => (
              <FilterRowComponent
                key={row.id}
                row={row}
                onChange={(r) => handleRowChange(index, r)}
                onRemove={() => handleRowRemove(index)}
                usedTypes={usedTypes}
              />
            ))}
          </div>
        )}

        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddRow}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        )}

        {/* Summary */}
        {rows.length > 0 && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            Contacts matching{" "}
            {rows.length === 1
              ? "this filter"
              : `all ${rows.length} filters (AND)`}{" "}
            will be included.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
