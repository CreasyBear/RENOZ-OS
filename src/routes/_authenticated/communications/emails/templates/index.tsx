/**
 * Email Templates Route (Container)
 *
 * Container component that fetches templates data and passes to TemplatesList presenter.
 * Handles all data fetching, mutations, and state management.
 *
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCloneTemplate,
  useTemplateVersions,
} from "@/hooks/communications";
import {
  TemplatesList,
  type TemplateFormValues,
} from "@/components/domain/communications/templates-list";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { ErrorState } from "@/components/shared";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";
import type { TemplateCategory } from "../../../../../../drizzle/schema";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute(
  "/_authenticated/communications/emails/templates/"
)({
  component: TemplatesContainer,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

function TemplatesContainer() {
  const [selectedCategory, setSelectedCategory] = useState<
    TemplateCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [versionsTemplateId, setVersionsTemplateId] = useState<string | null>(
    null
  );

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: templatesData,
    isLoading,
    error,
    refetch,
  } = useTemplates({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    activeOnly: false, // Show all templates, including inactive
  });

  const { data: versionsData, isLoading: versionsLoading } = useTemplateVersions({
    templateId: versionsTemplateId ?? "",
    enabled: !!versionsTemplateId,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const cloneMutation = useCloneTemplate();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCategoryChange = useCallback(
    (category: TemplateCategory | "all") => {
      setSelectedCategory(category);
    },
    []
  );

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCreate = useCallback(
    async (values: TemplateFormValues) => {
      try {
        await createMutation.mutateAsync({
          data: {
            name: values.name,
            description: values.description,
            category: values.category,
            subject: values.subject,
            bodyHtml: values.bodyHtml,
            isActive: values.isActive,
          },
        });
        toastSuccess("Template created");
      } catch {
        toastError("Failed to create template");
        throw new Error("Failed to create template");
      }
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    async (id: string, values: TemplateFormValues) => {
      try {
        await updateMutation.mutateAsync({
          data: {
            id,
            name: values.name,
            description: values.description,
            category: values.category,
            subject: values.subject,
            bodyHtml: values.bodyHtml,
            isActive: values.isActive,
            createVersion: values.createVersion,
          },
        });
        toastSuccess("Template updated");
      } catch {
        toastError("Failed to update template");
        throw new Error("Failed to update template");
      }
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ data: { id } });
        toastSuccess("Template deleted");
      } catch {
        toastError("Failed to delete template");
      }
    },
    [deleteMutation]
  );

  const handleClone = useCallback(
    async (id: string, newName: string) => {
      try {
        await cloneMutation.mutateAsync({ data: { templateId: id, newName } });
        toastSuccess("Template cloned");
      } catch {
        toastError("Failed to clone template");
      }
    },
    [cloneMutation]
  );

  const handleFetchVersions = useCallback((templateId: string) => {
    setVersionsTemplateId(templateId);
  }, []);

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load templates"
        description="There was an error loading your email templates."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const templates = templatesData?.items ?? [];
  const versions = versionsData?.versions ?? [];

  return (
    <div className="container py-6 max-w-5xl">
      <TemplatesList
        templates={templates}
        isLoading={isLoading}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onClone={handleClone}
        versions={versions}
        versionsLoading={versionsLoading}
        onFetchVersions={handleFetchVersions}
        isDeleting={deleteMutation.isPending}
        isCloning={cloneMutation.isPending}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

export default TemplatesContainer;
