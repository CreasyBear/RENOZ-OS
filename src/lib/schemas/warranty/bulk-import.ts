/**
 * Warranty Bulk Import Validation Schemas
 *
 * Zod schemas for CSV bulk warranty import and registration.
 *
 * @see src/server/functions/warranty-bulk-import.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-005a
 */

import { z } from 'zod';
import { optionalEmailSchema } from '../_shared/patterns';
import { warrantyPolicyTypeSchema } from './policies';

// ============================================================================
// CSV ROW SCHEMA
// ============================================================================

/**
 * Single row from CSV for warranty import.
 * Supports flexible identification: email or id for customer, sku or id for product.
 */
export const csvWarrantyRowSchema = z.object({
  // Customer identification (one of these required)
  customer_email: optionalEmailSchema,
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

// ============================================================================
// PREVIEW SCHEMA
// ============================================================================

/**
 * Column mapping for CSV import.
 * Maps custom column names to expected field names.
 */
export const columnMappingSchema = z.object({
  customer_email: z.string().optional(),
  customer_id: z.string().optional(),
  product_sku: z.string().optional(),
  product_id: z.string().optional(),
  serial_number: z.string().optional(),
  registration_date: z.string().optional(),
  warranty_policy_id: z.string().optional(),
});

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

/**
 * Input schema for preview function.
 */
export const previewBulkWarrantyImportSchema = z.object({
  /** CSV content as string */
  csvContent: z.string().min(1, 'CSV content is required'),
  /** Optional header mapping if column names differ */
  columnMapping: columnMappingSchema.optional(),
});

export type PreviewBulkWarrantyImportInput = z.input<typeof previewBulkWarrantyImportSchema>;

// ============================================================================
// VALIDATED ROW SCHEMA
// ============================================================================

/**
 * A validated row ready for import.
 */
export const validatedWarrantyRowSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  serialNumber: z.string().optional(),
  registrationDate: z.string(), // ISO date string
  warrantyPolicyId: z.string().uuid(),
  policyType: warrantyPolicyTypeSchema,
});

export type ValidatedWarrantyRow = z.infer<typeof validatedWarrantyRowSchema>;

// ============================================================================
// BULK REGISTER SCHEMA
// ============================================================================

/**
 * Input schema for bulk registration.
 */
export const bulkRegisterWarrantiesSchema = z.object({
  /** Validated rows from preview */
  rows: z.array(validatedWarrantyRowSchema),
  /** Whether to send registration notifications */
  sendNotifications: z.boolean().default(true),
});

export type BulkRegisterWarrantiesInput = z.input<typeof bulkRegisterWarrantiesSchema>;

// ============================================================================
// RESPONSE TYPES (for reference, not validation)
// ============================================================================

/**
 * Preview result structure.
 * Note: These are output types, not input validation schemas.
 */
export interface ValidatedWarrantyRowWithDetails {
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

export interface PreviewSummary {
  totalRows: number;
  validCount: number;
  errorCount: number;
  byPolicyType: {
    battery_performance: number;
    inverter_manufacturer: number;
    installation_workmanship: number;
  };
}

export interface PreviewResult {
  validRows: ValidatedWarrantyRowWithDetails[];
  errorRows: ErrorRow[];
  summary: PreviewSummary;
}

export interface CreatedWarranty {
  id: string;
  warrantyNumber: string;
  customerId: string;
  productId: string;
}

export interface BulkRegisterSummary {
  totalCreated: number;
  byPolicyType: {
    battery_performance: number;
    inverter_manufacturer: number;
    installation_workmanship: number;
  };
}

export interface BulkRegisterResult {
  createdWarranties: CreatedWarranty[];
  summary: BulkRegisterSummary;
}

/** Props for WarrantyImportSettingsView */
export interface WarrantyImportSettingsViewProps {
  dialogOpen: boolean;
  lastImportResult: BulkRegisterResult | null;
  onDialogOpenChange: (open: boolean) => void;
  onStartImport: () => void;
  onDownloadTemplate: () => void;
  onViewWarranties: () => void;
  onViewPolicies: () => void;
  onImportComplete: (result: BulkRegisterResult) => void;
  onPreview: (payload: PreviewBulkWarrantyImportInput) => Promise<PreviewResult>;
  onRegister: (payload: BulkRegisterWarrantiesInput) => Promise<BulkRegisterResult>;
  onResetPreview: () => void;
  onResetRegister: () => void;
  isPreviewing: boolean;
  isRegistering: boolean;
}
