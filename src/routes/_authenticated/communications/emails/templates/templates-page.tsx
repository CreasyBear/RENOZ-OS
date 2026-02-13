/**
 * Email Templates Page Component
 *
 * Container component that fetches templates data and passes to TemplatesList presenter.
 * Handles all data fetching, mutations, and state management.
 * Uses URL-synced filters following FILTER-STANDARDS.md.
 *
 * @source templates from useTemplates hook
 * @source handlers from useTemplatesPage hook
 *
 * @see src/routes/_authenticated/communications/emails/templates/index.tsx - Route definition
 * @see use-templates-page.ts - Extracted handlers hook
 * @see FILTER-STANDARDS.md - URL state sync pattern
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { useNavigate } from "@tanstack/react-router";
import { useTemplates } from "@/hooks/communications";
import { TemplatesList } from "@/components/domain/communications/templates-list";
import { ErrorState } from "@/components/shared";
import { useFilterUrlState } from "@/hooks/filters/use-filter-url-state";
import { useTemplatesPage } from "./use-templates-page";
import {
  DEFAULT_TEMPLATES_FILTERS,
  type TemplatesFiltersState,
} from "@/components/domain/communications/templates/templates-filter-config";
import type { SearchParams } from "./index";

interface TemplatesPageProps {
  search: SearchParams;
}

export default function TemplatesPage({ search }: TemplatesPageProps) {
  const navigate = useNavigate();

  // ============================================================================
  // URL-SYNCED FILTER STATE
  // ============================================================================
  const { filters, setFilters } = useFilterUrlState<TemplatesFiltersState>({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_TEMPLATES_FILTERS,
    resetPageOnChange: ["search", "category"],
  });

  const {
    versions,
    versionsLoading,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleClone,
    handleFetchVersions,
    isDeleting,
    isCloning,
    isSaving,
  } = useTemplatesPage();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: templatesData,
    isLoading,
    error,
    refetch,
  } = useTemplates({
    category: filters.category === "all" ? undefined : filters.category,
    activeOnly: false, // Show all templates, including inactive
  });

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <>
        <h2 className="text-xl font-semibold mb-4">Email Templates</h2>
        <ErrorState
          title="Failed to load templates"
          message="There was an error loading your email templates."
          onRetry={() => refetch()}
        />
      </>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const templates = templatesData ?? [];

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Email Templates</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Manage reusable email templates for campaigns and communications
      </p>
      <TemplatesList
          templates={templates}
          isLoading={isLoading}
          filters={filters}
          onFiltersChange={setFilters}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClone={handleClone}
          versions={versions}
          versionsLoading={versionsLoading}
          onFetchVersions={handleFetchVersions}
          isDeleting={isDeleting}
          isCloning={isCloning}
          isSaving={isSaving}
        />
    </>
  );
}
