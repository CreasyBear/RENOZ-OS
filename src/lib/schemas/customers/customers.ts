/**
 * Customer Zod Schemas
 *
 * Comprehensive validation schemas for customer domain operations.
 * Matches the Drizzle schema in drizzle/schema/customers.ts
 *
 * @see drizzle/schema/customers.ts for database schema
 */

import { z } from 'zod';
import {
  optionalEmailSchema,
  phoneSchema,
  urlSchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
  percentageSchema,
  currencySchema,
} from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';

// ============================================================================
// ENUMS (must match drizzle/schema/enums.ts)
// ============================================================================

export const customerStatusValues = [
  'prospect',
  'active',
  'inactive',
  'suspended',
  'blacklisted',
] as const;

export const customerTypeValues = ['individual', 'business', 'government', 'non_profit'] as const;

export const customerSizeValues = ['micro', 'small', 'medium', 'large', 'enterprise'] as const;

export const addressTypeValues = ['billing', 'shipping', 'service', 'headquarters'] as const;

export const customerActivityTypeValues = [
  'call',
  'email',
  'meeting',
  'note',
  'quote',
  'order',
  'complaint',
  'feedback',
  'website_visit',
  'social_interaction',
] as const;

export const activityDirectionValues = ['inbound', 'outbound', 'internal'] as const;

export const customerPriorityLevelValues = ['low', 'medium', 'high', 'vip'] as const;

export const serviceLevelValues = ['standard', 'premium', 'platinum'] as const;

// Enum schemas
export const customerStatusSchema = z.enum(customerStatusValues);
export const customerTypeSchema = z.enum(customerTypeValues);
export const customerSizeSchema = z.enum(customerSizeValues);
export const addressTypeSchema = z.enum(addressTypeValues);
export const customerActivityTypeSchema = z.enum(customerActivityTypeValues);
export const activityDirectionSchema = z.enum(activityDirectionValues);
export const customerPriorityLevelSchema = z.enum(customerPriorityLevelValues);
export const serviceLevelSchema = z.enum(serviceLevelValues);

// ============================================================================
// CUSTOMER SCHEMAS
// ============================================================================

/**
 * Customer custom fields schema (flexible key-value pairs)
 */
export const customerCustomFieldsSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .optional();

/**
 * Create customer input schema
 */
export const createCustomerSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Name is required').max(255),

  // Optional basic info
  legalName: z.string().max(255).optional(),
  email: optionalEmailSchema,
  phone: phoneSchema,
  website: urlSchema,

  // Classification
  status: customerStatusSchema.default('prospect'),
  type: customerTypeSchema.default('business'),
  size: customerSizeSchema.optional(),
  industry: z.string().max(100).optional(),

  // Business identifiers
  taxId: z.string().max(20).optional(), // ABN for Australian businesses
  registrationNumber: z.string().max(50).optional(),

  // Hierarchy
  parentId: z.string().uuid().optional(),

  // Credit management
  creditLimit: z.coerce.number().nonnegative().multipleOf(0.01).optional(),
  creditHold: z.boolean().default(false),
  creditHoldReason: z.string().max(500).optional(),

  // Flexible data
  tags: z.array(z.string().max(50)).max(50).default([]),
  customFields: customerCustomFieldsSchema,

  // Warranty preferences
  warrantyExpiryAlertOptOut: z.boolean().default(false),
});

export type CreateCustomer = z.infer<typeof createCustomerSchema>;

/**
 * Update customer input schema
 */
export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

/**
 * Customer output schema (includes computed/system fields)
 */
