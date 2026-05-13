import { useRef } from 'react';
import { Plus, ShoppingCart, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ProjectBomHeaderActionsProps {
  bomNumber: string;
  itemCount: number;
  orderId?: string | null;
  isImportingCsv: boolean;
  isImportingFromOrder: boolean;
  onCsvImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImportFromOrder: () => void;
  onAddMaterial: () => void;
}

export function ProjectBomHeaderActions({
  bomNumber,
  itemCount,
  orderId,
  isImportingCsv,
  isImportingFromOrder,
  onCsvImport,
  onImportFromOrder,
  onAddMaterial,
}: ProjectBomHeaderActionsProps) {
  const csvInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Bill of Materials</h3>
          <Badge variant="outline">{bomNumber}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {itemCount} items &bull; Track materials from estimate to installation
        </p>
      </div>
      <div className="flex items-center gap-2">
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
        <Button onClick={onAddMaterial}>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
      </div>
    </div>
  );
}
