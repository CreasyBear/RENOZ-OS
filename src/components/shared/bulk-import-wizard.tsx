/* eslint-disable react-refresh/only-export-components -- Component exports component + field types */
/**
 * BulkImportWizard Component
 *
 * Shared wizard for bulk importing entities from CSV files.
 * Supports:
 * - Configurable field definitions and mapping
 * - Customizable validation
 * - Dialog or standalone mode
 * - Progress tracking
 * - Import mode selection (create/update/both)
 */
import { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Check,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

/** Field definition for import mapping */
export interface ImportFieldDefinition {
  /** Field key used in data object */
  key: string;
  /** Display label for the field */
  label: string;
  /** Whether this field is required */
  required?: boolean;
  /** Auto-match patterns for CSV header names (lowercase) */
  autoMatchPatterns?: string[];
}

/** Parsed row from CSV */
export interface ParsedRow<T = Record<string, string>> {
  /** Row number in original file (1-indexed, excluding header) */
  rowNumber: number;
  /** Parsed data object */
  data: T;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Whether row is valid for import */
  isValid: boolean;
}

/** Field mapping from CSV column to system field */
export interface FieldMapping {
  csvColumn: string;
  systemField: string | null;
}

/** Import mode options */
export type ImportMode = 'create_only' | 'update_only' | 'create_or_update';

/** Result from import operation */
export interface ImportResult {
  /** Total rows processed */
  total: number;
  /** Rows successfully created */
  created: number;
  /** Rows successfully updated */
  updated?: number;
  /** Rows skipped */
  skipped: number;
  /** Errors encountered */
  errors: Array<{ row: number; error: string; sku?: string }>;
}

/** Configuration for the import wizard */
export interface BulkImportConfig<T = Record<string, string>> {
  /** Entity name for display (e.g., "Customer", "Product") */
  entityName: string;
  /** Plural entity name (e.g., "Customers", "Products") */
  entityNamePlural: string;
  /** Field definitions for mapping */
  fields: ImportFieldDefinition[];
  /** Whether to show field mapping step (default: true) */
  showFieldMapping?: boolean;
  /** Whether to show import mode selector (default: false) */
  showImportMode?: boolean;
  /** Template download URL or function */
  templateUrl?: string;
  /** Function to download template */
  onDownloadTemplate?: () => Promise<void>;
  /** Custom CSV parser (if not using default) */
  parseFile?: (file: File) => Promise<{
    headers: string[];
    rows: string[][];
  }>;
  /** Custom validation function */
  validateRow?: (
    data: Record<string, string>,
    rowNumber: number
  ) => {
    errors: string[];
    warnings: string[];
  };
  /** Preview columns to show in validation step */
  previewColumns?: Array<{
    key: string;
    label: string;
    render?: (data: T) => React.ReactNode;
  }>;
  /** Maximum rows per import (default: 1000) */
  maxRows?: number;
}

export interface BulkImportWizardProps<T = Record<string, string>> {
  /** Configuration for the import */
  config: BulkImportConfig<T>;
  /** Import function - receives validated data and returns result */
  onImport: (data: T[], mode?: ImportMode) => Promise<ImportResult>;
  /** Called when wizard is cancelled or completed */
  onClose: () => void;
  /** Whether to render as dialog (default: false) */
  asDialog?: boolean;
  /** Dialog open state (required if asDialog=true) */
  open?: boolean;
  /** Dialog open change handler (required if asDialog=true) */
  onOpenChange?: (open: boolean) => void;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface FileUploadStepProps {
  templateUrl?: string;
  onDownloadTemplate?: () => Promise<void>;
  maxRows: number;
  requiredFields: string[];
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  error?: string | null;
}

function FileUploadStep({
  templateUrl,
  onDownloadTemplate,
  maxRows,
  requiredFields,
  onFileSelected,
  isProcessing,
  error,
}: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith('.csv') || file?.type === 'text/csv') {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          'hover:border-primary'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('csv-upload')?.click()}
      >
        <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-medium">Upload CSV File</h3>
        <p className="text-muted-foreground mb-4">
          Drag and drop your CSV file here, or click to browse
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
        />
        <Button variant="outline" type="button">
          Choose File
        </Button>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="text-primary mr-2 h-6 w-6 animate-spin" />
          <span>Parsing file...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        {(templateUrl || onDownloadTemplate) && (
          <>
            {templateUrl ? (
              <Button variant="outline" asChild>
                <a href={templateUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </a>
              </Button>
            ) : (
              <Button variant="outline" onClick={onDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            )}
            <span className="text-muted-foreground text-sm">
              Use our template to ensure correct formatting
            </span>
          </>
        )}
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>CSV Requirements</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>File must be comma-separated (CSV format)</li>
            <li>First row should contain column headers</li>
            <li>Maximum {maxRows.toLocaleString()} rows per import</li>
            {requiredFields.length > 0 && <li>Required fields: {requiredFields.join(', ')}</li>}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

interface FieldMappingStepProps {
  csvColumns: string[];
  mappings: FieldMapping[];
  fields: ImportFieldDefinition[];
  sampleData: string[][];
  onMappingChange: (csvColumn: string, systemField: string | null) => void;
}

function FieldMappingStep({
  csvColumns,
  mappings,
  fields,
  sampleData,
  onMappingChange,
}: FieldMappingStepProps) {
  const getMappedSystemField = (csvColumn: string) => {
    const mapping = mappings.find((m) => m.csvColumn === csvColumn);
    return mapping?.systemField ?? null;
  };

  const handleChange = (csvColumn: string, value: string) => {
    onMappingChange(csvColumn, value === 'skip' ? null : value);
  };

  const requiredFields = fields.filter((f) => f.required);
  const mappedRequiredFields = requiredFields.filter((f) =>
    mappings.some((m) => m.systemField === f.key)
  );
  const missingRequired = requiredFields.filter(
    (f) => !mappings.some((m) => m.systemField === f.key)
  );

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Map Your Columns</AlertTitle>
        <AlertDescription>
          Match each CSV column to a system field. Unmapped columns will be skipped.
        </AlertDescription>
      </Alert>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CSV Column</TableHead>
              <TableHead>Sample Data</TableHead>
              <TableHead>System Field</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {csvColumns.map((column, i) => (
              <TableRow key={column}>
                <TableCell className="font-medium">{column}</TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {sampleData[0]?.[i] ?? '-'}
                </TableCell>
                <TableCell>
                  <Select
                    value={getMappedSystemField(column) ?? 'skip'}
                    onValueChange={(v) => handleChange(column, v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Skip this column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this column</SelectItem>
                      {fields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                          {field.required && ' *'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Required fields status */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Required fields:</span>
        {requiredFields.map((f) => (
          <Badge key={f.key} variant={mappedRequiredFields.includes(f) ? 'default' : 'destructive'}>
            {f.label}
            {mappedRequiredFields.includes(f) && <Check className="ml-1 h-3 w-3" />}
          </Badge>
        ))}
      </div>

      {missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Required Fields</AlertTitle>
          <AlertDescription>
            You must map columns to: {missingRequired.map((f) => f.label).join(', ')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface ValidationStepProps<T> {
  parsedRows: ParsedRow<T>[];
  totalRows: number;
  previewColumns?: Array<{
    key: string;
    label: string;
    render?: (data: T) => React.ReactNode;
  }>;
  importMode?: ImportMode;
  showImportMode?: boolean;
  onImportModeChange?: (mode: ImportMode) => void;
}

function ValidationStep<T extends Record<string, unknown>>({
  parsedRows,
  totalRows,
  previewColumns,
  importMode,
  showImportMode,
  onImportModeChange,
}: ValidationStepProps<T>) {
  const validRows = parsedRows.filter((r) => r.isValid);
  const errorRows = parsedRows.filter((r) => !r.isValid);
  const warningRows = parsedRows.filter((r) => r.warnings.length > 0);

  const defaultColumns = [
    { key: 'rowNumber', label: 'Row' },
    { key: 'status', label: 'Status' },
  ];

  const columns = previewColumns ?? [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{totalRows}</p>
            <p className="text-muted-foreground text-sm">Total Rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
            <p className="text-muted-foreground text-sm">Ready to Import</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">{warningRows.length}</p>
            <p className="text-muted-foreground text-sm">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">{errorRows.length}</p>
            <p className="text-muted-foreground text-sm">Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Import mode selector */}
      {showImportMode && onImportModeChange && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Import mode:</span>
          <Select value={importMode} onValueChange={(v) => onImportModeChange(v as ImportMode)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="create_or_update">Create or Update</SelectItem>
              <SelectItem value="create_only">Create Only</SelectItem>
              <SelectItem value="update_only">Update Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Error List */}
      {errorRows.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ScrollArea className="mt-2 h-[150px]">
              {errorRows.slice(0, 10).map((row) => (
                <div key={row.rowNumber} className="mb-1 text-sm">
                  Row {row.rowNumber}: {row.errors.join(', ')}
                </div>
              ))}
              {errorRows.length > 10 && (
                <p className="text-sm">...and {errorRows.length - 10} more errors</p>
              )}
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preview (first 5 rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {defaultColumns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  {columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.slice(0, 5).map((row) => (
                  <TableRow key={row.rowNumber} className={!row.isValid ? 'bg-red-50' : ''}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>
                      {!row.isValid ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : row.warnings.length > 0 ? (
                        <Badge variant="secondary">Warning</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Valid</Badge>
                      )}
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.render
                          ? col.render(row.data)
                          : String((row.data as Record<string, unknown>)[col.key] ?? '-')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface ImportProgressStepProps {
  progress: number;
  result: ImportResult | null;
  isComplete: boolean;
  entityNamePlural: string;
}

function ImportProgressStep({
  progress,
  result,
  isComplete,
  entityNamePlural,
}: ImportProgressStepProps) {
  const hasUpdates = result?.updated !== undefined && result.updated > 0;

  return (
    <div className="space-y-6">
      {!isComplete ? (
        <div className="py-8 text-center">
          <RefreshCw className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
          <h3 className="mb-2 text-lg font-medium">Importing {entityNamePlural}...</h3>
          <p className="text-muted-foreground mb-4">Please don&apos;t close this window</p>
          <Progress value={progress} className="mx-auto max-w-md" />
          <p className="text-muted-foreground mt-2 text-sm">{progress}% complete</p>
        </div>
      ) : result ? (
        <div className="py-8 text-center">
          {result.errors.length === 0 ? (
            <Check className="mx-auto mb-4 h-12 w-12 text-green-600" />
          ) : (
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-600" />
          )}
          <h3 className="mb-4 text-lg font-medium">
            {result.errors.length === 0 ? 'Import Complete!' : 'Import completed with some errors'}
          </h3>

          <div
            className={cn(
              'mx-auto mb-6 grid max-w-md gap-4',
              hasUpdates ? 'grid-cols-4' : 'grid-cols-3'
            )}
          >
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-muted-foreground text-sm">Created</p>
            </div>
            {hasUpdates && (
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-muted-foreground text-sm">Updated</p>
              </div>
            )}
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
              <p className="text-muted-foreground text-sm">Skipped</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
              <p className="text-muted-foreground text-sm">Errors</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <Alert variant="destructive" className="mx-auto max-w-md text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Some rows failed to import</AlertTitle>
              <AlertDescription>
                <ScrollArea className="mt-2 h-[100px]">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-sm">
                      Row {err.row}
                      {err.sku && ` (${err.sku})`}: {err.error}
                    </p>
                  ))}
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type WizardStep = 'upload' | 'mapping' | 'validate' | 'importing';

export function BulkImportWizard<T extends Record<string, string> = Record<string, string>>({
  config,
  onImport,
  onClose,
  asDialog = false,
  open,
  onOpenChange,
  className,
}: BulkImportWizardProps<T>) {
  const {
    entityNamePlural,
    fields,
    showFieldMapping = true,
    showImportMode = false,
    templateUrl,
    onDownloadTemplate,
    validateRow,
    previewColumns,
    maxRows = 1000,
  } = config;

  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [_file, setFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow<T>[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('create_or_update');
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredFields = fields.filter((f) => f.required);

  // Reset state
  const resetState = useCallback(() => {
    setCurrentStep('upload');
    setFile(null);
    setCsvColumns([]);
    setSampleData([]);
    setMappings([]);
    setParsedRows([]);
    setImportProgress(0);
    setImportResult(null);
    setIsProcessing(false);
    setError(null);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetState();
    onClose();
    onOpenChange?.(false);
  }, [resetState, onClose, onOpenChange]);

  // Default CSV parser
  const defaultParseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim().replace(/"/g, '')));
    return { headers, rows };
  };

  // Auto-map columns based on patterns
  const autoMapColumns = useCallback(
    (headers: string[]): FieldMapping[] => {
      return headers.map((header) => {
        const lowerHeader = header.toLowerCase();
        let systemField: string | null = null;

        for (const field of fields) {
          if (field.autoMatchPatterns) {
            for (const pattern of field.autoMatchPatterns) {
              if (lowerHeader.includes(pattern)) {
                systemField = field.key;
                break;
              }
            }
          }
          if (systemField) break;
        }

        return { csvColumn: header, systemField };
      });
    },
    [fields]
  );

  // Default validation
  const defaultValidateRow = useCallback(
    (data: Record<string, string>, _rowNumber: number) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const field of requiredFields) {
        if (!data[field.key]) {
          errors.push(`Missing ${field.label}`);
        }
      }

      return { errors, warnings };
    },
    [requiredFields]
  );

  // Parse rows with current mappings
  const parseRowsWithMappings = useCallback(
    (dataRows: string[][], currentMappings: FieldMapping[]): ParsedRow<T>[] => {
      const validator = validateRow ?? defaultValidateRow;

      return dataRows.map((row, i) => {
        const data: Record<string, string> = {};

        currentMappings.forEach((mapping, j) => {
          if (mapping.systemField && row[j]) {
            data[mapping.systemField] = row[j];
          }
        });

        const { errors, warnings } = validator(data, i + 2);

        return {
          rowNumber: i + 2, // 1-indexed, header is row 1
          data: data as T,
          errors,
          warnings,
          isValid: errors.length === 0,
        };
      });
    },
    [validateRow, defaultValidateRow]
  );

  // Handle file selection
  const handleFileSelected = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setError(null);
      setIsProcessing(true);

      try {
        const parser = config.parseFile ?? defaultParseCSV;
        const { headers, rows } = await parser(selectedFile);

        if (rows.length > maxRows) {
          setError(`File contains ${rows.length} rows. Maximum allowed is ${maxRows}.`);
          setIsProcessing(false);
          return;
        }

        setCsvColumns(headers);
        setSampleData(rows.slice(0, 3));

        const autoMappings = autoMapColumns(headers);
        setMappings(autoMappings);

        const parsed = parseRowsWithMappings(rows, autoMappings);
        setParsedRows(parsed);

        // Skip mapping step if not showing it
        setCurrentStep(showFieldMapping ? 'mapping' : 'validate');
      } catch (err) {
        console.error('Failed to parse file:', err);
        setError(err instanceof Error ? err.message : 'Failed to parse file');
      } finally {
        setIsProcessing(false);
      }
    },
    [config.parseFile, maxRows, autoMapColumns, parseRowsWithMappings, showFieldMapping]
  );

  // Handle mapping change
  const handleMappingChange = useCallback(
    (csvColumn: string, systemField: string | null) => {
      setMappings((prev) => {
        const updated = prev.map((m) => (m.csvColumn === csvColumn ? { ...m, systemField } : m));
        return updated;
      });
    },
    []
  );

  // Re-validate when mappings change
  const revalidateWithMappings = useCallback(() => {
    // We need original data rows stored somewhere to re-parse
    // For now, just update the parsed rows based on new mappings
    setParsedRows((prev) =>
      prev.map((row) => {
        const validator = validateRow ?? defaultValidateRow;
        const { errors, warnings } = validator(row.data as Record<string, string>, row.rowNumber);
        return {
          ...row,
          errors,
          warnings,
          isValid: errors.length === 0,
        };
      })
    );
  }, [validateRow, defaultValidateRow]);

  // Start import
  const handleImport = useCallback(async () => {
    setCurrentStep('importing');
    setIsProcessing(true);
    setImportProgress(0);

    const validRows = parsedRows.filter((r) => r.isValid);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      const result = await onImport(
        validRows.map((r) => r.data),
        showImportMode ? importMode : undefined
      );

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Import failed:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
      setCurrentStep('validate');
    } finally {
      setIsProcessing(false);
    }
  }, [parsedRows, onImport, showImportMode, importMode]);

  // Check if can proceed to next step
  const canProceed = useCallback(() => {
    if (currentStep === 'mapping') {
      return requiredFields.every((f) => mappings.some((m) => m.systemField === f.key));
    }
    if (currentStep === 'validate') {
      return parsedRows.some((r) => r.isValid);
    }
    return true;
  }, [currentStep, requiredFields, mappings, parsedRows]);

  // Get step number for progress display
  const getStepNumber = (step: WizardStep): number => {
    const steps: WizardStep[] = showFieldMapping
      ? ['upload', 'mapping', 'validate', 'importing']
      : ['upload', 'validate', 'importing'];
    return steps.indexOf(step) + 1;
  };

  const stepLabels = showFieldMapping
    ? ['Upload', 'Map Fields', 'Validate', 'Import']
    : ['Upload', 'Validate', 'Import'];

  // Render content
  const content = (
    <div className={cn('space-y-6', className)}>
      {/* Header - only shown in non-dialog mode */}
      {!asDialog && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Import {entityNamePlural}</h2>
            <p className="text-muted-foreground">
              Bulk import {entityNamePlural.toLowerCase()} from a CSV file
            </p>
          </div>
          {currentStep !== 'importing' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Steps indicator */}
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                getStepNumber(currentStep) > i + 1
                  ? 'bg-primary text-primary-foreground'
                  : getStepNumber(currentStep) === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {getStepNumber(currentStep) > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="ml-2 hidden text-sm sm:inline">{label}</span>
            {i < stepLabels.length - 1 && (
              <ChevronRight className="text-muted-foreground mx-4 h-4 w-4" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 'upload' && (
            <FileUploadStep
              templateUrl={templateUrl}
              onDownloadTemplate={onDownloadTemplate}
              maxRows={maxRows}
              requiredFields={requiredFields.map((f) => f.label)}
              onFileSelected={handleFileSelected}
              isProcessing={isProcessing}
              error={error}
            />
          )}
          {currentStep === 'mapping' && (
            <FieldMappingStep
              csvColumns={csvColumns}
              mappings={mappings}
              fields={fields}
              sampleData={sampleData}
              onMappingChange={handleMappingChange}
            />
          )}
          {currentStep === 'validate' && (
            <ValidationStep
              parsedRows={parsedRows}
              totalRows={parsedRows.length}
              previewColumns={previewColumns}
              importMode={importMode}
              showImportMode={showImportMode}
              onImportModeChange={setImportMode}
            />
          )}
          {currentStep === 'importing' && (
            <ImportProgressStep
              progress={importProgress}
              result={importResult}
              isComplete={!isProcessing}
              entityNamePlural={entityNamePlural}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep !== 'importing' && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 'mapping') setCurrentStep('upload');
              else if (currentStep === 'validate') {
                setCurrentStep(showFieldMapping ? 'mapping' : 'upload');
              }
            }}
            disabled={currentStep === 'upload'}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep === 'mapping' && (
            <Button
              onClick={() => {
                revalidateWithMappings();
                setCurrentStep('validate');
              }}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {currentStep === 'validate' && (
            <Button onClick={handleImport} disabled={!canProceed()}>
              <Upload className="mr-2 h-4 w-4" />
              Import {parsedRows.filter((r) => r.isValid).length} {entityNamePlural}
            </Button>
          )}
        </div>
      )}

      {currentStep === 'importing' && importResult && (
        <div className="flex justify-center">
          <Button onClick={handleClose}>Done</Button>
        </div>
      )}
    </div>
  );

  // Render as dialog or standalone
  if (asDialog) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[80vh] max-w-3xl sm:max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import {entityNamePlural}</DialogTitle>
            <DialogDescription>
              {currentStep === 'upload' &&
                `Upload a CSV file to import ${entityNamePlural.toLowerCase()}`}
              {currentStep === 'mapping' && 'Map your CSV columns to system fields'}
              {currentStep === 'validate' && 'Review and validate your data before importing'}
              {currentStep === 'importing' &&
                (importResult
                  ? 'Import complete'
                  : `Importing ${entityNamePlural.toLowerCase()}...`)}
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}

// ============================================================================
// PRE-CONFIGURED FIELD DEFINITIONS
// ============================================================================

/** Customer import field definitions */
export const CUSTOMER_IMPORT_FIELDS: ImportFieldDefinition[] = [
  {
    key: 'name',
    label: 'Company Name',
    required: true,
    autoMatchPatterns: ['company', 'name', 'business'],
  },
  {
    key: 'customerCode',
    label: 'Customer Code',
    autoMatchPatterns: ['code', 'id', 'customer_code'],
  },
  { key: 'legalName', label: 'Legal Name', autoMatchPatterns: ['legal'] },
  { key: 'type', label: 'Type', autoMatchPatterns: ['type'] },
  { key: 'status', label: 'Status', autoMatchPatterns: ['status'] },
  { key: 'industry', label: 'Industry', autoMatchPatterns: ['industry'] },
  { key: 'size', label: 'Size', autoMatchPatterns: ['size'] },
  { key: 'website', label: 'Website', autoMatchPatterns: ['website', 'url'] },
  { key: 'taxId', label: 'Tax ID / ABN', autoMatchPatterns: ['tax', 'abn', 'ein'] },
  {
    key: 'contactFirstName',
    label: 'Primary Contact First Name',
    autoMatchPatterns: ['first'],
  },
  { key: 'contactLastName', label: 'Primary Contact Last Name', autoMatchPatterns: ['last'] },
  { key: 'contactEmail', label: 'Primary Contact Email', autoMatchPatterns: ['email'] },
  { key: 'contactPhone', label: 'Primary Contact Phone', autoMatchPatterns: ['phone'] },
  { key: 'addressStreet', label: 'Address Street', autoMatchPatterns: ['street', 'address'] },
  { key: 'addressCity', label: 'Address City', autoMatchPatterns: ['city'] },
  { key: 'addressState', label: 'Address State', autoMatchPatterns: ['state'] },
  { key: 'addressPostcode', label: 'Address Postcode', autoMatchPatterns: ['postcode', 'zip'] },
];

/** Product import field definitions */
export const PRODUCT_IMPORT_FIELDS: ImportFieldDefinition[] = [
  { key: 'sku', label: 'SKU', required: true, autoMatchPatterns: ['sku', 'code', 'id'] },
  { key: 'name', label: 'Product Name', required: true, autoMatchPatterns: ['name', 'title'] },
  { key: 'description', label: 'Description', autoMatchPatterns: ['description', 'desc'] },
  { key: 'categoryName', label: 'Category', autoMatchPatterns: ['category'] },
  { key: 'type', label: 'Type', autoMatchPatterns: ['type'] },
  { key: 'status', label: 'Status', autoMatchPatterns: ['status'] },
  {
    key: 'basePrice',
    label: 'Base Price',
    required: true,
    autoMatchPatterns: ['price', 'base_price', 'cost'],
  },
  { key: 'costPrice', label: 'Cost Price', autoMatchPatterns: ['cost', 'cost_price'] },
];