export const customerSchema = createCustomerSchema.extend({
  id: z.string().uuid(),
  customerCode: z.string(),
  organizationId: z.string().uuid(),

  // Health scoring
  healthScore: z.number().int().min(0).max(100).nullable(),
  healthScoreUpdatedAt: z.string().datetime().nullable(),

  // Lifetime metrics
  lifetimeValue: z.coerce.number().nonnegative().multipleOf(0.01).nullable(),
  firstOrderDate: z.coerce.date().nullable(),
  lastOrderDate: z.coerce.date().nullable(),
  totalOrders: z.number().int().nonnegative(),
  totalOrderValue: z.coerce.number().nonnegative().multipleOf(0.01).nullable(),
  averageOrderValue: z.coerce.number().nonnegative().multipleOf(0.01).nullable(),

  // Timestamps
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;

/**
 * Customer with aggregated order metrics (from database aggregation)
 * These fields are computed from orders table, not stored values
 */
export interface CustomerWithOrderMetrics extends Customer {
  lifetimeValue: number; // Always 0 if no orders (not null)
  totalOrderValue: number; // Always 0 if no orders (not null)
  averageOrderValue: number; // Always 0 if no orders (not null)
  totalOrders: number; // Always 0 if no orders (not null)
  lastOrderDate: Date | null;
  firstOrderDate: Date | null;
}

// ============================================================================
// CUSTOMER FILTERS & QUERIES
// ============================================================================

export const customerFilterSchema = filterSchema.extend({
  status: customerStatusSchema.optional(),
  type: customerTypeSchema.optional(),
  size: customerSizeSchema.optional(),
  industry: z.string().optional(),
  tags: z.array(z.string()).optional(),
  healthScoreMin: z.number().min(0).max(100).optional(),
  healthScoreMax: z.number().min(0).max(100).optional(),
  hasParent: z.boolean().optional(),
  parentId: z.string().uuid().optional(),
});

export type CustomerFilter = z.infer<typeof customerFilterSchema>;

export const customerListQuerySchema = paginationSchema.merge(customerFilterSchema);
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export const customerCursorQuerySchema = cursorPaginationSchema.merge(customerFilterSchema);
export type CustomerCursorQuery = z.infer<typeof customerCursorQuerySchema>;

export const customerParamsSchema = idParamSchema;
export type CustomerParams = z.infer<typeof customerParamsSchema>;

// ============================================================================
// CONTACT SCHEMAS
// ============================================================================

export const createContactSchema = z.object({
  customerId: z.string().uuid(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  title: z.string().max(100).optional(),
  email: optionalEmailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  department: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
  decisionMaker: z.boolean().default(false),
  influencer: z.boolean().default(false),
  emailOptIn: z.boolean().default(true),
  smsOptIn: z.boolean().default(false),
  emailOptInAt: z.string().datetime().optional(),
  smsOptInAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateContact = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial().omit({
  customerId: true,
});

export type UpdateContact = z.infer<typeof updateContactSchema>;

export const contactSchema = createContactSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  lastContactedAt: z.string().datetime().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type Contact = z.infer<typeof contactSchema>;

export const contactParamsSchema = idParamSchema;
export type ContactParams = z.infer<typeof contactParamsSchema>;

// ============================================================================
// ADDRESS SCHEMAS
// ============================================================================

export const createAddressSchema = z.object({
  customerId: z.string().uuid(),
  type: addressTypeSchema.default('billing'),
  isPrimary: z.boolean().default(false),
  street1: z.string().min(1, 'Street address is required').max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional(),
  postcode: z.string().min(1, 'Postcode is required').max(20),
  country: z.string().max(100).default('AU'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateAddress = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial().omit({
  customerId: true,
});

export type UpdateAddress = z.infer<typeof updateAddressSchema>;

export const customerAddressSchema = createAddressSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CustomerAddress = z.infer<typeof customerAddressSchema>;

export const addressParamsSchema = idParamSchema;
export type AddressParams = z.infer<typeof addressParamsSchema>;

// ============================================================================
// CUSTOMER ACTIVITY SCHEMAS
// ============================================================================

export const createCustomerActivitySchema = z.object({
  customerId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  activityType: customerActivityTypeSchema,
  direction: activityDirectionSchema.optional(),
  subject: z.string().max(255).optional(),
  description: z.string().min(1, 'Description is required').max(5000),
  outcome: z.string().max(1000).optional(),
  duration: z.number().int().min(0).optional(), // in minutes
  scheduledAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  assignedTo: z.string().uuid().optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export type CreateCustomerActivity = z.infer<typeof createCustomerActivitySchema>;

export const customerActivitySchema = createCustomerActivitySchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid(),
});

export type CustomerActivity = z.infer<typeof customerActivitySchema>;

export const customerActivityParamsSchema = idParamSchema;
export type CustomerActivityParams = z.infer<typeof customerActivityParamsSchema>;

export const customerActivityFilterSchema = filterSchema.extend({
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  activityType: customerActivityTypeSchema.optional(),
  direction: activityDirectionSchema.optional(),
  assignedTo: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CustomerActivityFilter = z.infer<typeof customerActivityFilterSchema>;

// ============================================================================
// CUSTOMER TAG SCHEMAS
// ============================================================================

export const createCustomerTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  description: z.string().max(255).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .default('#6B7280'),
  category: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

export type CreateCustomerTag = z.infer<typeof createCustomerTagSchema>;

export const updateCustomerTagSchema = createCustomerTagSchema.partial();

export type UpdateCustomerTag = z.infer<typeof updateCustomerTagSchema>;

export const customerTagSchema = createCustomerTagSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  usageCount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid(),
});

export type CustomerTag = z.infer<typeof customerTagSchema>;

export const customerTagParamsSchema = idParamSchema;
export type CustomerTagParams = z.infer<typeof customerTagParamsSchema>;

// ============================================================================
// CUSTOMER TAG ASSIGNMENT SCHEMAS
// ============================================================================

export const assignCustomerTagSchema = z.object({
  customerId: z.string().uuid(),
  tagId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export type AssignCustomerTag = z.infer<typeof assignCustomerTagSchema>;

export const unassignCustomerTagSchema = z.object({
  customerId: z.string().uuid(),
  tagId: z.string().uuid(),
});

export type UnassignCustomerTag = z.infer<typeof unassignCustomerTagSchema>;

export const customerTagAssignmentSchema = assignCustomerTagSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  assignedBy: z.string().uuid(),
  assignedAt: z.string().datetime(),
});

export type CustomerTagAssignment = z.infer<typeof customerTagAssignmentSchema>;

// ============================================================================
// CUSTOMER HEALTH METRICS SCHEMAS
// ============================================================================

export const createCustomerHealthMetricSchema = z.object({
  customerId: z.string().uuid(),
  metricDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  recencyScore: percentageSchema.optional(),
  frequencyScore: percentageSchema.optional(),
  monetaryScore: percentageSchema.optional(),
  engagementScore: percentageSchema.optional(),
  overallScore: percentageSchema.optional(),
});

export type CreateCustomerHealthMetric = z.infer<typeof createCustomerHealthMetricSchema>;

export const customerHealthMetricSchema = createCustomerHealthMetricSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  metricDate: z.coerce.date(),
  createdAt: z.string().datetime(),
});

export type CustomerHealthMetric = z.infer<typeof customerHealthMetricSchema>;

export const customerHealthMetricFilterSchema = z.object({
  customerId: z.string().uuid(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CustomerHealthMetricFilter = z.infer<typeof customerHealthMetricFilterSchema>;

// ============================================================================
// CUSTOMER PRIORITY SCHEMAS
// ============================================================================

export const createCustomerPrioritySchema = z.object({
  customerId: z.string().uuid(),
  priorityLevel: customerPriorityLevelSchema.default('medium'),
  accountManager: z.string().uuid().optional(),
  serviceLevel: serviceLevelSchema.default('standard'),
  contractValue: currencySchema.optional(),
  contractStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  contractEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  specialTerms: z.string().max(2000).optional(),
});

export type CreateCustomerPriority = z.infer<typeof createCustomerPrioritySchema>;

export const updateCustomerPrioritySchema = createCustomerPrioritySchema.partial().omit({
  customerId: true,
});

export type UpdateCustomerPriority = z.infer<typeof updateCustomerPrioritySchema>;

export const customerPrioritySchema = createCustomerPrioritySchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  contractValue: currencySchema.nullable(),
  contractStartDate: z.coerce.date().nullable(),
  contractEndDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CustomerPriority = z.infer<typeof customerPrioritySchema>;

// ============================================================================
// BULK OPERATIONS SCHEMAS
// ============================================================================

export const bulkUpdateCustomersSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1).max(100),
  updates: updateCustomerSchema,
});

export type BulkUpdateCustomers = z.infer<typeof bulkUpdateCustomersSchema>;

export const bulkDeleteCustomersSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1).max(100),
});

export type BulkDeleteCustomers = z.infer<typeof bulkDeleteCustomersSchema>;

export const bulkAssignTagsSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1).max(100),
  tagIds: z.array(z.string().uuid()).min(1).max(20),
});

