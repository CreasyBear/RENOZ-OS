/**
 * Serial Number Batch Entry Component
 *
 * Optimized component for entering large quantities of serial numbers.
 * Supports three entry methods:
 * 1. CSV upload (for bulk imports)
 * 2. Text area (paste serial numbers, one per line)
 * 3. Manual table entry (for small quantities or corrections)
 *
 * Features:
 * - Validation (duplicates, format, count matching)
 * - Real-time feedback
 * - Optimized for 100+ serial numbers
 * - Business logic validation (no duplicates across items)
 *
 * @see docs/design-system/BULK-OPERATIONS-STANDARDS.MD
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { Upload, FileText, Type, Table as TableIcon, AlertTriangle, Check, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toastError } from '@/hooks';
import { parseSerialNumberCSV, validateSerialNumberFormat } from './serial-number-csv-parser';

// ============================================================================
// TYPES
// ============================================================================

export interface SerialNumberBatchEntryProps {
  /** Required quantity (must match serial number count) */
  requiredQuantity: number;
  /** Existing serial numbers (for editing) */
  existingSerialNumbers?: string[];
  /** Callback when serial numbers change */
  onSerialNumbersChange: (serialNumbers: string[]) => void;
  /** Validation function for serial number format (defaults to basic alphanumeric validation) */
  validateFormat?: (serial: string) => { valid: boolean; error?: string };
  /** Additional className */
  className?: string;
}

