/**
 * Projects Mobile Cards Component
 *
 * Mobile-optimized card layout for projects table view.
 */

import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { StatusCell } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import type { ProjectTableItem } from "./project-columns";
import {
  PROJECT_STATUS_CONFIG,
  PROJECT_PRIORITY_CONFIG,
  formatTargetDateRelative,
  formatProjectType,
} from "./project-status-config";

export interface ProjectsMobileCardsProps {
  /** Projects to display */
  projects: ProjectTableItem[];
  /** Set of selected project IDs */
  selectedIds: Set<string>;
  /** Handle selection toggle */
  onSelect: (id: string, checked: boolean) => void;
  /** @deprecated Use Link for navigation - kept for API compatibility */
  onViewProject?: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Progress bar component for mobile cards
 */
function MobileProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value === 100 ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8">
        {value}%
      </span>
    </div>
  );
}

/**
 * Mobile card layout for projects table view.
 * Each card is tappable to view project details.
 */
export const ProjectsMobileCards = memo(function ProjectsMobileCards({
  projects,
  selectedIds,
  className,
}: ProjectsMobileCardsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {projects.map((project) => {
        const isSelected = selectedIds.has(project.id);
        const { text: dueText, isOverdue } = formatTargetDateRelative(
          project.targetCompletionDate,
          project.status
        );

        return (
          <Link
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
          >
            <Card
              tabIndex={0}
              role="article"
              aria-label={`View project ${project.projectNumber}`}
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected && "bg-muted/50 ring-1 ring-primary"
              )}
            >
              <CardContent className="p-4">
                {/* Header row: Title + Status */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium truncate">{project.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{project.projectNumber}</span>
                      <span>·</span>
                      <span className="capitalize">
                        {formatProjectType(project.projectType)}
                      </span>
                    </div>
                  </div>
                  <StatusCell
                    status={project.status}
                    statusConfig={PROJECT_STATUS_CONFIG}
                    showIcon
                  />
              </div>

              {/* Middle row: Priority + Due Date */}
              <div className="flex items-center justify-between mb-3">
                <StatusCell
                  status={project.priority}
                  statusConfig={PROJECT_PRIORITY_CONFIG}
                  className="text-xs"
                />
                {project.targetCompletionDate && (
                  <span
                    className={cn(
                      "text-xs",
                      isOverdue && "text-destructive font-medium"
                    )}
                  >
                    Due {dueText}
                  </span>
                )}
              </div>

              {/* Footer row: Progress */}
              <MobileProgressBar value={project.progressPercent} />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
});

ProjectsMobileCards.displayName = "ProjectsMobileCards";
