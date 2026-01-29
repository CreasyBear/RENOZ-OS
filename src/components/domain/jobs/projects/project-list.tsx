/**
 * ProjectList Components
 *
 * Grid and table views for project lists.
 *
 * SPRINT-03: New components for project-centric jobs model
 */


import { Folder, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from './project-card';
import type { Project } from 'drizzle/schema/jobs/projects';
import type { ProjectStatus, ProjectPriority } from '@/lib/schemas/jobs/projects';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectListGridProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  className?: string;
}

export interface ProjectListTableProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  className?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

// ============================================================================
// STATUS & PRIORITY HELPERS
// ============================================================================

function getStatusBadge(status: ProjectStatus) {
  const variants: Record<ProjectStatus, string> = {
    quoting: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-teal-100 text-teal-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    on_hold: 'bg-orange-100 text-orange-800',
  };
  return variants[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityBadge(priority: ProjectPriority) {
  const variants: Record<ProjectPriority, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };
  return variants[priority] || 'bg-gray-100 text-gray-800';
}

function formatStatus(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ============================================================================
// GRID VIEW
// ============================================================================

export function ProjectListGrid({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  className,
}: ProjectListGridProps) {
  if (projects.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">No projects</h3>
        <p className="text-muted-foreground">Get started by creating a new project.</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          variant="board"
          onClick={() => onProjectClick?.(project)}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditProject?.(project)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDeleteProject?.(project)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      ))}
    </div>
  );
}

// ============================================================================
// TABLE VIEW
// ============================================================================

export function ProjectListTable({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  className,
  sortColumn,
  sortDirection,
  onSort,
}: ProjectListTableProps) {
  if (projects.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">No projects</h3>
        <p className="text-muted-foreground">Get started by creating a new project.</p>
      </div>
    );
  }

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSort?.(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <ArrowUpDown className={cn('h-3 w-3', sortDirection === 'desc' && 'rotate-180')} />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader column="title">Project</SortableHeader>
            <SortableHeader column="status">Status</SortableHeader>
            <SortableHeader column="priority">Priority</SortableHeader>
            <TableHead>Type</TableHead>
            <SortableHeader column="targetCompletionDate">Due Date</SortableHeader>
            <TableHead>Progress</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="cursor-pointer"
              onClick={() => onProjectClick?.(project)}
            >
              <TableCell>
                <div>
                  <p className="font-medium">{project.title}</p>
                  <p className="text-xs text-muted-foreground">{project.projectNumber}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusBadge(project.status)}>
                  {formatStatus(project.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityBadge(project.priority)}>
                  {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">
                {project.projectType.replace('_', ' ')}
              </TableCell>
              <TableCell>
                {project.targetCompletionDate
                  ? new Date(project.targetCompletionDate).toLocaleDateString()
                  : '—'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        project.progressPercent === 100 ? 'bg-green-500' : 'bg-primary'
                      )}
                      style={{ width: `${project.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">
                    {project.progressPercent}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditProject?.(project)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteProject?.(project)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
