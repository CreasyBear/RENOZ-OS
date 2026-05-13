import { useRef } from 'react';
import { AlertCircle, Calculator, Plus, ShoppingCart, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getProjectMaterialsReadErrorMessage } from './project-read-error-messages';

export interface ProjectBomEmptyStateProps {
  error?: Error | null;
  hasReadData: boolean;
  orderId?: string | null;
  isCreatingBom: boolean;
  isImportingCsv: boolean;
  isImportingFromOrder: boolean;
  onRetry: () => void;
  onCreateBom: () => void;
  onCsvImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImportFromOrder: () => void;
}

export function ProjectBomEmptyState({
  error,
  hasReadData,
  orderId,
  isCreatingBom,
  isImportingCsv,
  isImportingFromOrder,
  onRetry,
  onCreateBom,
  onCsvImport,
  onImportFromOrder,
}: ProjectBomEmptyStateProps) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isColdReadFailure = !hasReadData && !!error;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Bill of Materials</h3>
          <p className="text-sm text-muted-foreground">
            Track materials, costs, and installation progress
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant={isColdReadFailure ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{isColdReadFailure ? 'Materials unavailable' : 'Showing cached materials'}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{getProjectMaterialsReadErrorMessage(error)}</span>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isColdReadFailure ? null : (
        <Card className="p-12 text-center">
          <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No BOM yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a Bill of Materials to estimate costs, track materials through procurement,
            and monitor installation progress. Or import from CSV (sku,quantity[,unitCost]).
          </p>
          <div className="flex items-center justify-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onCsvImport}
            />
            <Button
              variant="outline"
              onClick={() => csvInputRef.current?.click()}
              disabled={isImportingCsv}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImportingCsv ? 'Importing...' : 'Import CSV'}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      onClick={onImportFromOrder}
                      disabled={!orderId || isImportingFromOrder}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {isImportingFromOrder ? 'Importing...' : 'Import from Order'}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {orderId
                    ? 'Import line items from the linked order'
                    : 'Link an order to this project first'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={onCreateBom} disabled={isCreatingBom}>
              <Plus className="mr-2 h-4 w-4" />
              {isCreatingBom ? 'Creating...' : 'Create BOM'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
