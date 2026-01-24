/**
 * Communications Hub Route
 *
 * Main entry point for communications domain with navigation to sub-sections.
 *
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Mail, Phone, FileText, PenTool, Settings } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { cn } from "@/lib/utils";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/")({
  component: CommunicationsLayout,
});

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const navItems = [
  {
    to: "/communications/campaigns",
    label: "Campaigns",
    icon: Mail,
    description: "Email campaigns",
  },
  {
    to: "/communications/emails",
    label: "Scheduled Emails",
    icon: Mail,
    description: "Individual scheduled emails",
  },
  {
    to: "/communications/calls",
    label: "Scheduled Calls",
    icon: Phone,
    description: "Follow-up calls",
  },
  {
    to: "/communications/emails/templates",
    label: "Templates",
    icon: FileText,
    description: "Email templates",
  },
  {
    to: "/communications/signatures",
    label: "Signatures",
    icon: PenTool,
    description: "Email signatures",
  },
  {
    to: "/communications/settings/preferences",
    label: "Settings",
    icon: Settings,
    description: "Communication preferences",
  },
] as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CommunicationsLayout() {
  const location = useLocation();

  return (
    <PageLayout>
      <PageLayout.Header
        title="Communications"
        description="Manage email campaigns, templates, and scheduled communications"
      />

      <PageLayout.Content>
        {/* Navigation tabs */}
        <nav className="border-b mb-6" aria-label="Communications sections">
          <div className="flex gap-1 -mb-px">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/25"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Child route content */}
        <Outlet />
      </PageLayout.Content>
    </PageLayout>
  );
}

export default CommunicationsLayout;
