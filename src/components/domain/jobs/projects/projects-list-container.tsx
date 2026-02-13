'use client';

/**
 * Projects List Container
 *
 * Handles data fetching, selection state, bulk actions, and mutations
 * for the projects list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout.
 *
 * @source projects from useProjects hook
 * @source selection from useTableSelection hook
 * @source deleteProject from useDeleteProject hook
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import { useProjects, useDeleteProject } from "@/hooks/jobs";
import { useTableSelection, BulkActionsBar } from "@/components/shared/data-table";
import type {
  ProjectListQuery,
  ProjectStatus,
  ProjectPriority,
  ProjectListItem,
} from "@/lib/schemas/jobs/projects";
import { ProjectsListPresenter } from "./projects-list-presenter";
import type { ProjectTableItem } from "./project-columns";

const DISPLAY_PAGE_SIZE = 20;

export interface ProjectsListFilters {
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  customerId?: string;
}

export interface ProjectsListContainerProps {
  filters?: ProjectsListFilters;
  onFiltersChange?: (filters: ProjectsListFilters) => void;
  /** Callback for creating new project */
  onCreateProject?: () => void;
}

type SortField = "title" | "status" | "priority" | "createdAt" | "targetCompletionDate";
type SortDirection = "asc" | "desc";

function isSortField(s: string): s is SortField {
  return (
    s === "title" ||
    s === "status" ||
    s === "priority" ||
    s === "createdAt" ||
    s === "targetCompletionDate"
  );
}

function buildProjectQuery(
  filters: ProjectsListFilters | undefined,
  page: number,
  sortField: SortField,
  sortDirection: SortDirection
): Partial<ProjectListQuery> {
  return {
    page,
    pageSize: DISPLAY_PAGE_SIZE,
    sortBy: sortField,
    sortOrder: sortDirection,
    search: filters?.search || undefined,
    status: filters?.status,
    priority: filters?.priority,
    customerId: filters?.customerId,
  };
}

/**
 * Convert ProjectListItem from API to ProjectTableItem
 * Handles date string → Date conversion from Drizzle response
 */
function toTableItem(project: ProjectListItem): ProjectTableItem {
  return {
    id: project.id,
    projectNumber: project.projectNumber,
    title: project.title,
    description: project.description,
    projectType: project.projectType,
    status: project.status,
    priority: project.priority,
    customerId: project.customerId,
    targetCompletionDate: project.targetCompletionDate,
    progressPercent: project.progressPercent,
    createdAt: project.createdAt instanceof Date
      ? project.createdAt
      : new Date(project.createdAt),
    updatedAt: project.updatedAt instanceof Date
      ? project.updatedAt
      : new Date(project.updatedAt),
    customer: project.customer,
  };
}

export function ProjectsListContainer({
  filters,
  onFiltersChange: _onFiltersChange,
}: ProjectsListContainerProps) {
  // Note: _onFiltersChange is available for parent components that need to pass filters
  // Currently controlled externally via the filters prop
  void _onFiltersChange;
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const queryFilters = useMemo(
    () => buildProjectQuery(filters, page, sortField, sortDirection),
    [filters, page, sortField, sortDirection]
  );

  const {
    data: projectsData,
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useProjects(queryFilters);

  // Convert projects to table items (ProjectListResponse typed from hook)
  const projects = useMemo<ProjectTableItem[]>(
    () => (projectsData?.items ?? []).map((item) => toTableItem(item)),
    [projectsData?.items]
  );
  const total = projectsData?.pagination?.totalItems ?? 0;

  // Selection state using shared hook
  const {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    lastClickedIndex,
    setLastClickedIndex,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  } = useTableSelection({ items: projects });

  const deleteMutation = useDeleteProject();

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    setSortField((currentField) => {
      if (currentField === field) {
        // Toggle direction
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentField;
      }
      // New field, default to descending for dates, ascending for text
      setSortDirection(
        ["createdAt", "targetCompletionDate"].includes(field) ? "desc" : "asc"
      );
      return isSortField(field) ? field : currentField;
    });
    setPage(1); // Reset to first page on sort change
  }, []);

  // Shift-click range handler that updates lastClickedIndex
  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  // Single select handler that updates lastClickedIndex
  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
      const idx = projects.findIndex((p) => p.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, projects, setLastClickedIndex]
  );

  const handleViewProject = useCallback(
    (projectId: string) => {
      navigate({
        to: "/projects/$projectId",
        params: { projectId },
      });
    },
    [navigate]
  );

  const handleEditProject = useCallback(
    (projectId: string) => {
      navigate({
        to: "/projects/$projectId",
        params: { projectId },
        search: { edit: true },
      });
    },
    [navigate]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(project?.title ?? "this project", "project"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync(projectId);
        toastSuccess("Project deleted");
      } catch {
        toastError("Failed to delete project");
      }
    },
    [deleteMutation, projects, confirmation]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    const count = selectedItems.length;
    const { confirmed } = await confirmation.confirm({
      title: `Delete ${count} project${count > 1 ? "s" : ""}?`,
      description: `This will permanently delete the selected project${count > 1 ? "s" : ""}. This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      // Delete in parallel for better performance
      await Promise.all(selectedItems.map((item) => deleteMutation.mutateAsync(item.id)));
      toastSuccess(`Deleted ${count} project${count > 1 ? "s" : ""}`);
      clearSelection();
    } catch {
      toastError("Failed to delete some projects");
    }
  }, [selectedItems, deleteMutation, confirmation, clearSelection]);

  return (
    <>
      <div className="space-y-4">
        {/* Bulk Actions Bar */}
        <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </BulkActionsBar>

        <ProjectsListPresenter
          projects={projects}
          isLoading={isProjectsLoading}
          error={projectsError instanceof Error ? projectsError : projectsError ? new Error(String(projectsError)) : null}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={handleSelectWithIndex}
          onSelectAll={handleSelectAll}
          onShiftClickRange={handleShiftClickRangeWithIndex}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewProject={handleViewProject}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}

export default ProjectsListContainer;
