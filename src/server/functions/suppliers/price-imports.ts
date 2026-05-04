/**
 * Price Import Server Functions
 *
 * Bulk import and update functionality for supplier pricing.
 * Supports CSV import with validation and preview.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceLists } from "drizzle/schema/suppliers";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ValidationError } from "@/lib/server/errors";
import {
  assertResolvedResolution,
  calculateEffectivePrice,
  resolveImportRow,
} from "./price-resolution";
import type { PriceImportResolutionStatus } from "./price-resolution";

// ============================================================================
// IMPORT VALIDATION
// ============================================================================

function parseNonNegativeDecimal(value: string, fieldName: string, ctx: z.RefinementCtx): number {
  const normalized = value.replace(/[$,]/g, '').trim();
  const parsed = Number(normalized);

  if (!normalized || !Number.isFinite(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be a valid number`,
    });
    return z.NEVER;
  }

  if (parsed < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be 0 or greater`,
    });
    return z.NEVER;
  }

  return parsed;
}

function parseOptionalPositiveInteger(
  value: string | undefined,
  fieldName: string,
  ctx: z.RefinementCtx
): number | undefined {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    return undefined;
  }

  if (!/^\d+$/.test(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be a whole number`,
    });
    return z.NEVER;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (parsed < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be at least 1`,
    });
    return z.NEVER;
  }

  return parsed;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? '';
  return normalized || undefined;
}

function parseCurrencyCode(value: string, ctx: z.RefinementCtx): string {
  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Currency must use a 3-letter code',
    });
    return z.NEVER;
  }

  return normalized;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const [yearPart, monthPart, dayPart] = value.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(Date.UTC(0, month - 1, day));
  date.setUTCFullYear(year);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseOptionalIsoDate(
  value: string | undefined,
  fieldName: string,
  ctx: z.RefinementCtx
): string | undefined {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  if (!ISO_DATE_PATTERN.test(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must use YYYY-MM-DD format`,
    });
    return z.NEVER;
  }

  if (!isValidCalendarDate(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be a valid calendar date`,
    });
    return z.NEVER;
  }

  return normalized;
}

const priceImportRowSchema = z.object({
  supplierCode: z.string().min(1),
  supplierName: z.string().optional().transform(normalizeOptionalString),
  productName: z.string().min(1),
  productSku: z.string().optional().transform(normalizeOptionalString),
  basePrice: z.string().transform((val, ctx) => parseNonNegativeDecimal(val, 'Base price', ctx)),
  currency: z.string().default('AUD').transform((val, ctx) => parseCurrencyCode(val, ctx)),
  discountType: z.enum(['percentage', 'fixed', 'volume']).default('percentage'),
  discountValue: z.string().default('0').transform((val, ctx) => parseNonNegativeDecimal(val || '0', 'Discount value', ctx)),
  minOrderQty: z.string().optional().transform((val, ctx) => parseOptionalPositiveInteger(val, 'Minimum order quantity', ctx)),
  maxOrderQty: z.string().optional().transform((val, ctx) => parseOptionalPositiveInteger(val, 'Maximum order quantity', ctx)),
  effectiveDate: z.string().optional().transform((val, ctx) => parseOptionalIsoDate(val, 'Effective date', ctx)),
  expiryDate: z.string().optional().transform((val, ctx) => parseOptionalIsoDate(val, 'Expiry date', ctx)),
  status: z.enum(['active', 'inactive']).default('active'),
}).superRefine((row, ctx) => {
  if (row.discountType === 'volume') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountType'],
      message: 'Volume discounts are not supported in supplier price imports',
    });
  }

  if (row.discountType === 'percentage' && row.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Percentage discount must be 100 or less',
    });
  }

  if (
    row.minOrderQty !== undefined &&
    row.maxOrderQty !== undefined &&
    row.minOrderQty > row.maxOrderQty
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxOrderQty'],
      message: 'Maximum order quantity must be greater than or equal to minimum order quantity',
    });
  }

  if (row.effectiveDate && row.expiryDate && row.expiryDate < row.effectiveDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiryDate'],
      message: 'Expiry date must be on or after effective date',
    });
  }
});
type PriceImportColumnKey = keyof z.input<typeof priceImportRowSchema>;
type PriceImportRowData = Partial<Record<PriceImportColumnKey, string>>;

const PRICE_IMPORT_COLUMN_KEYS = [
  'supplierCode',
  'supplierName',
  'productName',
  'productSku',
  'basePrice',
  'currency',
  'discountType',
  'discountValue',
  'minOrderQty',
  'maxOrderQty',
  'effectiveDate',
  'expiryDate',
  'status',
] as const satisfies readonly PriceImportColumnKey[];

const PRICE_IMPORT_HEADER_ALIASES: Record<string, PriceImportColumnKey> = {
  suppliercode: 'supplierCode',
  suppliername: 'supplierName',
  productname: 'productName',
  productsku: 'productSku',
  sku: 'productSku',
  baseprice: 'basePrice',
  price: 'basePrice',
  currency: 'currency',
  discounttype: 'discountType',
  discountvalue: 'discountValue',
  minorderqty: 'minOrderQty',
  minimumorderqty: 'minOrderQty',
  maxorderqty: 'maxOrderQty',
  maximumorderqty: 'maxOrderQty',
  effectivedate: 'effectiveDate',
  expirydate: 'expiryDate',
  expirationdate: 'expiryDate',
  status: 'status',
};

export const PRICE_IMPORT_TEMPLATE_HEADERS = [
  'Supplier Code',
  'Supplier Name',
  'Product Name',
  'Product SKU',
  'Base Price',
  'Currency',
  'Discount Type',
  'Discount Value',
  'Min Order Qty',
  'Max Order Qty',
  'Effective Date',
  'Expiry Date',
  'Status',
] as const;

export const PRICE_IMPORT_TEMPLATE_SAMPLE_ROWS = [
  [
    'CELL001',
    'Battery Cell Supply Co',
    'RENOZ 100Ah Lithium Battery',
    'RNZ-LFP-100',
    '250.00',
    'AUD',
    'percentage',
    '10',
    '1',
    '',
    '2026-01-01',
    '2026-12-31',
    'active',
  ],
  [
    'BMS002',
    'Power Electronics Supply Co',
    'RENOZ 200Ah Lithium Battery',
    'RNZ-LFP-200',
    '450.00',
    'AUD',
    'fixed',
    '25.00',
    '5',
    '100',
    '2026-01-01',
    '2026-12-31',
    'active',
  ],
] as const;

// Agreement import schema for future bulk agreement imports
export const agreementImportRowSchema = z.object({
  supplierCode: z.string().min(1),
  supplierName: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  totalItems: z.string().default('0').transform(val => parseInt(val || '0')),
  status: z.enum(['draft', 'pending', 'approved']).default('draft'),
});

const priceImportResolutionSchema = z.object({
  status: z.enum([
    "resolved",
    "unresolved_supplier",
    "unresolved_product",
    "ambiguous_product",
    "duplicate_target",
  ]),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().optional(),
  productId: z.string().uuid().optional(),
  productName: z.string().optional(),
  productSku: z.string().nullable().optional(),
  existingPriceListId: z.string().uuid().optional(),
  message: z.string().optional(),
});

type PriceImportValidationStatus = 'valid' | 'invalid';
type PriceImportValidationResult = {
  status: PriceImportValidationStatus;
};
type PriceImportSummaryError = {
  rowNumber: number;
  errors: string[];
};
type PriceImportSummarySource = PriceImportValidationResult & {
  rowNumber: number;
  errors?: string[];
  resolution?: {
    status: PriceImportResolutionStatus;
    message?: string;
  };
};

export function getPriceImportValidationStatus(
  resolutionStatus: PriceImportResolutionStatus
): PriceImportValidationStatus {
  return resolutionStatus === 'resolved' || resolutionStatus === 'duplicate_target' ? 'valid' : 'invalid';
}

export function countInvalidPriceImportRows(
  validationResults: readonly PriceImportValidationResult[]
): number {
  return validationResults.filter((result) => result.status === 'invalid').length;
}

export function countValidPriceImportRows(
  validationResults: readonly PriceImportValidationResult[]
): number {
  return validationResults.filter((result) => result.status === 'valid').length;
}

export function buildPriceImportSummary(
  validationResults: readonly PriceImportSummarySource[],
  limit = 10
): { errors: PriceImportSummaryError[]; hasMoreErrors: boolean } {
  const errors = validationResults.flatMap((result): PriceImportSummaryError[] => {
    if (result.status !== 'invalid') {
      return [];
    }

    if (result.errors?.length) {
      return [{ rowNumber: result.rowNumber, errors: result.errors }];
    }

    if (result.resolution?.message) {
      return [{ rowNumber: result.rowNumber, errors: [result.resolution.message] }];
    }

    return [{ rowNumber: result.rowNumber, errors: ['Price import row could not be resolved'] }];
  });

  return {
    errors: errors.slice(0, limit),
    hasMoreErrors: errors.length > limit,
  };
}

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current); // Add last field
    return result;
  });
}

function normalizeImportHeader(header: string): PriceImportColumnKey | null {
  return PRICE_IMPORT_HEADER_ALIASES[header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] ?? null;
}

function normalizeImportCell(key: PriceImportColumnKey, value: string | undefined): string {
  const normalized = value?.trim() ?? '';

  if (key === 'currency') {
    return normalized.toUpperCase();
  }

  if (key === 'discountType' || key === 'status') {
    return normalized.toLowerCase();
  }

  return normalized;
}

function applyPriceImportRowDefaults(rowData: PriceImportRowData): PriceImportRowData {
  if (!rowData.currency) rowData.currency = 'AUD';
  if (!rowData.discountType) rowData.discountType = 'percentage';
  if (!rowData.discountValue) rowData.discountValue = '0';
  if (!rowData.status) rowData.status = 'active';

  return rowData;
}

export function buildPriceImportRowData(
  row: string[],
  headers: string[] | null
): Partial<PriceImportRowData> {
  const rowData: PriceImportRowData = {};

  if (headers) {
    headers.forEach((header, index) => {
      const key = normalizeImportHeader(header);
      if (key) {
        rowData[key] = normalizeImportCell(key, row[index]);
      }
    });
    return applyPriceImportRowDefaults(rowData);
  }

  PRICE_IMPORT_COLUMN_KEYS.forEach((key, index) => {
    rowData[key] = normalizeImportCell(key, row[index]);
  });

  return applyPriceImportRowDefaults(rowData);
}

export function parsePriceImportRowData(rowData: Partial<PriceImportRowData>) {
  return priceImportRowSchema.parse(rowData);
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Validate and preview price list import
 */
