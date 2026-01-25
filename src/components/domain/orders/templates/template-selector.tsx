/**
 * TemplateSelector Component
 *
 * Compact template selection for order creation flows.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-TEMPLATES-UI)
 */

import { memo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Search, FileText, Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { listTemplates, getTemplate } from "@/lib/server/functions/order-templates";

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  selectedTemplateId?: string | null;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TemplateSelector = memo(function TemplateSelector({
  onSelect,
  selectedTemplateId,
  className,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch templates
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orders.templates(debouncedSearch),
    queryFn: () =>
      listTemplates({
        data: {
          search: debouncedSearch || undefined,
          isActive: true,
          page: 1,
          pageSize: 20,
          sortBy: "usageCount",
          sortOrder: "desc",
        },
      }),
    enabled: open,
  });

  // Fetch selected template details
  const { data: selectedTemplate } = useQuery({
    queryKey: queryKeys.orders.templateDetail(selectedTemplateId ?? ""),
    queryFn: () =>
      selectedTemplateId
        ? getTemplate({ data: { id: selectedTemplateId } })
        : null,
    enabled: !!selectedTemplateId,
  });

  const templates = data?.templates ?? [];

  const handleSelect = useCallback(
    (templateId: string) => {
      onSelect(templateId);
      setOpen(false);
    },
    [onSelect]
  );

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start"
          >
            <FileText className="h-4 w-4 mr-2 shrink-0" />
            {selectedTemplate ? (
              <span>
                <TruncateTooltip text={selectedTemplate.name} maxLength={35} />
              </span>
            ) : (
              <span className="text-muted-foreground">
                Select from templates...
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {search
                  ? "No templates found."
                  : "No templates available. Create one first."}
              </div>
            ) : (
              <div className="p-1">
                {templates.map((template) => {
                  const metadata = template.metadata as Record<
                    string,
                    unknown
                  > | null;
                  const usageCount = (metadata?.usageCount as number) ?? 0;
                  const isSelected = template.id === selectedTemplateId;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template.id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors",
                        "hover:bg-muted/50",
                        isSelected && "bg-muted"
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            <TruncateTooltip text={template.name} maxLength={30} />
                          </p>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground">
                            <TruncateTooltip text={template.description} maxLength={45} />
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            {usageCount} uses
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <Card className="mt-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{selectedTemplate.name}</CardTitle>
            {selectedTemplate.description && (
              <CardDescription className="text-xs">
                {selectedTemplate.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              <p>{selectedTemplate.items.length} items in this template</p>
              {selectedTemplate.defaultValues?.shippingAmount !== undefined && (
                <p className="mt-1">
                  Includes ${(selectedTemplate.defaultValues.shippingAmount / 100).toFixed(2)} shipping
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default TemplateSelector;
