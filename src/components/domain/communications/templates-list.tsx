/**
 * Templates List Component (Presenter)
 *
 * Main management interface for email templates.
 * Uses shared DataTable component following TABLE-STANDARDS.md.
 * All data fetching and mutations are handled by the container.
 *
 * @see DOM-COMMS-007
 * @see TABLE-STANDARDS.md
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */

"use client";

import * as React from "react";
import { useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DomainFilterBar } from "@/components/shared/filters";
import { TemplateEditor } from "./template-editor";
import { createTemplateColumns, type TemplateTableItem } from "./templates/templates-table-columns";
import {
  TEMPLATES_FILTER_CONFIG,
  DEFAULT_TEMPLATES_FILTERS,
  type TemplatesFiltersState,
} from "./templates/templates-filter-config";
import type {
  Template,
  TemplateVersion,
  TemplateFormValues,
  TemplatesListProps,
  TemplateCategory,
} from "@/lib/schemas/communications";

// Re-export types for backward compatibility
export type { Template, TemplateVersion, TemplateFormValues, TemplatesListProps, TemplateCategory };

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplatesList({
  templates,
  isLoading,
  filters,
  onFiltersChange,
  onDelete,
  onClone,
  versions,
  versionsLoading,
  onFetchVersions,
  onRestoreVersion,
  isDeleting = false,
  isCloning = false,
  isRestoringVersion = false,
  className,
}: TemplatesListProps) {
  const [editingTemplate, setEditingTemplate] =
    React.useState<Template | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Template | null>(
    null
  );
  const [cloneDialog, setCloneDialog] = React.useState<Template | null>(null);
  const [cloneName, setCloneName] = React.useState("");
  const [versionHistory, setVersionHistory] = React.useState<Template | null>(
    null
  );

  // Filter by search (client-side filtering for responsiveness)
  const filteredTemplates = React.useMemo(() => {
    if (!filters.search) return templates;
    const query = filters.search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [templates, filters.search]);


  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleClone = async () => {
    if (cloneDialog && cloneName) {
      await onClone(cloneDialog.id, cloneName);
      setCloneDialog(null);
      setCloneName("");
    }
  };

  const handleViewHistory = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setVersionHistory(template);
        onFetchVersions(template.id);
      }
    },
    [templates, onFetchVersions]
  );

  const handleEdit = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setEditingTemplate(template);
      }
    },
    [templates]
  );

  const handleDeleteClick = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setDeleteConfirm(template);
      }
    },
    [templates]
  );

  const handleCloneClick = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setCloneDialog(template);
        setCloneName(`${template.name} (Copy)`);
      }
    },
    [templates]
  );

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!onRestoreVersion) return;
      await onRestoreVersion(versionId);
      setVersionHistory(null);
    },
    [onRestoreVersion]
  );

  // Create table columns (memoized with handler dependencies)
  const columns = useMemo(
    () =>
      createTemplateColumns({
        onEdit: handleEdit,
        onClone: handleCloneClick,
        onViewHistory: handleViewHistory,
        onDelete: handleDeleteClick,
      }),
    [handleEdit, handleCloneClick, handleViewHistory, handleDeleteClick]
  );

  // Show editor when creating or editing
  if (isCreating || editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate ?? undefined}
        onSave={async () => {
          setEditingTemplate(null);
          setIsCreating(false);
        }}
        onCancel={handleCancel}
        onViewHistory={
          editingTemplate ? () => setVersionHistory(editingTemplate) : undefined
        }
        className={className}
      />
    );
  }

  return (
    <div className={className} aria-label="templates-list">
      {/* Header with New Template Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage reusable email templates
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <DomainFilterBar<TemplatesFiltersState>
          config={TEMPLATES_FILTER_CONFIG}
          filters={filters}
          onFiltersChange={onFiltersChange}
          defaultFilters={DEFAULT_TEMPLATES_FILTERS}
          resultCount={filteredTemplates.length}
        />
      </div>

      {/* DataTable */}
      <DataTable<TemplateTableItem>
        data={filteredTemplates}
        columns={columns}
        isLoading={isLoading}
        enableSorting
        // Note: Search filtering is handled client-side via filteredTemplates
        // DataTable's globalFilter is not used since enableFiltering=false
        emptyMessage={
          filters.search
            ? "No templates match your search."
            : "Create your first email template to get started."
        }
        pagination={{ pageSize: 20 }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This
              will also delete all version history. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog
        open={!!cloneDialog}
        onOpenChange={(open) => !open && setCloneDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
            <DialogDescription>
              Create a copy of &quot;{cloneDialog?.name}&quot; with a new name.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="New template name"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            aria-label="New template name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              disabled={!cloneName || isCloning}
            >
              {isCloning ? "Cloning..." : "Clone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog
        open={!!versionHistory}
        onOpenChange={(open) => !open && setVersionHistory(null)}
      >
        <DialogContent className="max-w-lg" aria-label="version-history">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Previous versions of &quot;{versionHistory?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          {versionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No previous versions
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <div className="font-medium">Version {version.version}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRestoreVersion(version.id)}
                    disabled={!onRestoreVersion || isRestoringVersion}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVersionHistory(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