export const validatePriceImport = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    csvContent: z.string(),
    hasHeaders: z.boolean().default(true),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    const rows = parseCSV(data.csvContent);
    const headers = data.hasHeaders ? rows[0] : null;
    const dataRows = data.hasHeaders ? rows.slice(1) : rows;

    const validationResults = [];
    const resolvedCandidateRows = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = data.hasHeaders ? i + 2 : i + 1;

      try {
        // Create object from headers or indexed columns (string values before schema parse)
        const rowData = buildPriceImportRowData(row, headers);

        const validatedRow = parsePriceImportRowData(rowData);
        const effectiveDate = validatedRow.effectiveDate ?? new Date().toISOString().split('T')[0];
        const resolution = await resolveImportRow({
          organizationId: ctx.organizationId,
          supplierCode: validatedRow.supplierCode,
          productSku: validatedRow.productSku ?? null,
          productName: validatedRow.productName,
          effectiveDate,
        });

        resolvedCandidateRows.push({ rowNumber, data: validatedRow, resolution });
        validationResults.push({
          rowNumber,
          status: getPriceImportValidationStatus(resolution.status),
          data: validatedRow,
          resolution,
        });
      } catch (error) {
        const errorMessages =
          error instanceof z.ZodError
            ? error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
            : [error instanceof Error ? error.message : 'Unknown validation error'];

        errors.push({
          rowNumber,
          errors: errorMessages,
        });

        validationResults.push({
          rowNumber,
          status: 'invalid' as const,
          errors: errorMessages,
          rawData: row,
        });
      }
    }

    return {
      totalRows: dataRows.length,
      validRows: countValidPriceImportRows(validationResults),
      invalidRows: countInvalidPriceImportRows(validationResults),
      validationResults,
      summary: buildPriceImportSummary(validationResults),
      resolvedRows: resolvedCandidateRows.filter((row) => row.resolution.status === 'resolved').length,
      duplicateRows: resolvedCandidateRows.filter((row) => row.resolution.status === 'duplicate_target').length,
    };
  });

