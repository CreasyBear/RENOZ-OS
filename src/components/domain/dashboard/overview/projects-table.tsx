/**
 * Projects Table (Dashboard Overview)
 *
 * Compact table showing active projects for dashboard overview.
 * Links to full project detail view.
 *
 * Uses shared StatusCell with PROJECT_STATUS_CONFIG per BADGE-STATUS-STANDARDS.md
 */

import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusCell } from '@/components/shared/data-table/cells/status-cell';
import { PROJECT_STATUS_CONFIG } from '@/components/domain/jobs/projects/project-status-config';
import { Briefcase, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/lib/schemas/jobs/projects';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectSummary {
  id: string;
  name: string;
  customerName: string;
  status: ProjectStatus;
  progress: number; // 0-100
  updatedAt: string | Date;
}

export interface ProjectsTableProps {
  projects?: ProjectSummary[] | null;
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ProjectsTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function ProjectsTableEmpty({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Briefcase className="size-5 text-muted-foreground" />
          Projects
        </CardTitle>
        <Link
          to="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
        No active projects
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectsTable({ projects, isLoading, maxItems = 5, className }: ProjectsTableProps) {
  if (isLoading) {
    return <ProjectsTableSkeleton className={className} />;
  }

  if (!projects || projects.length === 0) {
    return <ProjectsTableEmpty className={className} />;
  }

  const displayProjects = projects.slice(0, maxItems);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Briefcase className="size-5 text-muted-foreground" />
          <span className="text-muted-foreground">Projects</span>
        </CardTitle>
        <Link
          to="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-medium">Project</TableHead>
              <TableHead className="font-medium hidden sm:table-cell">Progress</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayProjects.map((project) => (
              <TableRow key={project.id} className="group">
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium truncate max-w-[200px]">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {project.customerName}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{project.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusCell
                    status={project.status}
                    statusConfig={PROJECT_STATUS_CONFIG}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="size-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {projects.length > maxItems && (
          <div className="border-t p-2 text-center">
            <Link
              to="/projects"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              +{projects.length - maxItems} more projects
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
