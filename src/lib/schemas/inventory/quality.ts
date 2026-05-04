import { z } from 'zod';
import { normalizeObjectInput } from '../_shared/patterns';

export const qualityInspectionResultValues = ['pass', 'fail', 'conditional'] as const;

export const qualityInspectionResultSchema = z.enum(qualityInspectionResultValues);

export const listQualityInspectionsSchema = normalizeObjectInput(
  z.object({
    inventoryId: z.string().uuid(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(50),
  })
);

export type ListQualityInspectionsInput = z.infer<typeof listQualityInspectionsSchema>;

export const createQualityInspectionSchema = z.object({
  inventoryId: z.string().uuid(),
  productId: z.string().uuid(),
  inspectionDate: z.string().datetime().optional(),
  inspectorName: z.string().min(1).max(255),
  result: qualityInspectionResultSchema,
  notes: z.string().max(1000).optional(),
  defects: z.array(z.string()).optional(),
});

export type CreateQualityInspectionInput = z.infer<typeof createQualityInspectionSchema>;

/** Quality inspection record for inventory item detail view. */
export interface QualityRecord {
  id: string;
  inspectionDate: Date;
  inspectorName: string | null;
  result: 'pass' | 'fail' | 'conditional' | string;
  notes?: string;
  defects?: string[];
}