export type BulkAssignTags = z.infer<typeof bulkAssignTagsSchema>;

// ============================================================================
// CUSTOMER MERGE SCHEMAS
// ============================================================================

export const mergeCustomersSchema = z.object({
  primaryCustomerId: z.string().uuid(),
  duplicateCustomerIds: z.array(z.string().uuid()).min(1).max(10),
  fieldResolutions: z.record(z.string(), z.enum(['primary', 'duplicate', 'merge'])).optional(),
});

export type MergeCustomers = z.infer<typeof mergeCustomersSchema>;

// ============================================================================
// CUSTOMER MERGE AUDIT SCHEMAS
// ============================================================================

export const createCustomerMergeAuditSchema = z.object({
  primaryCustomerId: z.string().uuid(),
  mergedCustomerId: z.string().uuid().nullable(),
  action: z.enum(['merged', 'dismissed', 'undone']),
  reason: z.string().max(1000).optional(),
  mergedData: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CreateCustomerMergeAudit = z.infer<typeof createCustomerMergeAuditSchema>;

export const customerMergeAuditSchema = createCustomerMergeAuditSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  performedBy: z.string().uuid(),
  performedAt: z.string().datetime(),
});

export type CustomerMergeAudit = z.infer<typeof customerMergeAuditSchema>;

export const customerMergeAuditFilterSchema = z.object({
  action: z.enum(['merged', 'dismissed', 'undone']).optional(),
  primaryCustomerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CustomerMergeAuditFilter = z.infer<typeof customerMergeAuditFilterSchema>;

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

export const exportCustomersSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  filters: customerFilterSchema.optional(),
  fields: z.array(z.string()).optional(),
  includeContacts: z.boolean().default(false),
  includeAddresses: z.boolean().default(false),
});

export type ExportCustomers = z.infer<typeof exportCustomersSchema>;
