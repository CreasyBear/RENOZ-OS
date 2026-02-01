/**
 * Warranty Import Settings Route
 *
 * Page for bulk CSV warranty import with quick access actions.
 * Provides a card-based interface to launch the import dialog.
 *
 * @see src/components/domain/warranty/dialogs/bulk-warranty-import-dialog.tsx
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-005b
 */

import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { PageLayout } from '@/components/layout/page-layout';
import { WarrantyImportSettingsContainer } from '@/components/domain/warranty';

export const Route = createFileRoute('/_authenticated/settings/warranty-import')({
  component: WarrantyImportSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

function WarrantyImportSettingsPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Import"
        description="Bulk import warranty registrations from CSV files"
      />

      <PageLayout.Content>
        <WarrantyImportSettingsContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}
