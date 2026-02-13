/**
 * Zod Schemas Barrel Export
 *
 * All validation schemas are organized in domain subdirectories.
 * Import from this file or from domain barrels (e.g., @/lib/schemas/customers).
 *
 * @see docs/solutions/codebase-organization/consolidate-duplicate-zod-schemas.md
 */

// Foundation patterns (shared across domains)
export * from "./_shared";

// Core entity schemas
export * from "./customers";
export * from "./products";
export * from "./orders";
export * from "./invoices";

// Pipeline and inventory
export * from "./pipeline";
export * from "./inventory";

// Auth and multi-tenancy
export * from "./auth";
export * from "./users";
// Resolve UserProfile conflict: auth (Zod-inferred) wins over users (interface)
export type { UserProfile } from "./auth";

// Activity audit trail
export * from "./activities";

// Files and storage
export * from "./files";

// Jobs domain (field work assignments)
export * from "./jobs";

// Communications (import directly from '@/lib/schemas/communications' to avoid name collisions)

// Financial
export * from "./financial";

// Reports and analytics
export * from "./reports";
export * from "./analytics";
export * from "./dashboard";
// Resolve ActivityItem conflict: users wins over dashboard
export type { ActivityItem } from "./users";

// Settings - explicit export to avoid conflicts with pipeline (WinLossReason) and products (Category)
export type {
  GeneralSettingsData,
  AddressSettingsData,
  FinancialSettingsData,
  BrandingSettingsData,
  PreferencesSettingsData,
  EmailSettingsData,
  SecuritySettingsData,
  ApiToken,
  SettingsCategory,
  TargetsSettingsData,
  SettingsWinLossReason,
  SettingType,
  SetSystemSetting,
  SetSystemSettings,
  SystemSetting,
  DaySchedule,
  WeeklySchedule,
  CreateBusinessHours,
  UpdateBusinessHours,
  BusinessHours,
  CreateHoliday,
  UpdateHoliday,
  ListHolidaysQuery,
  Holiday,
  CustomFieldType,
  CustomFieldEntityType,
  CustomFieldOption,
  CustomFieldValidation,
  CustomFieldMetadata,
  CreateCustomField,
  UpdateCustomField,
  ListCustomFieldsQuery,
  CustomField,
  SetCustomFieldValue,
  SetCustomFieldValues,
  DataExportFormat,
  DataExportStatus,
  DataExportableEntity,
  CreateDataExport,
  ListDataExportsQuery,
  DataExport,
  XeroSyncStatus,
  SyncInvoiceToXeroInput,
  ResyncInvoiceInput,
  XeroPaymentUpdate,
  XeroPaymentUpdates,
  GetInvoiceXeroStatusInput,
  ListInvoicesBySyncStatusInput,
  XeroSyncResult,
  InvoiceXeroStatus,
  XeroLineItem,
  XeroInvoicePayload,
  InvoiceWithSyncStatus,
  ListInvoicesBySyncStatusResponse,
} from "./settings";
export {
  settingTypeValues,
  settingTypeSchema,
  getSystemSettingsSchema,
  getSystemSettingSchema,
  setSystemSettingSchema,
  setSystemSettingsSchema,
  systemSettingSchema,
  dayScheduleSchema,
  weeklyScheduleSchema,
  createBusinessHoursSchema,
  updateBusinessHoursSchema,
  businessHoursSchema,
  createHolidaySchema,
  updateHolidaySchema,
  listHolidaysSchema,
  holidaySchema,
  customFieldTypeValues,
  customFieldTypeSchema,
  customFieldEntityTypeValues,
  customFieldEntityTypeSchema,
  customFieldOptionSchema,
  customFieldValidationSchema,
  customFieldMetadataSchema,
  createCustomFieldSchema,
  updateCustomFieldSchema,
  listCustomFieldsSchema,
  customFieldSchema,
  setCustomFieldValueSchema,
  setCustomFieldValuesSchema,
  dataExportFormatValues,
  dataExportFormatSchema,
  dataExportStatusValues,
  dataExportStatusSchema,
  dataExportableEntityValues,
  dataExportableEntitySchema,
  createDataExportSchema,
  listDataExportsSchema,
  dataExportSchema,
  xeroSyncStatusValues,
  xeroSyncStatusSchema,
  syncInvoiceToXeroSchema,
  resyncInvoiceSchema,
  xeroPaymentUpdateSchema,
  xeroPaymentUpdatesSchema,
  getInvoiceXeroStatusSchema,
  listInvoicesBySyncStatusSchema,
} from "./settings";

// Suppliers and procurement
export * from "./suppliers";
export * from "./purchase-orders";
// Note: pricing schemas excluded from barrel to avoid conflicts with suppliers.
// Import directly from "@/lib/schemas/pricing" if needed.

// Portal
export * from "./portal";

// Receipts
export * from "./receipts";

// Search
export * from "./search";

// Support
export * from "./support";

// Warranty
export * from "./warranty";

// Approvals
export * from "./approvals";

// Standalone utilities
export * from "./automation-jobs";
