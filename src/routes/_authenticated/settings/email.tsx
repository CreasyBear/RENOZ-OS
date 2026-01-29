/**
 * Email Settings Route
 *
 * Settings page for email delivery configuration with:
 * - Email metrics dashboard (sent, delivered, opened, clicked, bounced rates)
 * - Suppression list management (view, search, add, remove)
 * - Domain verification status display
 *
 * @see INT-RES-005
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Ban, Globe } from "lucide-react";

// Components
import {
  EmailMetricsCard,
  EmailMetricsCardSkeleton,
  DomainStatusCard,
  SuppressionListTable,
  SuppressionListTableSkeleton,
  AddSuppressionDialog,
} from "@/components/domain/communications/settings";

// Hooks
import { useEmailMetrics } from "@/hooks/communications/use-email-analytics";
import { useDomainVerification } from "@/hooks/communications/use-domain-verification";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/settings/email" as any)({
  component: EmailSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: EmailSettingsSkeleton,
});

// ============================================================================
// SKELETON
// ============================================================================

function EmailSettingsSkeleton() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Email Settings"
        description="Manage email delivery, suppression list, and domain verification"
      />
      <PageLayout.Content>
        <div className="space-y-6">
          <EmailMetricsCardSkeleton />
          <SuppressionListTableSkeleton />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Queries
  const metricsQuery = useEmailMetrics({ period: "30d" });
  const domainQuery = useDomainVerification();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Email Settings"
        description="Manage email delivery, suppression list, and domain verification"
        actions={
          activeTab === "suppression" && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Suppression
            </Button>
          )
        }
      />
      <PageLayout.Content>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="suppression" className="gap-2">
              <Ban className="h-4 w-4" />
              Suppression List
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-2">
              <Globe className="h-4 w-4" />
              Domain Status
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <EmailMetricsCard
              metrics={metricsQuery.data?.metrics}
              isLoading={metricsQuery.isLoading}
            />
            <DomainStatusCard
              status={domainQuery.data}
              isLoading={domainQuery.isLoading}
            />
          </TabsContent>

          {/* Suppression List Tab */}
          <TabsContent value="suppression">
            <SuppressionListTable />
          </TabsContent>

          {/* Domain Status Tab */}
          <TabsContent value="domain">
            <DomainStatusCard
              status={domainQuery.data}
              isLoading={domainQuery.isLoading}
            />
          </TabsContent>
        </Tabs>

        {/* Add Suppression Dialog */}
        <AddSuppressionDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
