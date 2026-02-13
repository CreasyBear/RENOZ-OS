/**
 * Bulk Warranty CSV Import Dialog
 *
 * Multi-step wizard for importing warranties from CSV:
 * 1. Upload CSV file
 * 2. Preview and validate
 * 3. Import with progress
 * 4. Summary
 *
 * @see src/hooks/use-warranty-bulk-import.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-005b
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateAustralian } from '@/lib/warranty';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type {
  PreviewResult,
  ValidatedWarrantyRowWithDetails,
  ErrorRow,
  BulkRegisterResult,
} from '@/lib/schemas/warranty/bulk-import';

// ============================================================================
// TYPES
// ============================================================================

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';
type RowFilter = 'all' | 'valid' | 'errors';

function isRowFilter(v: unknown): v is RowFilter {
  return v === 'all' || v === 'valid' || v === 'errors';
}

interface BulkWarrantyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result: BulkRegisterResult) => void;
  /** From route container (mutation). */
  onPreview: (payload: { csvContent: string }) => Promise<PreviewResult>;
  /** From route container (mutation). */
  onRegister: (payload: {
    rows: Array<{
      customerId: string;
      productId: string;
      serialNumber?: string;
      registrationDate: string;
      warrantyPolicyId: string;
      policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
    }>;
    sendNotifications?: boolean;
  }) => Promise<BulkRegisterResult>;
  /** From route container (mutation). */
  onResetPreview?: () => void;
  /** From route container (mutation). */
  onResetRegister?: () => void;
  /** From route container (mutation). */
  isPreviewing?: boolean;
  /** From route container (mutation). */
  isRegistering?: boolean;
}

// ============================================================================
// CSV TEMPLATE
// ============================================================================

const CSV_TEMPLATE = `customer_email,product_sku,serial_number,registration_date,warranty_policy_id
customer@example.com,BAT-LFP-200,SN-001,15/01/2026,
another@example.com,INV-HYB-5000,SN-002,,`;