/**
 * Execute price list import after validation
 */
export const executePriceImport = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    validatedRows: z.array(z.object({
      rowNumber: z.number(),
      data: priceImportRowSchema,
      resolution: priceImportResolutionSchema,
    })),
    approvalRequired: z.boolean().default(false),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    if (data.approvalRequired) {
      throw new ValidationError(
        "Supplier price import approval workflow is not available yet. Run the import without approval or create price change requests separately."
      );
    }

    const unresolvedRows = data.validatedRows.filter(
      (row) => row.resolution.status !== "resolved" && row.resolution.status !== "duplicate_target"
    );
    if (unresolvedRows.length > 0) {
      throw new ValidationError(
        "Price import contains unresolved rows. Re-run validation and fix the identified supplier/product matches before import."
      );
    }

    const results = [];

    for (const row of data.validatedRows) {
      try {
        const effectiveDate = row.data.effectiveDate ?? new Date().toISOString().split('T')[0];
        const executionResolution = await resolveImportRow({
          organizationId: ctx.organizationId,
          supplierCode: row.data.supplierCode,
          productSku: row.data.productSku ?? null,
          productName: row.data.productName,
          effectiveDate,
        });
        if (
          executionResolution.status !== "resolved" &&
          executionResolution.status !== "duplicate_target"
        ) {
          throw new ValidationError(
            executionResolution.message ??
              `Price import row ${row.rowNumber} could not be resolved. Re-run validation and try again.`
          );
        }

        const effectivePrice = calculateEffectivePrice({
          basePrice: row.data.basePrice,
          discountType: row.data.discountType,
          discountValue: row.data.discountValue,
        });
        assertResolvedResolution(executionResolution);

        const priceValues = {
          organizationId: ctx.organizationId,
          supplierId: executionResolution.supplierId,
          productId: executionResolution.productId,
          supplierName: executionResolution.supplierName ?? row.data.supplierName ?? null,
          productName: executionResolution.productName ?? row.data.productName,
          productSku: executionResolution.productSku ?? row.data.productSku ?? null,
          basePrice: row.data.basePrice,
          price: row.data.basePrice,
          effectivePrice,
          currency: row.data.currency,
          discountType: row.data.discountType,
          discountValue: row.data.discountValue,
          minQuantity: row.data.minOrderQty ?? 1,
          minOrderQty: row.data.minOrderQty,
          maxOrderQty: row.data.maxOrderQty,
          effectiveDate,
          expiryDate: row.data.expiryDate ?? null,
          status: row.data.status,
          isActive: row.data.status === 'active',
          lastUpdated: new Date(),
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        };

        let persistedPrice;
        if (executionResolution.existingPriceListId) {
          const [updatedPrice] = await db
            .update(priceLists)
            .set({
              ...priceValues,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(priceLists.id, executionResolution.existingPriceListId),
                eq(priceLists.organizationId, ctx.organizationId)
              )
            )
            .returning();
          persistedPrice = updatedPrice;
        } else {
          const [newPrice] = await db.insert(priceLists).values(priceValues).returning();
          persistedPrice = newPrice;
        }

        if (!persistedPrice) {
          throw new ValidationError(
            `Price import row ${row.rowNumber} could not be saved. Refresh validation and try again.`
          );
        }

        results.push({
          rowNumber: row.rowNumber,
          status: 'success',
          action: executionResolution.existingPriceListId ? 'updated' : 'created',
          priceId: persistedPrice.id,
        });
      } catch (error) {
        results.push({
          rowNumber: row.rowNumber,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    return {
      totalProcessed: data.validatedRows.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    };
  });

/**
 * Get import template for price lists
 */
export const getPriceImportTemplate = createServerFn({ method: "GET" })
  .handler(async () => {
    const headers = [...PRICE_IMPORT_TEMPLATE_HEADERS];
    const sampleData = PRICE_IMPORT_TEMPLATE_SAMPLE_ROWS.map((row) => [...row]);

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      filename: 'price-import-template.csv',
      content: csvContent,
      headers,
      sampleRows: sampleData.length,
    };
  });
