import { z } from 'zod';
import {
  addressSchema,
  filterSchema,
  normalizeObjectInput,
  paginationSchema,
} from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';

export const locationAddressSchema = addressSchema.partial();

export type LocationAddress = z.infer<typeof locationAddressSchema>;

export const createLocationSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(500).optional(),
  address: locationAddressSchema.optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  allowNegative: z.boolean().default(false),
});

export type CreateLocation = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.partial();

export type UpdateLocation = z.infer<typeof updateLocationSchema>;

export const locationSchema = createLocationSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type Location = z.infer<typeof locationSchema>;

export const locationFilterSchema = filterSchema.extend({
  isActive: z.coerce.boolean().optional(),
});

export type LocationFilter = z.infer<typeof locationFilterSchema>;

export const locationListQuerySchema = normalizeObjectInput(
  paginationSchema.merge(locationFilterSchema)
);

export type LocationListQuery = z.infer<typeof locationListQuerySchema>;

export const locationListCursorQuerySchema = normalizeObjectInput(
  cursorPaginationSchema.merge(locationFilterSchema)
);

export type LocationListCursorQuery = z.infer<typeof locationListCursorQuerySchema>;
