/**
 * Communications Layout Component
 *
 * Main entry point for communications domain with navigation to sub-sections.
 *
 * @see src/routes/_authenticated/communications/index.tsx - Route definition
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { Outlet } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout";
import { CommunicationsNav } from "./communications-nav";

export default function CommunicationsLayout() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Communications"
        description="Manage email campaigns, templates, and scheduled communications"
      />

      <PageLayout.Content>
        <CommunicationsNav />

        {/* Child route content */}
        <Outlet />
      </PageLayout.Content>
    </PageLayout>
  );
}
