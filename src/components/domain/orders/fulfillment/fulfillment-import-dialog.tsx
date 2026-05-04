import { useCallback, type ChangeEvent, type DragEvent } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useFulfillmentImportWorkflow,
  type FulfillmentImportResult,
} from '@/hooks/orders/use-fulfillment-import-workflow';
import type { FulfillmentImport } from '@/lib/schemas/orders/shipments';

export interface FulfillmentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importMutation: UseMutationResult<FulfillmentImportResult, Error, FulfillmentImport>;
}

export function FulfillmentImportDialog({
  open,
  onOpenChange,
  importMutation,
}: FulfillmentImportDialogProps) {
  const workflow = useFulfillmentImportWorkflow({ importMutation });

  const handleClose = useCallback(() => {
    workflow.reset();
    onOpenChange(false);
  }, [onOpenChange, workflow]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleClose();
        return;
      }

      onOpenChange(true);
    },
    [handleClose, onOpenChange]
  );

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];

      if (selectedFile) {
        void workflow.parseFile(selectedFile);
      }
    },
    [workflow]
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const droppedFile = event.dataTransfer.files?.[0];

      if (droppedFile) {
        void workflow.parseFile(droppedFile);
      }
    },
    [workflow]
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
  }, []);

  const pendingInteractionGuards = createPendingDialogInteractionGuards(workflow.isPending);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(
    workflow.isPending,
    handleOpenChange
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[80vh] max-w-4xl overflow-y-auto sm:max-w-4xl"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Import Fulfillment Shipments</DialogTitle>
          <DialogDescription>
            Upload a CSV file to mark existing shipments as shipped.
          </DialogDescription>
        </DialogHeader>

        {workflow.parseError && (
          <Alert variant="destructive">
            <AlertTitle>Import error</AlertTitle>
            <AlertDescription>{workflow.parseError}</AlertDescription>
          </Alert>
        )}

        {workflow.step === 'upload' && (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop a CSV file here</p>
              <p className="text-xs text-muted-foreground">
                Required columns: orderNumber, carrier, trackingNumber
              </p>
              <div className="mt-4 w-full max-w-sm">
                <Label htmlFor="fulfillment-import">Choose file</Label>
                <Input
                  id="fulfillment-import"
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        )}

        {workflow.step === 'preview' && workflow.preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Total: {workflow.preview.totalRows}</Badge>
              <Badge variant="outline">Valid: {workflow.preview.validCount}</Badge>
              <Badge variant="outline">Invalid: {workflow.preview.invalidCount}</Badge>
            </div>

            {workflow.preview.invalidCount > 0 && (
              <Alert>
                <AlertTitle>Some rows have validation errors</AlertTitle>
                <AlertDescription>
                  Only valid rows will be imported. Review errors below before continuing.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.preview.rows.slice(0, 8).map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>{row.raw.orderNumber ?? "-"}</TableCell>
                      <TableCell>{row.raw.shipmentNumber ?? "-"}</TableCell>
                      <TableCell>{row.raw.carrier ?? "-"}</TableCell>
                      <TableCell>{row.raw.trackingNumber ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={row.isValid ? 'secondary' : 'destructive'}>
                          {row.isValid ? 'Valid' : 'Invalid'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {workflow.preview.rows.length > 8 && (
              <p className="text-xs text-muted-foreground">
                Showing first 8 rows. Remaining rows will be processed on import.
              </p>
            )}
          </div>
        )}

        {workflow.step === 'importing' && (
          <div className="space-y-4">
            <p className="text-sm">Importing fulfillment shipments...</p>
            <Progress value={60} />
          </div>
        )}

        {workflow.step === 'complete' && workflow.importResults && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Imported {workflow.importResults.imported} of{' '}
                {workflow.importResults.imported +
                  workflow.importResults.skipped +
                  workflow.importResults.failed}
              </Badge>
              <Badge variant="outline">Skipped: {workflow.importResults.skipped}</Badge>
              <Badge variant="outline">Failed: {workflow.importResults.failed}</Badge>
              {workflow.dryRun && <Badge variant="secondary">Dry run</Badge>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Showing first 10 results. Download the full CSV for all rows.
              </p>
              <Button variant="outline" size="sm" onClick={workflow.downloadResults}>
                Download Results
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.importResults.results.slice(0, 10).map((result, index) => (
                    <TableRow key={`${result.orderNumber}-${index}`}>
                      <TableCell>{result.orderNumber}</TableCell>
                      <TableCell>{result.shipmentNumber ?? "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            result.status === 'imported'
                              ? 'secondary'
                              : result.status === 'failed'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {result.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {result.message ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {workflow.step === 'preview' && (
            <div className="mr-auto flex items-center gap-2">
              <Checkbox
                id="fulfillment-dry-run"
                checked={workflow.dryRun}
                onCheckedChange={(value) => workflow.setDryRun(Boolean(value))}
              />
              <Label htmlFor="fulfillment-dry-run" className="text-sm">
                Dry run (no changes applied)
              </Label>
            </div>
          )}

          <Button variant="outline" onClick={handleClose}>
            {workflow.step === 'complete' ? 'Close' : 'Cancel'}
          </Button>

          {workflow.step === 'preview' && (
            <Button onClick={workflow.importRows} disabled={workflow.isPending}>
              {workflow.dryRun ? 'Run Dry Import' : 'Import Shipments'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
