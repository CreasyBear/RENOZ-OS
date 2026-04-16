import { z } from 'zod';
import { normalizeObjectInput } from '../_shared/patterns';
import { warrantyOwnerRecordInputSchema, type WarrantyOwnerRecord } from './owner-records';

export const warrantyEntitlementEvidenceTypeValues = ['serialized', 'unitized'] as const;
export const warrantyEntitlementStatusValues = [
  'pending_activation',
  'needs_review',
  'activated',
  'voided',
] as const;
export const warrantyEntitlementProvisioningIssueCodeValues = [
  'missing_serial_capture',
  'policy_unresolved',
] as const;

export const warrantyEntitlementEvidenceTypeSchema = z.enum(
  warrantyEntitlementEvidenceTypeValues
);
export const warrantyEntitlementStatusSchema = z.enum(warrantyEntitlementStatusValues);
export const warrantyEntitlementProvisioningIssueCodeSchema = z.enum(
  warrantyEntitlementProvisioningIssueCodeValues
);

export type WarrantyEntitlementEvidenceType = z.infer<
  typeof warrantyEntitlementEvidenceTypeSchema
>;
export type WarrantyEntitlementStatus = z.infer<typeof warrantyEntitlementStatusSchema>;
export type WarrantyEntitlementProvisioningIssueCode = z.infer<
  typeof warrantyEntitlementProvisioningIssueCodeSchema
>;

export const warrantyEntitlementFiltersSchema = normalizeObjectInput(
  z.object({
    status: warrantyEntitlementStatusSchema.optional(),
    search: z.string().optional(),
    customerId: z.string().uuid().optional(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z.enum(['deliveredAt', 'status', 'createdAt']).default('deliveredAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
);

export type WarrantyEntitlementFilters = z.infer<typeof warrantyEntitlementFiltersSchema>;

export const getWarrantyEntitlementSchema = normalizeObjectInput(
  z.object({
    id: z.string().uuid(),
  })
);

export type GetWarrantyEntitlementInput = z.input<typeof getWarrantyEntitlementSchema>;

export const activateWarrantyFromEntitlementSchema = z.object({
  entitlementId: z.string().uuid(),
  activationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  owner: warrantyOwnerRecordInputSchema,
  notes: z.string().max(2000).optional(),
});

export type ActivateWarrantyFromEntitlementInput = z.infer<
  typeof activateWarrantyFromEntitlementSchema
>;

export interface WarrantyEntitlementListItem {
  id: string;
  status: WarrantyEntitlementStatus;
  evidenceType: WarrantyEntitlementEvidenceType;
  provisioningIssueCode: WarrantyEntitlementProvisioningIssueCode | null;
  deliveredAt: string;
  orderId: string;
  orderNumber: string | null;
  shipmentId: string;
  shipmentNumber: string | null;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSku: string | null;
  productSerial: string | null;
  unitSequence: number | null;
  warrantyPolicyId: string | null;
  policyName: string | null;
  activatedWarrantyId: string | null;
  activatedWarrantyNumber: string | null;
}

export interface ListWarrantyEntitlementsResult {
  entitlements: WarrantyEntitlementListItem[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface WarrantyEntitlementDetail extends WarrantyEntitlementListItem {
  commercialCustomer: {
    id: string;
    name: string | null;
  };
  ownerRecord: WarrantyOwnerRecord | null;
}
