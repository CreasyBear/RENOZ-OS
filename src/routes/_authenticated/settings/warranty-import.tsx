/**
 * Warranty Import Settings Route
 *
 * Page for bulk CSV warranty import with quick access actions.
 * Provides a card-based interface to launch the import dialog.
 *
 * @see src/components/domain/warranty/bulk-warranty-import-dialog.tsx
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-005b
 */

import { useState, useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageLayout } from '@/components/layout/page-layout';
import { BulkWarrantyImportDialog } from '@/components/domain/warranty/bulk-warranty-import-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  Info,
} from 'lucide-react';
import type { BulkRegisterResult } from '@/lib/schemas/warranty/bulk-import';
import { usePreviewWarrantyImport, useBulkRegisterWarranties } from '@/hooks';

export const Route = createFileRoute('/_authenticated/settings/warranty-import')({
  component: WarrantyImportSettingsPage,
});

// ============================================================================
// CSV TEMPLATE
// ============================================================================

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

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function WarrantyImportSettingsPage() {
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
    <PageLayout>
      <PageLayout.Header
        title="Warranty Import"
        description="Bulk import warranty registrations from CSV files"
      />

      <PageLayout.Content>
        <div className="space-y-6">
          {/* Last Import Result */}
          {lastImportResult && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="size-4 text-green-600" />
              <AlertTitle>Import Successful</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Successfully imported {lastImportResult.summary.totalCreated} warranties.
                </span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleViewWarranties}
                  className="text-green-700"
                >
                  View Warranties
                  <ExternalLink className="ml-1 size-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Main Import Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                  <Upload className="text-primary size-5" />
                </div>
                <div>
                  <CardTitle>Bulk CSV Import</CardTitle>
                  <CardDescription>
                    Upload a CSV file to register multiple warranties at once
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Supported Columns</h4>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-green-500" />
                      customer_email or customer_id
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-green-500" />
                      product_sku or product_id
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-muted-foreground size-1.5 rounded-full" />
                      serial_number (optional)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-muted-foreground size-1.5 rounded-full" />
                      registration_date (optional, DD/MM/YYYY)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-muted-foreground size-1.5 rounded-full" />
                      warranty_policy_id (optional)
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Limits</h4>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5" />
                      Maximum 1,000 rows per file
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5" />
                      Maximum 5MB file size
                    </li>
                    <li className="flex items-center gap-2">
                      <Info className="size-3.5" />
                      UTF-8 encoded CSV only
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button onClick={() => setDialogOpen(true)} className="flex-1">
                  <Upload className="mr-2 size-4" />
                  Start Import
                </Button>
                <Button variant="outline" onClick={handleDownloadTemplate} className="flex-1">
                  <Download className="mr-2 size-4" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className="hover:border-primary/50 cursor-pointer transition-colors"
              onClick={handleViewWarranties}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleViewWarranties()}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="text-muted-foreground size-5" />
                  <div>
                    <CardTitle className="text-base">View Warranties</CardTitle>
                    <CardDescription>Browse all registered warranties</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card
              className="hover:border-primary/50 cursor-pointer transition-colors"
              onClick={handleViewPolicies}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleViewPolicies()}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-muted-foreground size-5" />
                  <div>
                    <CardTitle className="text-base">Warranty Policies</CardTitle>
                    <CardDescription>Configure warranty coverage policies</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="size-4" />
                Import Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground space-y-2 text-sm">
                <li>
                  <strong>Customer Matching:</strong> Use existing customer emails or IDs. New
                  customers must be created separately before import.
                </li>
                <li>
                  <strong>Product Matching:</strong> Use product SKUs or IDs from your inventory.
                  Products must exist before import.
                </li>
                <li>
                  <strong>Serial Numbers:</strong> Must be unique. Duplicates (existing or within
                  the same batch) will cause validation errors.
                </li>
                <li>
                  <strong>Policy Resolution:</strong> If no policy ID is specified, the system uses
                  the product&apos;s assigned policy, then the category default, then the
                  organization default.
                </li>
                <li>
                  <strong>Date Format:</strong> Use Australian format (DD/MM/YYYY) or ISO format
                  (YYYY-MM-DD). If omitted, today&apos;s date is used.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Import Dialog */}
        <BulkWarrantyImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onComplete={handleImportComplete}
          onPreview={(payload) => previewMutation.mutateAsync(payload)}
          onRegister={(payload) => registerMutation.mutateAsync(payload)}
          onResetPreview={() => previewMutation.reset()}
          onResetRegister={() => registerMutation.reset()}
          isPreviewing={previewMutation.isPending}
          isRegistering={registerMutation.isPending}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
