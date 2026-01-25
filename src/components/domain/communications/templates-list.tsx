/**
 * Templates List Component (Presenter)
 *
 * Main management interface for email templates.
 * Displays templates by category with create/edit/delete actions.
 * All data fetching and mutations are handled by the container.
 *
 * @see DOM-COMMS-007
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */

"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Edit2,
  Copy,
  History,
  FileText,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

import { TemplateEditor } from "./template-editor";
import type { TemplateCategory } from "../../../../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedBy: string | null;
}

export interface TemplateFormValues {
  name: string;
  description?: string;
  category: TemplateCategory;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  createVersion: boolean;
}

/**
 * Props for the TemplatesList presenter component.
 * All data is passed from the container route.
 */
export interface TemplatesListProps {
  /** @source useEmailTemplates() in communications/templates/index.tsx */
  templates: Template[];
  /** @source useEmailTemplates().isLoading in container */
  isLoading: boolean;
  selectedCategory: TemplateCategory | "all";
  onCategoryChange: (category: TemplateCategory | "all") => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  /** @source useCreateEmailTemplate() in container */
  onCreate: (values: TemplateFormValues) => Promise<void>;
  /** @source useUpdateEmailTemplate() in container */
  onUpdate: (id: string, values: TemplateFormValues) => Promise<void>;
  /** @source useDeleteEmailTemplate() in container */
  onDelete: (id: string) => Promise<void>;
  /** @source useCloneEmailTemplate() in container */
  onClone: (id: string, newName: string) => Promise<void>;
  /** @source useTemplateVersionHistory() in container */
  versions: TemplateVersion[];
  versionsLoading: boolean;
  onFetchVersions: (templateId: string) => void;
  isDeleting?: boolean;
  isCloning?: boolean;
  isSaving?: boolean;
  className?: string;
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORIES: { value: TemplateCategory | "all"; label: string }[] = [
  { value: "all", label: "All Templates" },
  { value: "quotes", label: "Quotes" },
  { value: "orders", label: "Orders" },
  { value: "installations", label: "Installations" },
  { value: "warranty", label: "Warranty" },
  { value: "support", label: "Support" },
  { value: "marketing", label: "Marketing" },
  { value: "follow_up", label: "Follow-up" },
  { value: "custom", label: "Custom" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplatesList({
  templates,
  isLoading,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchQueryChange,
  onCreate,
  onUpdate,
  onDelete,
  onClone,
  versions,
  versionsLoading,
  onFetchVersions,
  isDeleting = false,
  isCloning = false,
  isSaving = false,
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
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const handleSubmit = async (values: TemplateFormValues) => {
    if (editingTemplate) {
      await onUpdate(editingTemplate.id, values);
    } else {
      await onCreate(values);
    }
    setEditingTemplate(null);
    setIsCreating(false);
  };

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

  const handleViewHistory = (template: Template) => {
    setVersionHistory(template);
    onFetchVersions(template.id);
  };

  // Show editor when creating or editing
  if (isCreating || editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate ?? undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onViewHistory={
          editingTemplate ? () => setVersionHistory(editingTemplate) : undefined
        }
        isSubmitting={isSaving}
        className={className}
      />
    );
  }

  return (
    <Card className={className} aria-label="templates-list">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Create and manage reusable email templates
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Category Tabs */}
        <Tabs
          value={selectedCategory}
          onValueChange={(v) =>
            onCategoryChange(v as TemplateCategory | "all")
          }
          className="mb-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <TabsList className="flex-wrap h-auto" aria-label="category-tabs">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="max-w-xs"
              aria-label="Search templates"
            />
          </div>
        </Tabs>

        {/* Templates List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <FileText className="h-10 w-10" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No templates found</EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? "No templates match your search."
                  : "Create your first email template to get started."}
              </EmptyDescription>
            </EmptyHeader>
            {!searchQuery && (
              <Button
                onClick={() => setIsCreating(true)}
                className="gap-2 mt-4"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            )}
          </Empty>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => setEditingTemplate(template)}
                onDelete={() => setDeleteConfirm(template)}
                onClone={() => {
                  setCloneDialog(template);
                  setCloneName(`${template.name} (Copy)`);
                }}
                onViewHistory={() => handleViewHistory(template)}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Template</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteConfirm?.name}"? This
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
                Create a copy of "{cloneDialog?.name}" with a new name.
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
                Previous versions of "{versionHistory?.name}"
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
                    <Button variant="outline" size="sm">
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
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TEMPLATE CARD SUBCOMPONENT
// ============================================================================

interface TemplateCardProps {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
  onViewHistory: () => void;
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onClone,
  onViewHistory,
}: TemplateCardProps) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-colors hover:bg-muted/50",
        !template.isActive && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="font-medium truncate">{template.name}</h5>
            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
            {!template.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              v{template.version}
            </span>
          </div>
          <div className="text-sm text-muted-foreground mb-2 truncate">
            Subject: {template.subject}
          </div>
          {template.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {template.description}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClone}>
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewHistory}>
              <History className="h-4 w-4 mr-2" />
              Version History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
