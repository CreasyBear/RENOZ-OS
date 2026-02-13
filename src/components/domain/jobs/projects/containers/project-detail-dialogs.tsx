/**
 * Project Detail Dialogs
 *
 * Extracted dialog components for project detail container.
 * Keeps the main container lean.
 *
 * @see STANDARDS.md §2 single responsibility
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EntityActivityLogger } from '@/components/shared/activity';
import type { EntityActivityLoggerProps } from '@/hooks/activities/use-entity-activity-logging';
import {
  ProjectCompletionDialog,
  ProjectEditDialog,
  SiteVisitCreateDialog,
} from '../';
import { toProjectEditFormInput } from '@/lib/schemas/jobs';
import type { CompletionValidation } from '@/lib/schemas/jobs/projects';
import type { ProjectDetailData } from '@/lib/schemas/jobs/project-detail';

export interface ProjectDetailDialogsProps {
  projectId: string;
  project: ProjectDetailData | null;
  /** Activity logger props from useEntityActivityLogging */
  activityLoggerProps: EntityActivityLoggerProps;
  /** Site visit create */
  siteVisitCreateOpen: boolean;
  setSiteVisitCreateOpen: (open: boolean) => void;
  /** Delete */
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  onDelete: () => Promise<void>;
  /** Completion */
  completionDialogOpen: boolean;
  setCompletionDialogOpen: (open: boolean) => void;
  completionValidation: CompletionValidation | undefined;
  /** Edit */
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
}

export function ProjectDetailDialogs({
  projectId,
  project,
  activityLoggerProps,
  siteVisitCreateOpen,
  setSiteVisitCreateOpen,
  deleteDialogOpen,
  setDeleteDialogOpen,
  onDelete,
  completionDialogOpen,
  setCompletionDialogOpen,
  completionValidation,
  editDialogOpen,
  setEditDialogOpen,
}: ProjectDetailDialogsProps) {
  return (
    <>
      {project && <EntityActivityLogger {...activityLoggerProps} />}

      <SiteVisitCreateDialog
        open={siteVisitCreateOpen}
        onOpenChange={setSiteVisitCreateOpen}
        projectId={projectId}
        onSuccess={() => {}}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project {project?.projectNumber}? This action
              cannot be undone and will delete all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectCompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        projectId={projectId}
        projectTitle={project?.title ?? ''}
        completionValidation={completionValidation}
        estimatedTotalValue={
          project?.estimatedTotalValue
            ? parseFloat(String(project.estimatedTotalValue))
            : undefined
        }
        onSuccess={() => {}}
      />

      <ProjectEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project ? toProjectEditFormInput(project) : null}
        onSuccess={() => {}}
      />
    </>
  );
}
