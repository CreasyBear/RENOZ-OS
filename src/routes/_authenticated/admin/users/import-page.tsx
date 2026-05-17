/**
 * Bulk User Import Page Presenter Component
 *
 * CSV import wizard with validation, column mapping, and progress tracking.
 * Steps: Upload -> Map Columns -> Validate -> Import
 *
 * @source mutation from import-page-container.tsx
 * @see src/routes/_authenticated/admin/users/import-page-container.tsx - Container component
 */
import { Link } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { BatchSendInvitationsInput } from '@/hooks/users';
import { formatUserMutationError } from '@/hooks/users/user-mutation-error-messages';
import type { BatchInvitationResult } from '@/lib/schemas/users';
import {
  ALL_USER_IMPORT_FIELDS,
  REQUIRED_USER_IMPORT_FIELDS,
  buildBatchInvitationItems,
  buildParsedUserImportRows,
  createUserImportColumnMapping,
  formatUserImportParseError,
  formatUserImportResultError,
  isUserImportCsvFile,
  parseUserImportCsv,
  validateUserImportRows,
  type ImportStep,
  type ParsedUserImportRow,
  type UserImportValidationResult,
} from './import-page-workflow';

// UI Components
import { Button, buttonVariants } from '@/components/ui/button';
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

import { PageLayout } from '@/components/layout';

// ============================================================================
// PRESENTER PROPS INTERFACE
// ============================================================================

interface BulkUserImportPresenterProps {
  /** @source useBatchSendInvitations hook in import-page-container.tsx */
  batchSendInvitationsMutation: UseMutationResult<unknown, Error, BatchSendInvitationsInput, unknown>;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export default function BulkUserImportPresenter({
  batchSendInvitationsMutation,
}: BulkUserImportPresenterProps) {
  // Step state
  const [step, setStep] = useState<ImportStep>('upload');

  // File/data state
  const [, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [parsedData, setParsedData] = useState<ParsedUserImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<UserImportValidationResult[]>([]);

  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: { email: string; error: string }[];
  } | null>(null);

  // Parse CSV file
  const parseCSV = useCallback((text: string) => {
    try {
      const parsed = parseUserImportCsv(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setColumnMapping(createUserImportColumnMapping(parsed.headers));
      setStep('map');
    } catch (error) {
      toast.error(formatUserImportParseError(error));
    }
  }, []);

  const readCsvFile = useCallback(
    (selectedFile: File) => {
      if (!isUserImportCsvFile(selectedFile)) {
        toast.error('Please upload a CSV file');
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result !== 'string') {
          toast.error('CSV could not be read. Check the file format and try again.');
          return;
        }
        parseCSV(event.target.result);
      };
      reader.onerror = () => {
        toast.error('CSV could not be read. Check the file format and try again.');
      };
      reader.readAsText(selectedFile);
    },
    [parseCSV]
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFile = e.target.files?.[0];
      if (!uploadedFile) return;

      readCsvFile(uploadedFile);
    },
    [readCsvFile]
  );

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      readCsvFile(droppedFile);
    },
    [readCsvFile]
  );

  // Apply column mapping and validate
  const validateData = useCallback(() => {
    // Check required fields are mapped
    if (!columnMapping['email']) {
      toast.error('Email column must be mapped');
      return;
    }

    const parsed = buildParsedUserImportRows(rows, headers, columnMapping);
    setParsedData(parsed);
    setValidationResults(validateUserImportRows(parsed));
    setStep('validate');
  }, [rows, headers, columnMapping]);

  // Import users using batch processing
  const startImport = useCallback(async () => {
    const validRows = validationResults.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImportProgress(0);
    setStep('import');

    const invitations = buildBatchInvitationItems(validRows, parsedData);

    try {
      // Show progress while processing
      setImportProgress(50);

      // Send all invitations in one batch call using mutation hook
      const result = (await batchSendInvitationsMutation.mutateAsync({
        invitations,
      })) as { results: BatchInvitationResult[]; summary: { success: number; failed: number } };

      setImportProgress(100);

      const results: BatchInvitationResult[] = result.results;
      const errors = results
        .filter((r) => !r.success)
        .map((r) => ({
          email: r.email,
          error: formatUserImportResultError(r.error),
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
          error: formatUserMutationError(err, 'batchSendInvitations'),
        })),
      });
    }

    setStep('complete');
  }, [validationResults, parsedData, batchSendInvitationsMutation]);

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
        <Link to="/admin/users" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
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
              {ALL_USER_IMPORT_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <div className="flex w-32 items-center gap-2">
                    <span className="font-medium capitalize">{field}</span>
                    {REQUIRED_USER_IMPORT_FIELDS.includes(field) && (
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
              <Link
                to="/admin/invitations"
                search={{ page: 1, pageSize: 20, status: 'all' }}
                className={buttonVariants({ variant: 'outline' })}
              >
                View Invitations
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      </PageLayout.Content>
    </PageLayout>
  );
}
