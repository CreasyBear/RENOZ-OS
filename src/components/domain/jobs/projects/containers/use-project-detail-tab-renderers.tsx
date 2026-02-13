/**
 * Project Detail Tab Renderers Hook
 *
 * Extracts tab render logic from project-detail-container for single responsibility.
 * Returns render functions for each tab.
 *
 * @see STANDARDS.md §2 single responsibility
 */

import { useCallback, useState } from 'react';
import {
  ProjectOverviewTab,
  ProjectWorkstreamsTab,
  ProjectVisitsTab,
  ProjectTasksTab,
  ProjectBomTab,
  ProjectNotesTab,
  ProjectFilesTab,
} from '../project-detail-tabs';
import { ProjectDocumentsTab } from '../tabs';
import type { ProjectDetailData } from '@/hooks/jobs';
import { transformProjectForTabs } from '@/lib/schemas/jobs/project-detail';
import type { ProjectTabVisit } from '@/lib/schemas/jobs/project-detail';

export interface UseProjectDetailTabRenderersParams {
  project: ProjectDetailData | null;
  siteVisits: ProjectTabVisit[];
  /** Project tasks for Overview Gantt (from useProjectDetail) */
  tasks?: unknown[];
  /** Workstream id->name for Gantt task labels */
  workstreamNames?: Record<string, string>;
  /** Called when user drags/resizes a Gantt bar. Enables persistence. */
  onGanttDateChange?: (taskId: string, visitId: string | undefined, isTask: boolean, startDate: Date, endDate: Date) => void;
  onGenerateWorkOrder: () => Promise<void>;
  onGenerateCompletionCertificate: () => Promise<void>;
  isGeneratingWorkOrder: boolean;
  isGeneratingCompletionCertificate: boolean;
  /** Open completion dialog (for "All tasks done" CTA in Tasks tab) */
  onCompleteProjectClick?: () => void;
}

export interface ProjectDetailTabRenderers {
  renderOverviewTab: () => React.ReactNode;
  renderWorkstreamsTab: () => React.ReactNode;
  renderVisitsTab: () => React.ReactNode;
  renderTasksTab: () => React.ReactNode;
  renderBomTab: () => React.ReactNode;
  renderNotesTab: () => React.ReactNode;
  renderFilesTab: () => React.ReactNode;
  renderDocumentsTab: () => React.ReactNode;
  siteVisitCreateOpen: boolean;
  setSiteVisitCreateOpen: (open: boolean) => void;
}

export function useProjectDetailTabRenderers({
  project,
  siteVisits,
  tasks = [],
  workstreamNames,
  onGanttDateChange,
  onGenerateWorkOrder,
  onGenerateCompletionCertificate,
  isGeneratingWorkOrder,
  isGeneratingCompletionCertificate,
  onCompleteProjectClick,
}: UseProjectDetailTabRenderersParams): ProjectDetailTabRenderers {
  const [siteVisitCreateOpen, setSiteVisitCreateOpen] = useState(false);

  const renderOverviewTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectOverviewTab
        project={transformProjectForTabs(project)}
        visits={siteVisits ?? []}
        tasks={tasks}
        workstreamNames={workstreamNames}
        onDateChange={onGanttDateChange}
      />
    );
  }, [project, siteVisits, tasks, workstreamNames, onGanttDateChange]);

  const renderWorkstreamsTab = useCallback(() => {
    if (!project) return null;
    return <ProjectWorkstreamsTab project={transformProjectForTabs(project)} />;
  }, [project]);

  const renderVisitsTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectVisitsTab
        project={transformProjectForTabs(project)}
        visits={siteVisits ?? []}
        onScheduleVisit={() => setSiteVisitCreateOpen(true)}
      />
    );
  }, [project, siteVisits]);

  const renderTasksTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectTasksTab
        project={transformProjectForTabs(project)}
        onCompleteProjectClick={onCompleteProjectClick}
      />
    );
  }, [project, onCompleteProjectClick]);

  const renderBomTab = useCallback(() => {
    if (!project) return null;
    return <ProjectBomTab project={transformProjectForTabs(project)} />;
  }, [project]);

  const renderNotesTab = useCallback(() => {
    if (!project) return null;
    return <ProjectNotesTab project={transformProjectForTabs(project)} />;
  }, [project]);

  const renderFilesTab = useCallback(() => {
    if (!project) return null;
    return <ProjectFilesTab project={transformProjectForTabs(project)} />;
  }, [project]);

  const renderDocumentsTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectDocumentsTab
        projectId={project.id}
        projectStatus={project.status}
        documentActions={{
          onGenerateWorkOrder,
          onGenerateCompletionCertificate,
          isGeneratingWorkOrder,
          isGeneratingCompletionCertificate,
        }}
      />
    );
  }, [
    project,
    onGenerateWorkOrder,
    onGenerateCompletionCertificate,
    isGeneratingWorkOrder,
    isGeneratingCompletionCertificate,
  ]);

  return {
    renderOverviewTab,
    renderWorkstreamsTab,
    renderVisitsTab,
    renderTasksTab,
    renderBomTab,
    renderNotesTab,
    renderFilesTab,
    renderDocumentsTab,
    siteVisitCreateOpen,
    setSiteVisitCreateOpen,
  };
}
