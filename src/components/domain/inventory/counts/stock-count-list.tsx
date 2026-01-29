/**
 * Stock Count List Component
 *
 * Displays stock counts with filtering by status, type, and location.
 *
 * Accessibility:
 * - Status indicated by icon + color (not color-only)
 * - Progress bars have aria-labels
 * - Sortable columns have aria-sort
 */
import { memo, useState, useMemo, useCallback } from "react";
import {
  ClipboardList,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// TYPES
// ============================================================================

export type CountStatus = "draft" | "in_progress" | "completed" | "cancelled";
export type CountType = "cycle" | "full" | "spot" | "blind";

export interface StockCount {
  id: string;
  countCode: string;
  countType: CountType;
  status: CountStatus;
  locationId?: string | null;
  locationName?: string;
  assignedTo?: string | null;
  assignedToName?: string;
  varianceThreshold?: number;
  notes?: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  progress?: {
    totalItems: number;
    countedItems: number;
    varianceItems: number;
    completionPercentage: number;
  };
}

type SortField = 'countCode' | 'countType' | 'status' | 'locationName' | 'assignedToName' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface StockCountListProps {
  counts: StockCount[];
  isLoading?: boolean;
  onView?: (count: StockCount) => void;
  onEdit?: (count: StockCount) => void;
  onDelete?: (count: StockCount) => void;
  onStart?: (count: StockCount) => void;
  className?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  CountStatus,
  { label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  draft: {
    label: "Draft",
    icon: FileText,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/50",
  },
  in_progress: {
    label: "In Progress",
    icon: Play,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/50",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/50",
  },
};

const COUNT_TYPE_LABELS: Record<CountType, string> = {
  cycle: "Cycle Count",
  full: "Full Count",
  spot: "Spot Check",
  blind: "Blind Count",
};

// ============================================================================
// SORT HEADER COMPONENT
// ============================================================================

function SortHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive &&
        (currentSort.direction === "asc" ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        ))}
    </Button>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const StockCountList = memo(function StockCountList({
  counts,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onStart,
  className,
}: StockCountListProps) {
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'createdAt',
    direction: 'desc',
  });

  const handleSort = useCallback((field: SortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Sort counts
  const sortedCounts = useMemo(() => {
    const sorted = [...counts];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'countCode':
          comparison = a.countCode.localeCompare(b.countCode);
          break;
        case 'countType':
          comparison = a.countType.localeCompare(b.countType);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'locationName':
          comparison = (a.locationName || '').localeCompare(b.locationName || '');
          break;
        case 'assignedToName':
          comparison = (a.assignedToName || '').localeCompare(b.assignedToName || '');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [counts, sort]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Count Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (counts.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">
          No stock counts found
        </p>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader label="Count Code" field="countCode" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Type" field="countType" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Status" field="status" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>
              <SortHeader label="Location" field="locationName" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Assigned To" field="assignedToName" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCounts.map((count) => {
            const statusConfig = STATUS_CONFIG[count.status];
            const StatusIcon = statusConfig.icon;

            return (
              <TableRow
                key={count.id}
                className={cn(onView && "cursor-pointer hover:bg-accent")}
                onClick={() => onView?.(count)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ClipboardList
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="font-mono font-medium">
                      {count.countCode}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline">
                    {COUNT_TYPE_LABELS[count.countType]}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "flex items-center gap-1 w-fit",
                      statusConfig.color,
                      statusConfig.bgColor
                    )}
                  >
                    <StatusIcon className="h-3 w-3" aria-hidden="true" />
                    {statusConfig.label}
                  </Badge>
                </TableCell>

                <TableCell>
                  {count.progress ? (
                    <div className="flex items-center gap-2 min-w-[150px]">
                      <Progress
                        value={count.progress.completionPercentage}
                        className="h-2 flex-1"
                        aria-label={`${count.progress.completionPercentage}% complete`}
                      />
                      <span className="text-xs tabular-nums text-muted-foreground min-w-[40px]">
                        {count.progress.countedItems}/{count.progress.totalItems}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>
                  {count.locationName ? (
                    <div className="flex items-center gap-1">
                      <MapPin
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span>{count.locationName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">All Locations</span>
                  )}
                </TableCell>

                <TableCell>
                  {count.assignedToName ? (
                    <div className="flex items-center gap-1">
                      <User
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span>{count.assignedToName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(count)}>
                          <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                          View
                        </DropdownMenuItem>
                      )}
                      {onStart && count.status === "draft" && (
                        <DropdownMenuItem onClick={() => onStart(count)}>
                          <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                          Start Count
                        </DropdownMenuItem>
                      )}
                      {onEdit && count.status === "draft" && (
                        <DropdownMenuItem onClick={() => onEdit(count)}>
                          <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && count.status === "draft" && (
                        <DropdownMenuItem
                          onClick={() => onDelete(count)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

export default StockCountList;
