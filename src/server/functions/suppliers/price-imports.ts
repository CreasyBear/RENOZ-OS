/**
 * Price Import Server Functions
 *
 * Bulk import and update functionality for supplier pricing.
 * Supports CSV import with validation and preview.
 */
import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { priceLists } from "drizzle/schema/suppliers";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPriceChangeRequest } from "./price-history";

// ============================================================================
// IMPORT VALIDATION
// ============================================================================

const priceImportRowSchema = z.object({
  supplierCode: z.string().min(1),
  supplierName: z.string().optional(),
  productName: z.string().min(1),
  productSku: z.string().optional(),
  basePrice: z.string().transform(val => parseFloat(val.replace(/[$,]/g, ''))),
  currency: z.string().default('AUD'),
  discountType: z.enum(['percentage', 'fixed', 'volume']).default('percentage'),
  discountValue: z.string().default('0').transform(val => parseFloat(val || '0')),
  minOrderQty: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  maxOrderQty: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

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
    // Auth check only - ctx not used for validation preview
    await withAuth({ permission: PERMISSIONS.suppliers.update });

    const rows = parseCSV(data.csvContent);
    const headers = data.hasHeaders ? rows[0] : null;
    const dataRows = data.hasHeaders ? rows.slice(1) : rows;

    const validationResults = [];
    const validRows = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = data.hasHeaders ? i + 2 : i + 1;

      try {
        // Create object from headers or indexed columns (string values before schema parse)
        let rowData: Record<string, string> = {};

        if (headers) {
          headers.forEach((header, index) => {
            rowData[header.trim().toLowerCase().replace(/\s+/g, '')] = row[index] || '';
          });
        } else {
          // Assume standard column order
          rowData = {
            suppliercode: row[0] || '',
            suppliername: row[1] || '',
            productname: row[2] || '',
            productsku: row[3] || '',
            baseprice: row[4] || '',
            currency: row[5] || 'AUD',
            discounttype: row[6] || 'percentage',
            discountvalue: row[7] || '0',
            minorderqty: row[8] || '',
            maxorderqty: row[9] || '',
            effectivedate: row[10] || '',
            expirydate: row[11] || '',
            status: row[12] || 'active',
          };
        }

        const validatedRow = priceImportRowSchema.parse(rowData);
        validRows.push({ rowNumber, data: validatedRow });
        validationResults.push({
          rowNumber,
          status: 'valid',
          data: validatedRow,
        });
      } catch (error) {
        const validationError = error as z.ZodError;
        const errorMessages = validationError.issues.map((err: z.ZodIssue) =>
          `${err.path.join('.')}: ${err.message}`
        );

        errors.push({
          rowNumber,
          errors: errorMessages,
        });

        validationResults.push({
          rowNumber,
          status: 'invalid',
          errors: errorMessages,
          rawData: row,
        });
      }
    }

    return {
      totalRows: dataRows.length,
      validRows: validRows.length,
      invalidRows: errors.length,
      validationResults,
      summary: {
        errors: errors.slice(0, 10), // Show first 10 errors
        hasMoreErrors: errors.length > 10,
      },
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
    })),
    approvalRequired: z.boolean().default(false),
    importReason: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    const results = [];
    const changeRequests = [];

    for (const row of data.validatedRows) {
      try {
        // Check if price already exists (by supplier + product)
        // For now, we'll create new prices - in production you'd want upsert logic
        // Generate a placeholder product ID - in production, this should be looked up from productSku
        const productId = randomUUID();

        const [newPrice] = await db
          .insert(priceLists)
          .values({
            organizationId: ctx.organizationId,
            supplierId: `temp-${row.data.supplierCode}`, // You'd resolve to actual supplier ID
            productId,
            productName: row.data.productName,
            productSku: row.data.productSku ?? null,
            basePrice: row.data.basePrice, // numericCasted accepts number directly
            currency: row.data.currency,
            discountType: row.data.discountType,
            discountValue: row.data.discountValue, // numericCasted accepts number directly
            minOrderQty: row.data.minOrderQty,
            maxOrderQty: row.data.maxOrderQty,
            effectiveDate: row.data.effectiveDate ?? new Date().toISOString().split('T')[0],
            expiryDate: row.data.expiryDate ?? null,
            status: row.data.status,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();

        // Create change request for audit trail
        if (data.approvalRequired) {
          const changeRequest = await createPriceChangeRequest({
            data: {
              priceListId: newPrice.id,
              newPrice: row.data.basePrice,
              changeReason: `Bulk import: ${data.importReason || 'CSV import'}`,
              notes: `Created via CSV import for product: ${row.data.productName}`,
            }
          });
          changeRequests.push(changeRequest);
        }

        results.push({
          rowNumber: row.rowNumber,
          status: 'success',
          priceId: newPrice.id,
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
      changeRequests,
    };
  });

/**
 * Get import template for price lists
 */
export const getPriceImportTemplate = createServerFn({ method: "GET" })
  .handler(async () => {
    const headers = [
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
    ];

    const sampleData = [
      [
        'SUP001',
        'Office Depot',
        'Office Chair',
        'CHR-001',
        '250.00',
        'AUD',
        'percentage',
        '10',
        '1',
        '',
        '2024-01-01',
        '2024-12-31',
        'active',
      ],
      [
        'SUP002',
        'TechCorp Solutions',
        'Standing Desk',
        'DSK-002',
        '450.00',
        'AUD',
        'fixed',
        '25.00',
        '5',
        '100',
        '2024-01-01',
        '2024-12-31',
        'active',
      ],
    ];

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