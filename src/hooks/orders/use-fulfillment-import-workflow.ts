import { useCallback, useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { toastSuccess } from '@/hooks/_shared/use-toast';
import {
  fulfillmentImportRowSchema,
  type FulfillmentImport,
  type FulfillmentImportRow,
} from '@/lib/schemas/orders/shipments';
import {
  getClientErrorMessage,
  normalizeShipmentMutationError,
} from './order-mutation-client-errors';

export const FULFILLMENT_IMPORT_PARSE_FAILED_MESSAGE =
  'Fulfillment import file could not be parsed. Check the CSV format and try again.';

export const FULFILLMENT_IMPORT_SUBMIT_FAILED_MESSAGE =
  'Fulfillment import could not be completed.';

const SAFE_PARSE_ERROR_MESSAGES = new Set([
  'CSV must include a header row and at least one data row.',
]);

export interface FulfillmentImportResult {
  imported: number;
  failed: number;
  skipped: number;
  results: Array<{
    orderNumber: string;
    shipmentId?: string;
    shipmentNumber?: string | null;
    status: 'imported' | 'skipped' | 'failed';
    message?: string;
  }>;
}

export type FulfillmentImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export type FulfillmentImportPreviewRow = {
  row: number;
  raw: Record<string, string | undefined>;
  data?: FulfillmentImportRow;
  isValid: boolean;
  errors: string[];
};

export type FulfillmentImportPreview = {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: FulfillmentImportPreviewRow[];
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, ''));
}

function mapImportHeader(header: string): keyof FulfillmentImportRow | null {
  const normalized = header.toLowerCase().replace(/[\s_-]/g, '');

  if (normalized.includes('ordernumber') || normalized === 'order') return 'orderNumber';
  if (normalized.includes('shipmentnumber')) return 'shipmentNumber';
  if (normalized.includes('trackingurl')) return 'trackingUrl';
  if (normalized.includes('trackingnumber') || normalized === 'tracking') return 'trackingNumber';
  if (normalized.includes('carrierservice') || normalized === 'service') return 'carrierService';
  if (normalized.includes('carrier')) return 'carrier';
  if (
    normalized.includes('shippedat') ||
    normalized.includes('shipdate') ||
    normalized.includes('shippeddate')
  ) {
    return 'shippedAt';
  }

  return null;
}

export function parseFulfillmentImport(content: string): FulfillmentImportPreview {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const headers = parseCsvLine(lines[0]);
  const mappedHeaders = headers.map(mapImportHeader);

  const rows: FulfillmentImportPreviewRow[] = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const raw: Record<string, string | undefined> = {};

    mappedHeaders.forEach((field, columnIndex) => {
      if (!field) return;

      const value = values[columnIndex]?.trim() ?? '';
      raw[field] = value.length > 0 ? value : undefined;
    });

    const result = fulfillmentImportRowSchema.safeParse(raw);

    if (result.success) {
      return {
        row: index + 2,
        raw,
        data: result.data,
        isValid: true,
        errors: [],
      };
    }

    return {
      row: index + 2,
      raw,
      isValid: false,
      errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  });

  const validCount = rows.filter((row) => row.isValid).length;
  const invalidCount = rows.length - validCount;

  return {
    totalRows: rows.length,
    validCount,
    invalidCount,
    rows,
  };
}

export function formatFulfillmentImportParseError(error: unknown): string {
  if (
    error instanceof Error &&
    SAFE_PARSE_ERROR_MESSAGES.has(error.message)
  ) {
    return error.message;
  }

  return FULFILLMENT_IMPORT_PARSE_FAILED_MESSAGE;
}

export function formatFulfillmentImportSubmitError(error: unknown): string {
  const normalized = normalizeShipmentMutationError(error, FULFILLMENT_IMPORT_SUBMIT_FAILED_MESSAGE);
  return getClientErrorMessage(normalized, FULFILLMENT_IMPORT_SUBMIT_FAILED_MESSAGE);
}

export function getValidFulfillmentImportRows(
  preview: FulfillmentImportPreview
): FulfillmentImportRow[] {
  return preview.rows.flatMap((row) => (row.isValid && row.data ? [row.data] : []));
}

export function buildFulfillmentImportResultsCsv(importResults: FulfillmentImportResult): string {
  const rows = importResults.results.map((result) => ({
    orderNumber: result.orderNumber,
    shipmentNumber: result.shipmentNumber ?? '',
    status: result.status,
    message: result.message ?? '',
  }));

  const headers = ['orderNumber', 'shipmentNumber', 'status', 'message'] as const;

  return [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((key) => `"${String(row[key]).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');
}

function downloadFulfillmentImportResults(importResults: FulfillmentImportResult) {
  const csv = buildFulfillmentImportResultsCsv(importResults);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'fulfillment-import-results.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function useFulfillmentImportWorkflow({
  importMutation,
}: {
  importMutation: UseMutationResult<FulfillmentImportResult, Error, FulfillmentImport>;
}) {
  const [step, setStep] = useState<FulfillmentImportStep>('upload');
  const [preview, setPreview] = useState<FulfillmentImportPreview | null>(null);
  const [importResults, setImportResults] = useState<FulfillmentImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);

  const reset = useCallback(() => {
    setStep('upload');
    setPreview(null);
    setImportResults(null);
    setParseError(null);
    setDryRun(false);
  }, []);

  const parseFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file.');
      return;
    }

    try {
      const content = await file.text();
      const parsed = parseFulfillmentImport(content);
      setPreview(parsed);
      setParseError(null);
      setStep('preview');
    } catch (error) {
      setParseError(formatFulfillmentImportParseError(error));
    }
  }, []);

  const importRows = useCallback(async () => {
    if (!preview) return;

    const validRows = getValidFulfillmentImportRows(preview);

    if (validRows.length === 0) {
      setParseError('No valid rows found to import.');
      return;
    }

    setStep('importing');

    try {
      const result = await importMutation.mutateAsync({
        rows: validRows,
        dryRun,
      });

      setImportResults(result);
      setStep('complete');
      toastSuccess(dryRun ? 'Dry run complete' : 'Fulfillment import complete');
    } catch (error) {
      setParseError(formatFulfillmentImportSubmitError(error));
      setStep('preview');
    }
  }, [dryRun, importMutation, preview]);

  const downloadResults = useCallback(() => {
    if (!importResults) return;

    downloadFulfillmentImportResults(importResults);
  }, [importResults]);

  return {
    step,
    preview,
    importResults,
    parseError,
    dryRun,
    setDryRun,
    reset,
    parseFile,
    importRows,
    downloadResults,
    isPending: importMutation.isPending,
  };
}
