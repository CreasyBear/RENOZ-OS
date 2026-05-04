import { z } from 'zod';
import { normalizeObjectInput } from '../_shared/patterns';
import {
  serviceOwnerInputSchema,
  serviceOwnerSchema,
} from './service-owners';

export const serviceSystemOwnershipStatusValues = ['owned', 'unassigned'] as const;
export const serviceSystemOwnershipStatusSchema = z.enum(serviceSystemOwnershipStatusValues);
export type ServiceSystemOwnershipStatus = z.infer<typeof serviceSystemOwnershipStatusSchema>;

export function isServiceSystemOwnershipStatus(
  value: unknown
): value is ServiceSystemOwnershipStatus {
  return serviceSystemOwnershipStatusSchema.safeParse(value).success;
}

export const serviceSystemAddressSchema = z.object({
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export type ServiceSystemAddress = z.infer<typeof serviceSystemAddressSchema>;

export const serviceSystemSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  commercialCustomer: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
    })
    .nullable(),
  sourceOrder: z
    .object({
      id: z.string().uuid(),
      orderNumber: z.string().nullable(),
    })
    .nullable(),
  project: z
    .object({
      id: z.string().uuid(),
      title: z.string().nullable(),
    })
    .nullable(),
  siteAddress: serviceSystemAddressSchema.nullable(),
  siteAddressLabel: z.string().nullable(),
});

export type ServiceSystem = z.infer<typeof serviceSystemSchema>;

export const serviceSystemListItemSchema = serviceSystemSchema.extend({
  currentOwner: serviceOwnerSchema.nullable(),
  linkedWarrantyCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type ServiceSystemListItem = z.infer<typeof serviceSystemListItemSchema>;

export const serviceSystemOwnershipHistoryItemSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  transferReason: z.string().nullable(),
  owner: serviceOwnerSchema,
});

export type ServiceSystemOwnershipHistoryItem = z.infer<
  typeof serviceSystemOwnershipHistoryItemSchema
>;

export const serviceSystemWarrantySummarySchema = z.object({
  id: z.string().uuid(),
  warrantyNumber: z.string(),
  productName: z.string().nullable(),
  productSerial: z.string().nullable(),
  status: z.string(),
  customerId: z.string().uuid().nullable(),
  customerName: z.string().nullable(),
});

export type ServiceSystemWarrantySummary = z.infer<
  typeof serviceSystemWarrantySummarySchema
>;

export const serviceSystemDetailSchema = serviceSystemSchema.extend({
  currentOwner: serviceOwnerSchema.nullable(),
  ownershipHistory: z.array(serviceSystemOwnershipHistoryItemSchema),
  linkedWarranties: z.array(serviceSystemWarrantySummarySchema),
});

export type ServiceSystemDetail = z.infer<typeof serviceSystemDetailSchema>;

export const getServiceSystemSchema = normalizeObjectInput(
  z.object({
    id: z.string().uuid(),
  })
);

export type GetServiceSystemInput = z.input<typeof getServiceSystemSchema>;

export const listServiceSystemsSchema = normalizeObjectInput(
  z.object({
    search: z.string().trim().max(255).optional(),
    ownershipStatus: serviceSystemOwnershipStatusSchema.optional(),
  })
);

export type ListServiceSystemsInput = z.infer<typeof listServiceSystemsSchema>;

export const transferServiceSystemOwnershipSchema = z.object({
  serviceSystemId: z.string().uuid(),
  newOwner: serviceOwnerInputSchema,
  reason: z.string().min(1).max(2000),
  effectiveAt: z.string().datetime().optional(),
});

export type TransferServiceSystemOwnershipInput = z.infer<
  typeof transferServiceSystemOwnershipSchema
>;
