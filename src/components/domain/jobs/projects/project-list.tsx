/**
 * ProjectListGrid Component
 *
 * Grid view for project lists. The table view has been migrated to:
 * - projects-table-presenter.tsx (desktop table)
 * - projects-mobile-cards.tsx (mobile cards)
 * - projects-list-presenter.tsx (unified presenter)
 *
 * SPRINT-03: New components for project-centric jobs model
 */

import { Folder, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectCard } from './project-card';
import type { Project } from 'drizzle/schema/jobs/projects';

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
