/**
 * QuoteVersionHistory Component
 *
 * Displays quote version history with comparison/diff view.
 * Allows restoring previous versions.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUOTE-BUILDER-UI)
 */

import { memo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  History,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import {
  listQuoteVersions,
  restoreQuoteVersion,
  compareQuoteVersions,
} from "@/server/functions/quote-versions";
import { formatCurrency } from "@/lib/formatters";
import { FormatAmount } from "@/components/shared/format";
import type { QuoteVersion } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteVersionHistoryProps {
  opportunityId: string;
  currentVersionId?: string;
  onRestore?: (version: QuoteVersion) => void;
  onSelectVersion?: (version: QuoteVersion) => void;
  className?: string;
}

interface ComparisonResult {
  version1: QuoteVersion;
  version2: QuoteVersion;
  differences: {
    subtotal: number;
    taxAmount: number;
    total: number;
    itemCount: number;
    subtotalPercent: number;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const QuoteVersionHistory = memo(function QuoteVersionHistory({
  opportunityId,
  currentVersionId,
  onRestore,
  onSelectVersion,
  className,
}: QuoteVersionHistoryProps) {
  const queryClient = useQueryClient();
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [compareFrom, setCompareFrom] = useState<string | null>(null);
  const [compareTo, setCompareTo] = useState<string | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<QuoteVersion | null>(null);

  // Fetch version history
  const { data, isLoading, error } = useQuery({
    queryKey: ["quote-versions", opportunityId],
    queryFn: async () => {
      const result = await listQuoteVersions({
        data: { opportunityId },
      });
      return result;
    },
  });

  // Compare versions query
  const compareQuery = useQuery({
    queryKey: ["quote-compare", compareFrom, compareTo],
    queryFn: async () => {
      if (!compareFrom || !compareTo) return null;
      const result = await compareQuoteVersions({
        data: { version1Id: compareFrom, version2Id: compareTo },
      });
      return result as ComparisonResult;
    },
    enabled: !!compareFrom && !!compareTo,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (sourceVersionId: string) => {
      return restoreQuoteVersion({
        data: {
          opportunityId,
          sourceVersionId,
        },
      });
    },
    onSuccess: (data) => {
      toastSuccess(`Restored to v${data.restoredFrom} as new v${data.quoteVersion.versionNumber}`);
      setRestoreDialogOpen(false);
      setVersionToRestore(null);
      queryClient.invalidateQueries({ queryKey: ["quote-versions", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      onRestore?.(data.quoteVersion);
    },
    onError: () => {
      toastError("Failed to restore quote version");
    },
  });

  // Format relative time
  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  // Render change indicator
  const renderChangeIndicator = (diff: number, isPercent = false) => {
    if (diff === 0) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (diff > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <TrendingUp className="h-4 w-4 mr-1" />
          +{isPercent ? `${diff.toFixed(1)}%` : formatCurrency(diff)}
        </span>
      );
    }
    return (
      <span className="flex items-center text-red-600 text-sm">
        <TrendingDown className="h-4 w-4 mr-1" />
        {isPercent ? `${diff.toFixed(1)}%` : formatCurrency(diff)}
      </span>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load version history.
          </p>
        </CardContent>
      </Card>
    );
  }

  const versions = data?.versions ?? [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
        <CardDescription>
          {versions.length} version{versions.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Compare selector */}
        {versions.length >= 2 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Compare:</span>
            <Select value={compareFrom ?? ""} onValueChange={setCompareFrom}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.versionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Select value={compareTo ?? ""} onValueChange={setCompareTo}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.versionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Comparison result */}
        {compareQuery.data && (
          <div className="p-3 bg-muted/30 rounded-lg space-y-2">
            <h4 className="text-sm font-medium">
              v{compareQuery.data.version1.versionNumber} → v{compareQuery.data.version2.versionNumber}
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                {renderChangeIndicator(compareQuery.data.differences.subtotal)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">GST</span>
                {renderChangeIndicator(compareQuery.data.differences.taxAmount)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                {renderChangeIndicator(compareQuery.data.differences.total)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {compareQuery.data.differences.itemCount !== 0 && (
                <span>
                  {compareQuery.data.differences.itemCount > 0 ? "+" : ""}
                  {compareQuery.data.differences.itemCount} line item(s)
                </span>
              )}
              {compareQuery.data.differences.subtotalPercent !== 0 && (
                <span className="ml-2">
                  ({compareQuery.data.differences.subtotalPercent > 0 ? "+" : ""}
                  {compareQuery.data.differences.subtotalPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Version list */}
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No quote versions yet. Create your first quote!
          </p>
        ) : (
          <div className="space-y-2">
            {versions.map((version, index) => {
              const isCurrent = version.id === currentVersionId;
              const isLatest = index === 0;
              const isExpanded = expandedVersion === version.id;

              return (
                <Collapsible
                  key={version.id}
                  open={isExpanded}
                  onOpenChange={() =>
                    setExpandedVersion(isExpanded ? null : version.id)
                  }
                >
                  <div
                    className={cn(
                      "border rounded-lg overflow-hidden",
                      isCurrent && "border-primary"
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                v{version.versionNumber}
                              </span>
                              {isLatest && (
                                <Badge variant="secondary" className="text-xs">
                                  Latest
                                </Badge>
                              )}
                              {isCurrent && (
                                <Badge className="text-xs">Current</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatRelativeTime(version.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            <FormatAmount amount={version.total} cents={true} />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {version.items.length} item(s)
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t p-3 bg-muted/30 space-y-3">
                        {/* Line items preview */}
                        <div className="space-y-1">
                          {version.items.slice(0, 3).map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm"
                            >
                              <TruncateTooltip
                                text={item.description}
                                className="max-w-[60%]"
                              />
                              <span className="text-muted-foreground">
                                {item.quantity} × <FormatAmount amount={item.unitPriceCents} cents={true} />
                              </span>
                            </div>
                          ))}
                          {version.items.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{version.items.length - 3} more item(s)
                            </div>
                          )}
                        </div>

                        {/* Totals */}
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span>Subtotal</span>
                          <span><FormatAmount amount={version.subtotal} cents={true} /></span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>GST (10%)</span>
                          <span><FormatAmount amount={version.taxAmount} cents={true} /></span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span><FormatAmount amount={version.total} cents={true} /></span>
                        </div>

                        {version.notes && (
                          <div className="text-sm text-muted-foreground italic pt-2 border-t">
                            {version.notes}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {onSelectVersion && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectVersion(version)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          )}
                          {!isLatest && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVersionToRestore(version);
                                setRestoreDialogOpen(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Restore confirmation dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Quote Version</DialogTitle>
            <DialogDescription>
              This will create a new version based on v{versionToRestore?.versionNumber}.
              The current version will not be modified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>Restore from:</strong> v{versionToRestore?.versionNumber} -{" "}
              <FormatAmount amount={versionToRestore?.total ?? 0} cents={true} />
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                versionToRestore && restoreMutation.mutate(versionToRestore.id)
              }
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

export default QuoteVersionHistory;
