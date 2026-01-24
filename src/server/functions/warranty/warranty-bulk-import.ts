/**
 * Warranty Bulk Import Server Functions
 *
 * CSV parsing, validation, and bulk warranty registration.
 * Handles standalone bulk registration separate from order-based auto-registration.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-005a
 */

import { eq, and, sql, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { warranties, warrantyPolicies, customers, products } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { triggerWarrantyRegistrationNotification } from './warranty-policies';
import { typedPostFn } from '@/lib/server/typed-server-fn';

const MAX_IMPORT_ROWS = 1000;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5MB

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Single row from CSV for warranty import.
 * Supports flexible identification: email or id for customer, sku or id for product.
 */
export const csvWarrantyRowSchema = z.object({
  // Customer identification (one of these required)
  customer_email: z.string().email().optional(),
  customer_id: z.string().uuid().optional(),

  // Product identification (one of these required)
  product_sku: z.string().optional(),
  product_id: z.string().uuid().optional(),

  // Optional fields
  serial_number: z.string().optional(),
  registration_date: z.string().optional(), // DD/MM/YYYY or ISO format
  warranty_policy_id: z.string().uuid().optional(),
});

export type CsvWarrantyRow = z.infer<typeof csvWarrantyRowSchema>;

/**
 * Input schema for preview function.
 */
export const previewBulkWarrantyImportSchema = z.object({
  /** CSV content as string */
  csvContent: z
    .string()
    .min(1, 'CSV content is required')
    .max(MAX_IMPORT_BYTES, 'CSV content exceeds 5MB limit'),
  /** Optional header mapping if column names differ */
  columnMapping: z
    .object({
      customer_email: z.string().optional(),
      customer_id: z.string().optional(),
      product_sku: z.string().optional(),
      product_id: z.string().optional(),
      serial_number: z.string().optional(),
      registration_date: z.string().optional(),
      warranty_policy_id: z.string().optional(),
    })
    .optional(),
});

export type PreviewBulkWarrantyImportInput = z.input<typeof previewBulkWarrantyImportSchema>;

/**
 * Input schema for bulk registration.
 */
export const bulkRegisterWarrantiesSchema = z.object({
  /** Validated rows from preview */
  rows: z.array(
    z.object({
      customerId: z.string().uuid(),
      productId: z.string().uuid(),
      serialNumber: z.string().optional(),
      registrationDate: z.string(), // ISO date string
      warrantyPolicyId: z.string().uuid(),
      policyType: z.enum([
        'battery_performance',
        'inverter_manufacturer',
        'installation_workmanship',
      ]),
    })
  ),
  /** Whether to send registration notifications */
  sendNotifications: z.boolean().default(true),
});

export type BulkRegisterWarrantiesInput = z.input<typeof bulkRegisterWarrantiesSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface ValidatedWarrantyRow {
  rowNumber: number;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  serialNumber: string | null;
  registrationDate: string; // ISO date
  warrantyPolicyId: string;
  policyName: string;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  expiryDate: string; // Computed ISO date
}

export interface ErrorRow {
  rowNumber: number;
  rawData: Record<string, string>;
  errors: string[];
}

export interface PreviewResult {
  validRows: ValidatedWarrantyRow[];
  errorRows: ErrorRow[];
  summary: {
    totalRows: number;
    validCount: number;
    errorCount: number;
    byPolicyType: {
      battery_performance: number;
      inverter_manufacturer: number;
      installation_workmanship: number;
    };
  };
}

export interface BulkRegisterResult {
  createdWarranties: Array<{
    id: string;
    warrantyNumber: string;
    customerId: string;
    productId: string;
  }>;
  summary: {
    totalCreated: number;
    byPolicyType: {
      battery_performance: number;
      inverter_manufacturer: number;
      installation_workmanship: number;
    };
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse CSV content into rows.
 * Supports comma-separated values with quoted strings.
 */
function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // Handle escaped quotes ""
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map((line) => parseRow(line));

  return { headers, rows };
}

/**
 * Parse date in DD/MM/YYYY or ISO format to ISO string.
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try DD/MM/YYYY format (Australian)
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }

  return null;
}

/**
 * Generate warranty number in WRN-YYYY-NNNNN format.
 */
async function generateWarrantyNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WRN-${year}-`;

  // Get the max warranty number for this year and org
  const result = await db
    .select({
      maxNumber: sql<string>`MAX(${warranties.warrantyNumber})`,
    })
    .from(warranties)
    .where(
      and(
        eq(warranties.organizationId, organizationId),
        sql`${warranties.warrantyNumber} LIKE ${prefix + '%'}`
      )
    );

  const maxNumber = result[0]?.maxNumber;
  let nextSequence = 1;

  if (maxNumber) {
    const match = maxNumber.match(/WRN-\d{4}-(\d+)$/);
    if (match) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
}

/**
 * Calculate expiry date from registration date and policy duration.
 */
function calculateExpiryDate(registrationDate: Date, durationMonths: number): Date {
  const expiry = new Date(registrationDate);
  expiry.setMonth(expiry.getMonth() + durationMonths);
  return expiry;
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Preview bulk warranty import from CSV.
 *
 * Parses CSV, validates each row, and returns preview with errors.
 * Does not create any warranties - use bulkRegisterWarrantiesFromCsv for that.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-005a
 */
export const previewBulkWarrantyImport = typedPostFn(
  previewBulkWarrantyImportSchema,
  async ({ data }): Promise<PreviewResult> => {
    const ctx = await withAuth();
    const { csvContent, columnMapping } = data;

    // Parse CSV
    const { headers, rows } = parseCsv(csvContent);

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`CSV exceeds maximum of ${MAX_IMPORT_ROWS} rows`);
    }

    if (rows.length === 0) {
      return {
        validRows: [],
        errorRows: [],
        summary: {
          totalRows: 0,
          validCount: 0,
          errorCount: 0,
          byPolicyType: {
            battery_performance: 0,
            inverter_manufacturer: 0,
            installation_workmanship: 0,
          },
        },
      };
    }

    // Apply column mapping if provided
    const getColumnIndex = (field: string): number => {
      const mappedName = columnMapping?.[field as keyof typeof columnMapping] || field;
      return headers.indexOf(mappedName.toLowerCase().replace(/\s+/g, '_'));
    };

    // Pre-fetch all unique customer emails and IDs
    const customerEmails = new Set<string>();
    const customerIds = new Set<string>();
    const productSkus = new Set<string>();
    const productIds = new Set<string>();
    const serialNumbers = new Set<string>();

    rows.forEach((row) => {
      const email = row[getColumnIndex('customer_email')]?.trim();
      const custId = row[getColumnIndex('customer_id')]?.trim();
      const sku = row[getColumnIndex('product_sku')]?.trim();
      const prodId = row[getColumnIndex('product_id')]?.trim();
      const serial = row[getColumnIndex('serial_number')]?.trim();

      if (email) customerEmails.add(email.toLowerCase());
      if (custId) customerIds.add(custId);
      if (sku) productSkus.add(sku);
      if (prodId) productIds.add(prodId);
      if (serial) serialNumbers.add(serial);
    });

    // Batch fetch customers
    const customerMap = new Map<
      string,
      { id: string; name: string | null; email: string | null }
    >();

    if (customerEmails.size > 0 || customerIds.size > 0) {
      const customerConditions = [];
      if (customerEmails.size > 0) {
        customerConditions.push(
          inArray(sql`LOWER(${customers.email})`, Array.from(customerEmails))
        );
      }
      if (customerIds.size > 0) {
        customerConditions.push(inArray(customers.id, Array.from(customerIds)));
      }

      const fetchedCustomers = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(eq(customers.organizationId, ctx.organizationId), or(...customerConditions)));

      fetchedCustomers.forEach((c) => {
        customerMap.set(c.id, c);
        if (c.email) {
          customerMap.set(c.email.toLowerCase(), c);
        }
      });
    }

    // Batch fetch products
    const productMap = new Map<
      string,
      {
        id: string;
        name: string | null;
        sku: string;
        warrantyPolicyId: string | null;
        categoryId: string | null;
      }
    >();

    if (productSkus.size > 0 || productIds.size > 0) {
      const productConditions = [];
      if (productSkus.size > 0) {
        productConditions.push(inArray(products.sku, Array.from(productSkus)));
      }
      if (productIds.size > 0) {
        productConditions.push(inArray(products.id, Array.from(productIds)));
      }

      const fetchedProducts = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          warrantyPolicyId: products.warrantyPolicyId,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(and(eq(products.organizationId, ctx.organizationId), or(...productConditions)));

      fetchedProducts.forEach((p) => {
        productMap.set(p.id, p);
        productMap.set(p.sku, p);
      });
    }

    // Batch fetch existing serial numbers to check for duplicates
    const existingSerials = new Set<string>();
    if (serialNumbers.size > 0) {
      const existingWarranties = await db
        .select({ serial: warranties.productSerial })
        .from(warranties)
        .where(
          and(
            eq(warranties.organizationId, ctx.organizationId),
            inArray(warranties.productSerial, Array.from(serialNumbers))
          )
        );

      existingWarranties.forEach((w) => {
        if (w.serial) existingSerials.add(w.serial);
      });
    }

    // Fetch all active warranty policies
    const policyMap = new Map<
      string,
      {
        id: string;
        name: string;
        type: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
        durationMonths: number;
      }
    >();
    const defaultPolicies = new Map<
      string,
      {
        id: string;
        name: string;
        type: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
        durationMonths: number;
      }
    >();

    const allPolicies = await db
      .select({
        id: warrantyPolicies.id,
        name: warrantyPolicies.name,
        type: warrantyPolicies.type,
        durationMonths: warrantyPolicies.durationMonths,
        isDefault: warrantyPolicies.isDefault,
      })
      .from(warrantyPolicies)
      .where(
        and(
          eq(warrantyPolicies.organizationId, ctx.organizationId),
          eq(warrantyPolicies.isActive, true)
        )
      );

    allPolicies.forEach((p) => {
      policyMap.set(p.id, {
        id: p.id,
        name: p.name,
        type: p.type,
        durationMonths: p.durationMonths,
      });
      if (p.isDefault) {
        defaultPolicies.set(p.type, {
          id: p.id,
          name: p.name,
          type: p.type,
          durationMonths: p.durationMonths,
        });
      }
    });

    // Track serial numbers within the CSV to detect duplicates within the batch
    const csvSerialsSeen = new Set<string>();

    // Process each row
    const validRows: ValidatedWarrantyRow[] = [];
    const errorRows: ErrorRow[] = [];
    const today = new Date();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because line 1 is headers, and we want 1-based
      const errors: string[] = [];

      // Build raw data for error reporting
      const rawData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rawData[h] = row[idx] || '';
      });

      // Extract values
      const customerEmail = row[getColumnIndex('customer_email')]?.trim();
      const custId = row[getColumnIndex('customer_id')]?.trim();
      const productSku = row[getColumnIndex('product_sku')]?.trim();
      const prodId = row[getColumnIndex('product_id')]?.trim();
      const serialNumber = row[getColumnIndex('serial_number')]?.trim() || null;
      const registrationDateStr = row[getColumnIndex('registration_date')]?.trim();
      const policyId = row[getColumnIndex('warranty_policy_id')]?.trim();

      // Validate customer
      let customer: { id: string; name: string | null; email: string | null } | undefined;
      if (custId) {
        customer = customerMap.get(custId);
        if (!customer) {
          errors.push(`Customer with ID "${custId}" not found`);
        }
      } else if (customerEmail) {
        customer = customerMap.get(customerEmail.toLowerCase());
        if (!customer) {
          errors.push(`Customer with email "${customerEmail}" not found`);
        }
      } else {
        errors.push('Either customer_email or customer_id is required');
      }

      // Validate product
      let product:
        | {
            id: string;
            name: string | null;
            sku: string;
            warrantyPolicyId: string | null;
            categoryId: string | null;
          }
        | undefined;
      if (prodId) {
        product = productMap.get(prodId);
        if (!product) {
          errors.push(`Product with ID "${prodId}" not found`);
        }
      } else if (productSku) {
        product = productMap.get(productSku);
        if (!product) {
          errors.push(`Product with SKU "${productSku}" not found`);
        }
      } else {
        errors.push('Either product_sku or product_id is required');
      }

      // Validate serial number uniqueness
      if (serialNumber) {
        if (existingSerials.has(serialNumber)) {
          errors.push(`Serial number "${serialNumber}" already registered`);
        } else if (csvSerialsSeen.has(serialNumber)) {
          errors.push(`Duplicate serial number "${serialNumber}" in CSV`);
        } else {
          csvSerialsSeen.add(serialNumber);
        }
      }

      // Parse registration date (default to today)
      let registrationDate: Date;
      if (registrationDateStr) {
        const parsed = parseDate(registrationDateStr);
        if (!parsed) {
          errors.push(
            `Invalid registration date "${registrationDateStr}" (use DD/MM/YYYY or ISO format)`
          );
          registrationDate = today;
        } else {
          registrationDate = new Date(parsed);
        }
      } else {
        registrationDate = today;
      }

      // Resolve warranty policy
      let policy:
        | {
            id: string;
            name: string;
            type: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
            durationMonths: number;
          }
        | undefined;

      if (policyId) {
        policy = policyMap.get(policyId);
        if (!policy) {
          errors.push(`Warranty policy with ID "${policyId}" not found`);
        }
      } else if (product?.warrantyPolicyId) {
        // Use product's assigned policy
        policy = policyMap.get(product.warrantyPolicyId);
      }

      // Fall back to default policy for battery or inverter (guess based on product category/type)
      if (!policy && product) {
        // Try battery default first, then inverter, then installation
        policy =
          defaultPolicies.get('battery_performance') ||
          defaultPolicies.get('inverter_manufacturer') ||
          defaultPolicies.get('installation_workmanship');
      }

      if (!policy) {
        errors.push('No warranty policy specified and no default policy available');
      }

      // Add to appropriate list
      if (errors.length > 0) {
        errorRows.push({ rowNumber, rawData, errors });
      } else if (customer && product && policy) {
        const expiryDate = calculateExpiryDate(registrationDate, policy.durationMonths);

        validRows.push({
          rowNumber,
          customerId: customer.id,
          customerName: customer.name,
          productId: product.id,
          productName: product.name,
          serialNumber,
          registrationDate: registrationDate.toISOString(),
          warrantyPolicyId: policy.id,
          policyName: policy.name,
          policyType: policy.type,
          expiryDate: expiryDate.toISOString(),
        });
      }
    }

    // Build summary
    const byPolicyType = {
      battery_performance: 0,
      inverter_manufacturer: 0,
      installation_workmanship: 0,
    };
    validRows.forEach((r) => {
      byPolicyType[r.policyType]++;
    });

    return {
      validRows,
      errorRows,
      summary: {
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errorRows.length,
        byPolicyType,
      },
    };
  }
);

/**
 * Bulk register warranties from validated CSV data.
 *
 * Takes validated rows from previewBulkWarrantyImport and creates warranty records.
 * Generates warranty numbers, calculates expiry dates, optionally sends notifications.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-005a
 */
export const bulkRegisterWarrantiesFromCsv = typedPostFn(
  bulkRegisterWarrantiesSchema,
  async ({ data }): Promise<BulkRegisterResult> => {
    const ctx = await withAuth();
    const { rows, sendNotifications } = data;

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`Import exceeds maximum of ${MAX_IMPORT_ROWS} rows`);
    }

    if (rows.length === 0) {
      return {
        createdWarranties: [],
        summary: {
          totalCreated: 0,
          byPolicyType: {
            battery_performance: 0,
            inverter_manufacturer: 0,
            installation_workmanship: 0,
          },
        },
      };
    }

    // Fetch policy details for duration calculation
    const policyIds = [...new Set(rows.map((r) => r.warrantyPolicyId))];
    const policies = await db
      .select({
        id: warrantyPolicies.id,
        durationMonths: warrantyPolicies.durationMonths,
        cycleLimit: warrantyPolicies.cycleLimit,
      })
      .from(warrantyPolicies)
      .where(inArray(warrantyPolicies.id, policyIds));

    const policyDurationMap = new Map(
      policies.map((p) => [p.id, { durationMonths: p.durationMonths, cycleLimit: p.cycleLimit }])
    );

    // Generate warranty numbers and create records
    const createdWarranties: BulkRegisterResult['createdWarranties'] = [];
    const byPolicyType = {
      battery_performance: 0,
      inverter_manufacturer: 0,
      installation_workmanship: 0,
    };

    for (const row of rows) {
      const warrantyNumber = await generateWarrantyNumber(ctx.organizationId);
      const registrationDate = new Date(row.registrationDate);
      const policyInfo = policyDurationMap.get(row.warrantyPolicyId);
      const expiryDate = calculateExpiryDate(registrationDate, policyInfo?.durationMonths || 12);

      const [warranty] = await db
        .insert(warranties)
        .values({
          organizationId: ctx.organizationId,
          warrantyNumber,
          customerId: row.customerId,
          productId: row.productId,
          productSerial: row.serialNumber || null,
          warrantyPolicyId: row.warrantyPolicyId,
          registrationDate,
          expiryDate,
          status: 'active',
          createdBy: ctx.user.id,
        })
        .returning({
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
        });

      createdWarranties.push({
        id: warranty.id,
        warrantyNumber: warranty.warrantyNumber,
        customerId: row.customerId,
        productId: row.productId,
      });

      byPolicyType[row.policyType]++;

      // Trigger notification if enabled
      if (sendNotifications) {
        try {
          await triggerWarrantyRegistrationNotification({
            warrantyId: warranty.id,
            warrantyNumber: warranty.warrantyNumber,
            organizationId: ctx.organizationId,
            customerId: row.customerId,
            productId: row.productId,
            productSerial: row.serialNumber,
            policyId: row.warrantyPolicyId,
            registrationDate,
            expiryDate,
          });
        } catch (error) {
          // Log but don't fail the import
          console.error(
            `[warranty-bulk-import] Failed to send notification for ${warranty.warrantyNumber}:`,
            error
          );
        }
      }
    }

    return {
      createdWarranties,
      summary: {
        totalCreated: createdWarranties.length,
        byPolicyType,
      },
    };
  }
);