const CSV_TEMPLATE_FILENAME = 'warranty-import-template.csv';

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function generateErrorsCsv(errorRows: ErrorRow[]): string {
  const headers = ['row_number', 'errors', 'raw_data'];
  const rows = errorRows.map((row) => [
    row.rowNumber.toString(),
    `"${row.errors.join('; ').replace(/"/g, '""')}"`,
    `"${JSON.stringify(row.rawData).replace(/"/g, '""')}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ============================================================================
// FILE UPLOAD COMPONENT
// ============================================================================

interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isValidating: boolean;
  error: string | null;
}

function FileUploadZone({
  file,
  onFileSelect,
  onFileRemove,
  isValidating,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragInvalid, setIsDragInvalid] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const item = items[0];
      if (item.type === 'text/csv' || item.kind === 'file') {
        setIsDragOver(true);
        setIsDragInvalid(false);
      } else {
        setIsDragOver(true);
        setIsDragInvalid(true);
      }
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsDragInvalid(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setIsDragInvalid(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const droppedFile = files[0];
        if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
          onFileSelect(droppedFile);
        }
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (file) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border-2 border-green-500 bg-green-50 p-4',
          'dark:border-green-600 dark:bg-green-950/30'
        )}
      >
        <FileText className="size-8 text-green-600 dark:text-green-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-muted-foreground text-sm">{formatFileSize(file.size)}</p>
        </div>
        {isValidating ? (
          <Spinner className="size-5" />
        ) : (
          <Button variant="ghost" size="icon" onClick={onFileRemove} aria-label="Remove file">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-all',
          isDragOver && !isDragInvalid && 'border-primary bg-primary/5',
          isDragInvalid && 'border-destructive bg-destructive/5',
          !isDragOver && 'border-muted-foreground/25 hover:border-primary/50',
          error && 'border-destructive'
        )}
        aria-label="Upload CSV file. Drag and drop or press Enter to browse."
        aria-describedby="upload-help"
      >
        <Upload
          className={cn(
            'size-10 transition-transform',
            isDragOver && !isDragInvalid && 'text-primary scale-110',
            isDragInvalid && 'text-destructive'
          )}
        />
        <div className="text-center">
          <p className="font-medium">
            {isDragInvalid
              ? 'Invalid file type'
              : isDragOver
                ? 'Drop your file to upload'
                : 'Drag and drop your CSV file here'}
          </p>
          <p className="text-muted-foreground text-sm">or click to browse</p>
        </div>
        <p id="upload-help" className="text-muted-foreground text-xs">
          Accepted: .csv | Max: 1000 rows, 5MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// PREVIEW TABLE COMPONENT
// ============================================================================

interface PreviewTableProps {
  validRows: ValidatedWarrantyRowWithDetails[];
  errorRows: ErrorRow[];
  filter: RowFilter;
  onFilterChange: (filter: RowFilter) => void;
}

function PreviewTable({ validRows, errorRows, filter, onFilterChange }: PreviewTableProps) {
  const filteredRows = useMemo(() => {
    if (filter === 'valid') {
      return validRows.map((row) => ({
        ...row,
        isValid: true as const,
        errors: [] as string[],
      }));
    }
    if (filter === 'errors') {
      return errorRows.map((row) => ({
        rowNumber: row.rowNumber,
        isValid: false as const,
        errors: row.errors,
        rawData: row.rawData,
      }));
    }
    // All - interleave by row number
    const all = [
      ...validRows.map((row) => ({
        ...row,
        isValid: true as const,
        errors: [] as string[],
      })),
      ...errorRows.map((row) => ({
        rowNumber: row.rowNumber,
        isValid: false as const,
        errors: row.errors,
        rawData: row.rawData,
        customerId: undefined,
        customerName: row.rawData.customer_email || row.rawData.customer_id,
        productId: undefined,
        productName: row.rawData.product_sku || row.rawData.product_id,
        serialNumber: row.rawData.serial_number || null,
        registrationDate: row.rawData.registration_date || '',
        warrantyPolicyId: undefined,
        policyName: row.rawData.warranty_policy_id || '',
        policyType: undefined,
        expiryDate: '',
      })),
    ].sort((a, b) => a.rowNumber - b.rowNumber);
    return all;
  }, [validRows, errorRows, filter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="row-filter" className="text-sm font-medium">
            Show:
          </Label>
          <Select
            value={filter}
            onValueChange={(value) =>
              onFilterChange(isRowFilter(value) ? value : filter)
            }
          >
            <SelectTrigger id="row-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({validRows.length + errorRows.length})</SelectItem>
              <SelectItem value="valid">Valid ({validRows.length})</SelectItem>
              <SelectItem value="errors">Errors ({errorRows.length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {errorRows.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(generateErrorsCsv(errorRows), 'warranty-import-errors.csv')}
          >
            <Download className="mr-2 size-4" />
            Download Errors
          </Button>
        )}
      </div>

      <ScrollArea className="h-[300px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground text-center">
                  No rows to display
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow
                  key={row.rowNumber}
                  className={cn(!row.isValid && 'bg-destructive/5 hover:bg-destructive/10')}
                >
                  <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {row.isValid
                      ? row.customerName
                      : (row as { rawData?: Record<string, string> }).rawData?.customer_email ||
                        (row as { rawData?: Record<string, string> }).rawData?.customer_id ||
                        '-'}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {row.isValid
                      ? row.productName
                      : (row as { rawData?: Record<string, string> }).rawData?.product_sku ||
                        (row as { rawData?: Record<string, string> }).rawData?.product_id ||
                        '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.isValid
                      ? row.serialNumber || '-'
                      : (row as { rawData?: Record<string, string> }).rawData?.serial_number || '-'}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    {row.isValid ? row.policyName : '-'}
                  </TableCell>
                  <TableCell>
                    {row.isValid && row.expiryDate ? formatDateAustralian(row.expiryDate, 'numeric') : '-'}
                  </TableCell>
                  <TableCell>
                    {row.isValid ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      >
                        <CheckCircle2 className="mr-1 size-3" />
                        Valid
                      </Badge>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 size-3" />
                          Error
                        </Badge>
                        <div className="text-destructive text-xs">
                          {row.errors.map((err, i) => (
                            <p key={i}>{err}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// IMPORT PROGRESS COMPONENT
// ============================================================================

interface ImportProgressProps {
  current: number;
  total: number;
}

function ImportProgress({ current, total }: ImportProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <Spinner className="size-12" />
      <div className="text-center">
        <h3 className="text-lg font-semibold">Registering Warranties</h3>
        <p className="text-muted-foreground">Please do not close this window</p>
      </div>
      <div className="w-full max-w-md space-y-2">
        <Progress value={percentage} />
        <p className="text-muted-foreground text-center text-sm">
          {current} of {total} complete ({percentage}%)
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// IMPORT COMPLETE COMPONENT
// ============================================================================

interface ImportCompleteProps {
  result: BulkRegisterResult;
  skippedCount: number;
  onViewWarranties: () => void;
  onClose: () => void;
}

function ImportComplete({ result, skippedCount, onViewWarranties, onClose }: ImportCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Import Complete</h3>
        <p className="text-muted-foreground">
          Successfully registered {result.summary.totalCreated} warranties
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold text-green-600">{result.summary.totalCreated}</p>
            <p className="text-muted-foreground text-xs">Imported</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold text-yellow-600">{skippedCount}</p>
            <p className="text-muted-foreground text-xs">Skipped</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{result.summary.totalCreated + skippedCount}</p>
            <p className="text-muted-foreground text-xs">Total</p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <h4 className="text-sm font-medium">By Policy Type</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Battery Performance</span>
              <span>{result.summary.byPolicyType.battery_performance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inverter Manufacturer</span>
              <span>{result.summary.byPolicyType.inverter_manufacturer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Installation Workmanship</span>
              <span>{result.summary.byPolicyType.installation_workmanship}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-sm gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Close
        </Button>
        <Button className="flex-1" onClick={onViewWarranties}>
          <ExternalLink className="mr-2 size-4" />
          View Warranties
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DIALOG COMPONENT
// ============================================================================

export function BulkWarrantyImportDialog({
  open,
  onOpenChange,
  onComplete,
  onPreview,
  onRegister,
  onResetPreview,
  onResetRegister,
  isPreviewing,
  isRegistering,
}: BulkWarrantyImportDialogProps) {
  // State
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<BulkRegisterResult | null>(null);
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const [sendNotifications, setSendNotifications] = useState(true);

  // Reset dialog state
  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setFileError(null);
    setPreviewResult(null);
    setImportResult(null);
    setRowFilter('all');
    setSendNotifications(true);
    onResetPreview?.();
    onResetRegister?.();
  }, [onResetPreview, onResetRegister]);

  // Handle dialog close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Prevent closing during import
        if (step === 'importing') {
          return;
        }
        resetState();
      }
      onOpenChange(newOpen);
    },
    [step, onOpenChange, resetState]
  );

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFileError(null);

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFileError('File too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setFileError('Invalid file type. Please upload a CSV file.');
      return;
    }

    setFile(selectedFile);
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFile(null);
    setFileError(null);
    setPreviewResult(null);
    setRowFilter('all');
    onResetPreview?.();
  }, [onResetPreview]);

  // Handle validate/preview
  const handleValidate = useCallback(async () => {
    if (!file) return;

    try {
      const content = await file.text();

      // Check row count
      const lines = content.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length > 1001) {
        // 1000 rows + header
        setFileError('Too many rows. Maximum is 1000 rows.');
        return;
      }

      const result = await onPreview({ csvContent: content });

      setPreviewResult(result);
      setStep('preview');
    } catch {
      toast.error('Failed to preview CSV. Please check the file format and try again.');
    }
  }, [file, onPreview]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!previewResult || previewResult.validRows.length === 0) return;

    setStep('importing');

    try {
      const result = await onRegister({
        rows: previewResult.validRows.map((row) => ({
          customerId: row.customerId,
          productId: row.productId,
          serialNumber: row.serialNumber || undefined,
          registrationDate: row.registrationDate,
          warrantyPolicyId: row.warrantyPolicyId,
          policyType: row.policyType,
        })),
        sendNotifications,
      });

      setImportResult(result);
      setStep('complete');
      onComplete?.(result);
    } catch {
      toast.error('Import failed. Please try again or contact support.');
      setStep('preview');
    }
  }, [previewResult, sendNotifications, onRegister, onComplete]);

  // Handle template download
  const handleDownloadTemplate = useCallback(() => {
    downloadCsv(CSV_TEMPLATE, CSV_TEMPLATE_FILENAME);
  }, []);

  const navigate = useNavigate();

  // Handle view warranties
  const handleViewWarranties = useCallback(() => {
    handleOpenChange(false);
    navigate({ to: '/support/warranties', params: {} as never });
  }, [handleOpenChange, navigate]);

  // Computed values
  const canValidate = file && !isPreviewing;
  const canImport = previewResult && previewResult.validRows.length > 0 && !isRegistering;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] max-w-3xl overflow-y-auto',
          step === 'importing' && 'pointer-events-none'
        )}
        showCloseButton={step !== 'importing'}
      >
        <DialogHeader>
          <DialogTitle>Bulk Import Warranties</DialogTitle>
          <DialogDescription>
            Import multiple warranty registrations from a CSV file
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <FileUploadZone
              file={file}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              isValidating={!!isPreviewing}
              error={fileError}
            />

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-2 size-4" />
                Download CSV Template
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>CSV Format Requirements</AlertTitle>
              <AlertDescription className="space-y-2 text-sm">
                <p>Your CSV must include a header row with these columns:</p>
                <ul className="ml-2 list-inside list-disc space-y-1 text-xs">
                  <li>
                    <code className="bg-muted rounded px-1">customer_email</code> or{' '}
                    <code className="bg-muted rounded px-1">customer_id</code> (required)
                  </li>
                  <li>
                    <code className="bg-muted rounded px-1">product_sku</code> or{' '}
                    <code className="bg-muted rounded px-1">product_id</code> (required)
                  </li>
                  <li>
                    <code className="bg-muted rounded px-1">serial_number</code> (optional)
                  </li>
                  <li>
                    <code className="bg-muted rounded px-1">registration_date</code> (optional,
                    DD/MM/YYYY)
                  </li>
                  <li>
                    <code className="bg-muted rounded px-1">warranty_policy_id</code> (optional,
                    uses product/default)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleValidate} disabled={!canValidate}>
                {isPreviewing ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Validating...
                  </>
                ) : (
                  'Validate CSV'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && previewResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{previewResult.summary.totalRows}</p>
                <p className="text-muted-foreground text-xs">Total Rows</p>
              </div>
              <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/20">
                <p className="text-2xl font-bold text-green-600">
                  {previewResult.summary.validCount}
                </p>
                <p className="text-muted-foreground text-xs">Valid</p>
              </div>
              <div
                className={cn(
                  'rounded-lg border p-3',
                  previewResult.summary.errorCount > 0 && 'bg-red-50 dark:bg-red-950/20'
                )}
              >
                <p
                  className={cn(
                    'text-2xl font-bold',
                    previewResult.summary.errorCount > 0 && 'text-red-600'
                  )}
                >
                  {previewResult.summary.errorCount}
                </p>
                <p className="text-muted-foreground text-xs">Errors</p>
              </div>
            </div>

            {/* Preview Table */}
            <PreviewTable
              validRows={previewResult.validRows}
              errorRows={previewResult.errorRows}
              filter={rowFilter}
              onFilterChange={setRowFilter}
            />

            {/* Options */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-notifications"
                checked={sendNotifications}
                onCheckedChange={(checked) => setSendNotifications(checked === true)}
              />
              <Label htmlFor="send-notifications" className="text-sm">
                Send registration notification emails to customers
              </Label>
            </div>

            {previewResult.summary.errorCount > 0 && (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>Some rows have errors</AlertTitle>
                <AlertDescription>
                  {previewResult.summary.errorCount} row(s) will be skipped due to validation
                  errors. Download the errors CSV to review and fix them.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setPreviewResult(null);
                }}
              >
                Back
              </Button>
              <Button onClick={handleImport} disabled={!canImport}>
                Import {previewResult.summary.validCount} Warranties
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <ImportProgress
            current={isRegistering ? 0 : importResult?.summary.totalCreated || 0}
            total={previewResult?.summary.validCount || 0}
          />
        )}

        {/* Step: Complete */}
        {step === 'complete' && importResult && (
          <ImportComplete
            result={importResult}
            skippedCount={previewResult?.summary.errorCount || 0}
            onViewWarranties={handleViewWarranties}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