type EntryMethod = 'csv' | 'text' | 'manual';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicateSerials: string[];
  invalidSerials: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SerialNumberBatchEntry({
  requiredQuantity,
  existingSerialNumbers = [],
  onSerialNumbersChange,
  validateFormat,
  className,
}: SerialNumberBatchEntryProps) {
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('text');
  const [textInput, setTextInput] = useState<string>('');
  const [manualSerials, setManualSerials] = useState<string[]>(() =>
    existingSerialNumbers.length > 0
      ? existingSerialNumbers
      : Array(requiredQuantity).fill('')
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current serial numbers based on entry method
  const currentSerialNumbers = useMemo(() => {
    switch (entryMethod) {
      case 'csv':
        // Will be populated from CSV parse
        return existingSerialNumbers;
      case 'text':
        return textInput
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      case 'manual':
        return manualSerials.filter((s) => s.trim().length > 0);
      default:
        return [];
    }
  }, [entryMethod, textInput, manualSerials, existingSerialNumbers]);

  // Validation
  const validation = useMemo<ValidationResult>(() => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      duplicateSerials: [],
      invalidSerials: [],
    };

    // Check count
    if (currentSerialNumbers.length !== requiredQuantity) {
      result.valid = false;
      result.errors.push(
        `Expected ${requiredQuantity} serial number${requiredQuantity !== 1 ? 's' : ''}, found ${currentSerialNumbers.length}`
      );
    }

    // Check for duplicates
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const serial of currentSerialNumbers) {
      const normalized = serial.trim().toUpperCase();
      if (seen.has(normalized)) {
        duplicates.add(serial);
      }
      seen.add(normalized);
    }

    if (duplicates.size > 0) {
      result.valid = false;
      result.duplicateSerials = Array.from(duplicates);
      result.errors.push(`Found ${duplicates.size} duplicate serial number${duplicates.size !== 1 ? 's' : ''}`);
    }

    // Validate format (always validate, use provided validator or default)
    const validator = validateFormat || validateSerialNumberFormat;
    for (const serial of currentSerialNumbers) {
      const validation = validator(serial);
      if (!validation.valid) {
        result.invalidSerials.push(serial);
        if (validation.error) {
          result.warnings.push(`${serial}: ${validation.error}`);
        }
      }
    }

    return result;
  }, [currentSerialNumbers, requiredQuantity, validateFormat]);

  // Handlers
  const handleCSVUpload = useCallback(
    async (file: File) => {
      const parsed = await parseSerialNumberCSV(file);
      const serials = parsed.map((row) => row.serialNumber).filter((s) => s.length > 0);
      setTextInput(serials.join('\n')); // Populate text input for editing
      setEntryMethod('text'); // Switch to text view for review
      onSerialNumbersChange(serials);
    },
    [onSerialNumbersChange]
  );

  const handleTextChange = useCallback(
    (value: string) => {
      setTextInput(value);
      const serials = value
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      onSerialNumbersChange(serials);
    },
    [onSerialNumbersChange]
  );

  const handleManualChange = useCallback(
    (index: number, value: string) => {
      const updated = [...manualSerials];
      updated[index] = value;
      setManualSerials(updated);
      const serials = updated.filter((s) => s.trim().length > 0);
      onSerialNumbersChange(serials);
    },
    [manualSerials, onSerialNumbersChange]
  );

  const handleAddManualRow = useCallback(() => {
    setManualSerials([...manualSerials, '']);
  }, [manualSerials]);

  const handleRemoveManualRow = useCallback(
    (index: number) => {
      const updated = manualSerials.filter((_, i) => i !== index);
      setManualSerials(updated);
      const serials = updated.filter((s) => s.trim().length > 0);
      onSerialNumbersChange(serials);
    },
    [manualSerials, onSerialNumbersChange]
  );

  const handleDownloadTemplate = useCallback(() => {
    const csv = 'Serial Number\nSN001\nSN002\nSN003';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'serial-numbers-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Render methods
  const renderCSVTab = () => (
    <div className="space-y-4">
      <div
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          'hover:border-primary'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-medium">Upload CSV File</h3>
        <p className="text-muted-foreground mb-4">
          Upload a CSV file with serial numbers. One serial number per row.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleCSVUpload(file).catch((err) => {
                toastError(err instanceof Error ? err.message : 'Failed to parse CSV');
              });
            }
          }}
          className="hidden"
        />
        <Button variant="outline" type="button">
          Choose File
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
        <span className="text-muted-foreground text-sm">
          CSV should have a header row with &quot;Serial Number&quot; column
        </span>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>CSV file with &quot;Serial Number&quot; column header</li>
            <li>One serial number per row</li>
            <li>Empty rows are ignored</li>
            <li>Maximum {requiredQuantity} serial numbers</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderTextTab = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="serial-text-input">
          Enter serial numbers (one per line)
        </Label>
        <Textarea
          id="serial-text-input"
          value={textInput}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="SN001&#10;SN002&#10;SN003&#10;..."
          className="font-mono text-sm min-h-[200px]"
          rows={Math.min(20, Math.max(5, currentSerialNumbers.length + 2))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Paste serial numbers here, one per line. Empty lines are ignored.
        </p>
      </div>

      {currentSerialNumbers.length > 0 && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {currentSerialNumbers.length} serial number{currentSerialNumbers.length !== 1 ? 's' : ''} entered
            </span>
            {currentSerialNumbers.length === requiredQuantity && (
              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {currentSerialNumbers.slice(0, 50).map((serial, i) => (
                <div key={i} className="text-xs font-mono text-muted-foreground">
                  {serial}
                </div>
              ))}
              {currentSerialNumbers.length > 50 && (
                <div className="text-xs text-muted-foreground">
                  ... and {currentSerialNumbers.length - 50} more
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  const renderManualTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Manual Entry</Label>
        <Button variant="outline" size="sm" onClick={handleAddManualRow}>
          Add Row
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {manualSerials.map((serial, index) => (
              <TableRow key={index}>
                <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                <TableCell>
                  <Input
                    value={serial}
                    onChange={(e) => handleManualChange(index, e.target.value)}
                    placeholder={`Serial ${index + 1}`}
                    className="font-mono"
                  />
                </TableCell>
                <TableCell>
                  {index >= requiredQuantity && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveManualRow(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Best for small quantities or making corrections. Add rows as needed.
      </p>
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={entryMethod} onValueChange={(v) => setEntryMethod(v as EntryMethod)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="csv">
            <Upload className="h-4 w-4 mr-2" />
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type className="h-4 w-4 mr-2" />
            Text Entry
          </TabsTrigger>
          <TabsTrigger value="manual">
            <TableIcon className="h-4 w-4 mr-2" />
            Manual Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-4">
          {renderCSVTab()}
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          {renderTextTab()}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          {renderManualTab()}
        </TabsContent>
      </Tabs>

      {/* Validation Summary */}
      {currentSerialNumbers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {currentSerialNumbers.length} / {requiredQuantity} serial numbers
            </span>
            {validation.valid && currentSerialNumbers.length === requiredQuantity ? (
              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Valid
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Issues Found
              </Badge>
            )}
          </div>

          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {validation.warnings.slice(0, 5).map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                  {validation.warnings.length > 5 && (
                    <li>... and {validation.warnings.length - 5} more warnings</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.duplicateSerials.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Duplicate serial numbers:</p>
                <div className="flex flex-wrap gap-1">
                  {validation.duplicateSerials.slice(0, 10).map((serial, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {serial}
                    </Badge>
                  ))}
                  {validation.duplicateSerials.length > 10 && (
                    <Badge variant="destructive" className="text-xs">
                      +{validation.duplicateSerials.length - 10} more
                    </Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
