/**
 * Warranty Import Settings Container
 *
 * Handles data fetching and actions for bulk warranty import settings.
 *
 * @source preview mutation from usePreviewWarrantyImport
 * @source register mutation from useBulkRegisterWarranties
 */

'use client';

import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePreviewWarrantyImport, useBulkRegisterWarranties } from '@/hooks/warranty';
import type { BulkRegisterResult } from '@/lib/schemas/warranty/bulk-import';
import { WarrantyImportSettingsView } from './warranty-import-settings-view';

const CSV_TEMPLATE = `customer_email,product_sku,serial_number,registration_date,warranty_policy_id
customer@example.com,BAT-LFP-200,SN-001,15/01/2026,
another@example.com,INV-HYB-5000,SN-002,,`;

const CSV_TEMPLATE_FILENAME = 'warranty-import-template.csv';

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function WarrantyImportSettingsContainer() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<BulkRegisterResult | null>(null);
  const previewMutation = usePreviewWarrantyImport();
  const registerMutation = useBulkRegisterWarranties();

  const handleImportComplete = useCallback((result: BulkRegisterResult) => {
    setLastImportResult(result);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    downloadCsv(CSV_TEMPLATE, CSV_TEMPLATE_FILENAME);
  }, []);

  const handleViewWarranties = useCallback(() => {
    navigate({ to: '/support/warranties' as any });
  }, [navigate]);

  const handleViewPolicies = useCallback(() => {
    navigate({ to: '/settings/warranty-policies' });
  }, [navigate]);

  return (
    <WarrantyImportSettingsView
      dialogOpen={dialogOpen}
      lastImportResult={lastImportResult}
      onDialogOpenChange={setDialogOpen}
      onStartImport={() => setDialogOpen(true)}
      onDownloadTemplate={handleDownloadTemplate}
      onViewWarranties={handleViewWarranties}
      onViewPolicies={handleViewPolicies}
      onImportComplete={handleImportComplete}
      onPreview={(payload) => previewMutation.mutateAsync(payload)}
      onRegister={(payload) => registerMutation.mutateAsync(payload)}
      onResetPreview={() => previewMutation.reset()}
      onResetRegister={() => registerMutation.reset()}
      isPreviewing={previewMutation.isPending}
      isRegistering={registerMutation.isPending}
    />
  );
}
