/**
 * Warranty Policies Settings Route
 *
 * Management page for warranty policies. Allows creating, editing,
 * and configuring default policies for batteries, inverters, and installations.
 *
 * @see src/components/domain/warranty/warranty-policy-list.tsx
 * @see src/components/domain/warranty/warranty-policy-form-dialog.tsx
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-001c
 */

import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { PageLayout } from '@/components/layout/page-layout';
import { WarrantyPolicySettingsContainer } from '@/components/domain/warranty';

export const Route = createFileRoute('/_authenticated/settings/warranty-policies')({
  component: WarrantyPoliciesSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

function WarrantyPoliciesSettingsPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Policies"
        description="Define and manage warranty coverage for batteries, inverters, and installations"
      />

      <PageLayout.Content>
        <WarrantyPolicySettingsContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}
