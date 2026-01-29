/**
 * Bulk User Import Route
 *
 * CSV import wizard with validation, column mapping, and progress tracking.
 * Steps: Upload -> Map Columns -> Validate -> Import
 *
 * @see src/server/functions/users.ts for server functions
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  batchSendInvitations,
  type BatchInvitationItem,
} from '@/server/functions/users/invitations';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks';

// Icons
import {
  Upload,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Download,
} from 'lucide-react';

import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminFormSkeleton } from '@/components/skeletons/admin';

// Route definition
export const Route = createFileRoute('/_authenticated/admin/users/import' as any)({
  component: BulkUserImport,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin/users" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminFormSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// Types
type ImportStep = 'upload' | 'map' | 'validate' | 'import' | 'complete';
type UserRole = 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';

interface ParsedRow {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  row: number;
  email: string;
  valid: boolean;
  errors: string[];
}

// Required and optional fields
const REQUIRED_FIELDS = ['email'];
const OPTIONAL_FIELDS = ['firstName', 'lastName', 'role', 'message'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// Valid roles
const VALID_ROLES: UserRole[] = ['admin', 'manager', 'sales', 'operations', 'support', 'viewer'];

function BulkUserImport() {
  // Step state
  const [step, setStep] = useState<ImportStep>('upload');

  // File/data state
  const [, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

  // Import state
  const [, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: { email: string; error: string }[];
  } | null>(null);

  const batchInviteFn = useServerFn(batchSendInvitations);

  // Parse CSV file
  const parseCSV = useCallback((text: string) => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      toast.error('CSV must have at least a header row and one data row');
      return;
    }

    // Parse headers
    const headerLine = lines[0];
    const csvHeaders = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    setHeaders(csvHeaders);

    // Parse data rows
    const dataRows = lines.slice(1).map((line) => {
      // Simple CSV parsing (handles basic quoted fields)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      return values;
    });

    setRows(dataRows);

    // Auto-map columns
    const autoMapping: Record<string, string> = {};
    csvHeaders.forEach((header) => {
      const normalized = header.toLowerCase().replace(/[_\s-]/g, '');
      if (normalized.includes('email')) autoMapping['email'] = header;
      else if (normalized.includes('firstname') || normalized === 'first')
        autoMapping['firstName'] = header;
      else if (normalized.includes('lastname') || normalized === 'last')
        autoMapping['lastName'] = header;
      else if (normalized.includes('role')) autoMapping['role'] = header;
      else if (normalized.includes('message') || normalized.includes('note'))
        autoMapping['message'] = header;
    });
    setColumnMapping(autoMapping);

    setStep('map');
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFile = e.target.files?.[0];
      if (!uploadedFile) return;

      if (!uploadedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }

      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(uploadedFile);
    },
    [parseCSV]
  );

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      if (!droppedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }

      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(droppedFile);
    },
    [parseCSV]
  );

  // Apply column mapping and validate
  const validateData = useCallback(() => {
    // Check required fields are mapped
    if (!columnMapping['email']) {
      toast.error('Email column must be mapped');
      return;
    }

    // Parse rows with mapping
    const parsed: ParsedRow[] = rows.map((row) => {
      const data: ParsedRow = { email: '' };
      Object.entries(columnMapping).forEach(([field, csvHeader]) => {
        const colIndex = headers.indexOf(csvHeader);
        if (colIndex >= 0) {
          data[field] = row[colIndex];
        }
      });
      return data;
    });

    setParsedData(parsed);

    // Validate each row
    const results: ValidationResult[] = parsed.map((row, index) => {
      const errors: string[] = [];

      // Check email
      if (!row.email) {
        errors.push('Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push('Invalid email format');
      }

      // Check role if provided
      if (row.role && !VALID_ROLES.includes(row.role.toLowerCase() as UserRole)) {
        errors.push(`Invalid role: ${row.role}`);
      }

      return {
        row: index + 1,
        email: row.email || '(empty)',
        valid: errors.length === 0,
        errors,
      };
    });

    setValidationResults(results);
    setStep('validate');
  }, [rows, headers, columnMapping]);

  // Import users using batch processing
  const startImport = useCallback(async () => {
    const validRows = validationResults.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setStep('import');

    // Prepare batch invitation data
    const invitations: BatchInvitationItem[] = validRows.map((result) => {
      const rowData = parsedData[result.row - 1];
      return {
        email: rowData.email,
        role: (rowData.role?.toLowerCase() as UserRole) || 'viewer',
        personalMessage: rowData.message || undefined,
      };
    });

    try {
      // Show progress while processing
      setImportProgress(50);

      // Send all invitations in one batch call
      const result = await batchInviteFn({ data: { invitations } });

      setImportProgress(100);

      // Extract errors from results
      const errors = result.results
        .filter((r) => !r.success)
        .map((r) => ({
          email: r.email,
          error: r.error || 'Unknown error',
        }));

      setImportResults({
        success: result.summary.success,
        failed: result.summary.failed,
        errors,
      });
    } catch (err) {
      // If the entire batch fails, mark all as failed
      setImportResults({
        success: 0,
        failed: validRows.length,
        errors: validRows.map((r) => ({
          email: parsedData[r.row - 1].email,
          error: err instanceof Error ? err.message : 'Batch import failed',
        })),
      });
    }

    setImporting(false);
    setStep('complete');
  }, [validationResults, parsedData, batchInviteFn]);

  // Reset wizard
  const reset = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setParsedData([]);
    setValidationResults([]);
    setImportProgress(0);
    setImportResults(null);
  };

  // Download template
  const downloadTemplate = () => {
    const template =
      'email,firstName,lastName,role,message\njohn@example.com,John,Doe,sales,Welcome to the team!';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = validationResults.filter((r) => r.valid).length;
  const invalidCount = validationResults.filter((r) => !r.valid).length;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <a href="/admin/users" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Import Users</h1>
          <p className="text-muted-foreground text-sm">Bulk invite users from a CSV file</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center gap-2">
        {(['upload', 'map', 'validate', 'import', 'complete'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : ['upload', 'map', 'validate', 'import', 'complete'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {['upload', 'map', 'validate', 'import', 'complete'].indexOf(step) > i ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className="hidden text-sm sm:inline">
              {s === 'upload'
                ? 'Upload'
                : s === 'map'
                  ? 'Map Columns'
                  : s === 'validate'
                    ? 'Validate'
                    : s === 'import'
                      ? 'Import'
                      : 'Complete'}
            </span>
            {i < 4 && <div className="bg-border h-px w-8" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with user information. The file must include an email column.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              className="hover:border-primary cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-muted-foreground text-sm">or click to browse</p>
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Template Download */}
            <div className="bg-muted flex items-center justify-between rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Download Template</p>
                  <p className="text-muted-foreground text-sm">
                    Get a CSV template with the correct format
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map your CSV columns to the required fields. Email is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {ALL_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <div className="flex w-32 items-center gap-2">
                    <span className="font-medium capitalize">{field}</span>
                    {REQUIRED_FIELDS.includes(field) && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={columnMapping[field] || ''}
                    onValueChange={(value) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field]: value === '_unmapped' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_unmapped">-- Not mapped --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-6">
              <h4 className="mb-2 font-medium">Preview ({rows.length} rows)</h4>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 5 && (
                <p className="text-muted-foreground mt-2 text-sm">
                  ...and {rows.length - 5} more rows
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={validateData}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'validate' && (
        <Card>
          <CardHeader>
            <CardTitle>Validate Data</CardTitle>
            <CardDescription>Review validation results before importing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">{validCount} valid</span>
                </div>
              </div>
              {invalidCount > 0 && (
                <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">{invalidCount} invalid</span>
                  </div>
                </div>
              )}
            </div>

            {/* Validation Table */}
            <div className="max-h-96 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow key={result.row} className={result.valid ? '' : 'bg-red-50'}>
                      <TableCell>{result.row}</TableCell>
                      <TableCell>{result.email}</TableCell>
                      <TableCell>
                        {result.valid ? (
                          <Badge className="bg-green-500">Valid</Badge>
                        ) : (
                          <Badge variant="destructive">Invalid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-red-600">
                        {result.errors.join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('map')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={startImport} disabled={validCount === 0}>
                Import {validCount} Users
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'import' && (
        <Card>
          <CardHeader>
            <CardTitle>Importing Users</CardTitle>
            <CardDescription>Please wait while invitations are being sent...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Progress value={importProgress} className="flex-1" />
              <span className="text-sm font-medium">{importProgress}%</span>
            </div>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && importResults && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
            <CardDescription>Review the import results below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    {importResults.success} invitations sent
                  </span>
                </div>
              </div>
              {importResults.failed > 0 && (
                <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">{importResults.failed} failed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Details */}
            {importResults.errors.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Failed Invitations</h4>
                <div className="space-y-2">
                  {importResults.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                      <X className="h-4 w-4" />
                      <span>
                        {err.email}: {err.error}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={reset}>Import More</Button>
              <Button asChild variant="outline">
                <a href="/admin/invitations">View Invitations</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </PageLayout.Content>
    </PageLayout>
  );
}
