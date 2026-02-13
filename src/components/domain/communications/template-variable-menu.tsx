/**
 * Template Variable Menu Component
 *
 * Popover menu for inserting template variables into email content.
 *
 * @see DOM-COMMS-007
 */

"use client";

import * as React from "react";
import { Variable, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { TEMPLATE_VARIABLES } from "@/lib/communications/template-variables";
import type {
  TemplateVariable,
  TemplateVariableMenuProps,
} from "@/lib/schemas/communications";

// ============================================================================
// TYPES
// ============================================================================

// TemplateVariableMenuProps imported from schemas

// ============================================================================
// CATEGORY LABELS
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  customer: "Customer",
  quote: "Quote",
  order: "Order",
  installation: "Installation",
  support: "Support",
  general: "General",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplateVariableMenu({
  onInsert,
  categories = Object.keys(TEMPLATE_VARIABLES),
  className,
}: TemplateVariableMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  // Filter variables by search
  const filteredCategories = React.useMemo(() => {
    if (!search) {
      return categories.reduce(
        (acc, category) => {
          if (TEMPLATE_VARIABLES[category]) {
            acc[category] = TEMPLATE_VARIABLES[category];
          }
          return acc;
        },
        {} as Record<string, TemplateVariable[]>
      );
    }

    const searchLower = search.toLowerCase();
    return categories.reduce(
      (acc, category) => {
        const variables = TEMPLATE_VARIABLES[category]?.filter(
          (v) =>
            v.name.toLowerCase().includes(searchLower) ||
            v.description.toLowerCase().includes(searchLower)
        );
        if (variables?.length) {
          acc[category] = variables;
        }
        return acc;
      },
      {} as Record<string, TemplateVariable[]>
    );
  }, [categories, search]);

  const handleInsert = (variable: TemplateVariable) => {
    onInsert(`{{${variable.name}}}`);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, variable: TemplateVariable) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleInsert(variable);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          aria-label="Insert variable"
        >
          <Variable className="h-4 w-4" />
          Insert Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="start"
        aria-label="variable-toolbar"
      >
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
              aria-label="Search variables"
            />
          </div>
        </div>

        {/* Variable List */}
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {Object.keys(filteredCategories).length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No variables found
              </div>
            ) : (
              Object.entries(filteredCategories).map(([category, variables]) => (
                <div key={category} className="mb-2">
                  {/* Category Header */}
                  <button
                    type="button"
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium rounded-md hover:bg-muted",
                      expandedCategory === category && "bg-muted"
                    )}
                    onClick={() =>
                      setExpandedCategory(
                        expandedCategory === category ? null : category
                      )
                    }
                    aria-expanded={expandedCategory === category}
                  >
                    <span>{CATEGORY_LABELS[category] || category}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedCategory === category && "rotate-90"
                      )}
                    />
                  </button>

                  {/* Variables */}
                  {(expandedCategory === category || search) && (
                    <div className="ml-2 mt-1 space-y-1">
                      {variables.map((variable) => (
                        <button
                          key={variable.name}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent focus:bg-accent focus:outline-none"
                          onClick={() => handleInsert(variable)}
                          onKeyDown={(e) => handleKeyDown(e, variable)}
                          tabIndex={0}
                        >
                          <div className="font-mono text-xs text-primary">
                            {`{{${variable.name}}}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Quick Insert Tip */}
        <div className="p-2 border-t text-xs text-muted-foreground">
          Click or press Enter to insert
        </div>
      </PopoverContent>
    </Popover>
  );
}
