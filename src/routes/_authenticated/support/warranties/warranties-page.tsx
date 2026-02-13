/**
 * Warranty List Page Component
 *
 * Lists warranties with filtering and pagination.
 *
 * @source warranties from WarrantyListContainer
 * @source bulk import from useBulkRegisterWarranties hook
 *
 * @see src/routes/_authenticated/support/warranties/index.tsx - Route definition
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */
import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Shield, BarChart3, MoreVertical } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { WarrantyListContainer, type WarrantyListItem } from '@/components/domain/warranty';
import { BulkWarrantyImportDialog } from '@/components/domain/warranty/dialogs/bulk-warranty-import-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBulkRegisterWarranties, usePreviewWarrantyImport } from '@/hooks/warranty';
import { cn } from '@/lib/utils';
import type { SearchParams } from './index';

interface WarrantiesPageProps {
  search: SearchParams;
}

export default function WarrantiesPage({ search }: WarrantiesPageProps) {
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const previewImport = usePreviewWarrantyImport();
  const registerImport = useBulkRegisterWarranties();

  const updateSearch = (updates: Partial<SearchParams>) => {
    const nextSearch: SearchParams = {
      ...search,
      ...updates,
      page: 'page' in updates ? updates.page ?? 1 : search.page,
    };
    navigate({ to: '/support/warranties', params: {} as never, search: nextSearch });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Warranties
          </div>
        }
        description="View and manage warranty registrations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import Warranties
            </Button>
            <Link
              to="/settings/warranty-policies"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Warranty Policies
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More warranty actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link
                    to="/reports/expiring-warranties"
                    className="flex w-full items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Expiring Warranties Report
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="space-y-4">
          <WarrantyListContainer
            search={search}
            onSearchChange={updateSearch}
            onRowClick={(warranty: WarrantyListItem) =>
              navigate({
                to: '/support/warranties/$warrantyId',
                params: { warrantyId: warranty.id },
              })
            }
          />
        </div>
        <BulkWarrantyImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onPreview={(payload) => previewImport.mutateAsync(payload)}
          onRegister={(payload) => registerImport.mutateAsync(payload)}
          onResetPreview={previewImport.reset}
          onResetRegister={registerImport.reset}
          isPreviewing={previewImport.isPending}
          isRegistering={registerImport.isPending}
          onComplete={() => setImportOpen(false)}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
