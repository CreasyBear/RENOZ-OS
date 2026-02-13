/**
 * Project BOM Schemas
 *
 * Client-safe types for project bill of materials.
 *
 * @see drizzle/schema/jobs/project-bom.ts for database schema
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const bomStatusValues = [
  'draft',
  'approved',
  'ordered',
  'partial',
  'complete',
  'cancelled',
] as const;

export const bomStatusSchema = z.enum(bomStatusValues);
export type BomStatus = z.infer<typeof bomStatusSchema>;

export const bomItemStatusValues = [
  'planned',
  'ordered',
  'received',
  'allocated',
  'installed',
] as const;

export const bomItemStatusSchema = z.enum(bomItemStatusValues);
export type BomItemStatus = z.infer<typeof bomItemStatusSchema>;

// ============================================================================
// INTERFACES
// ============================================================================

export interface BomMetadata {
  currency?: string;
  marginPercent?: number;
  estimatedLaborCost?: number;
  additionalCosts?: Array<{
    name: string;
    amount: number;
  }>;
  procurementNotes?: string;
}

// ============================================================================
// PROJECT BOM
// ============================================================================

export interface ProjectBom {
  id: string;
  organizationId: string;
  projectId: string;
  bomNumber: string;
  revision: number;
  status: BomStatus;
  title: string | null;
  description: string | null;
  estimatedMaterialCost: string | null;
  actualMaterialCost: string | null;
  metadata: BomMetadata | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// PROJECT BOM ITEM
// ============================================================================

export interface ProjectBomItem {
  id: string;
  organizationId: string;
  bomId: string;
  projectId: string;
  productId: string;
  position: number;
  quantityEstimated: string;
  quantityOrdered: string | null;
  quantityReceived: string | null;
  quantityInstalled: string | null;
  unitCostEstimated: string | null;
  unitCostActual: string | null;
  status: BomItemStatus;
  specifications: Record<string, string> | null;
  notes: string | null;
  siteVisitId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const createBomSchema = z.object({
  projectId: z.string().uuid(),
  bomNumber: z.string().max(50).optional(),
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  metadata: z.object({
    currency: z.string().optional(),
    marginPercent: z.number().optional(),
    estimatedLaborCost: z.number().optional(),
    procurementNotes: z.string().optional(),
  }).optional(),
});

export type CreateBom = z.infer<typeof createBomSchema>;

export const createBomItemSchema = z.object({
  bomId: z.string().uuid(),
  projectId: z.string().uuid(),
  productId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  quantityEstimated: z.number().positive(),
  unitCostEstimated: z.number().optional(),
  notes: z.string().optional(),
});

export type CreateBomItem = z.infer<typeof createBomItemSchema>;

export const updateBomItemSchema = createBomItemSchema.partial().omit({ bomId: true, projectId: true });
export type UpdateBomItem = z.infer<typeof updateBomItemSchema>;

// ============================================================================
// UI TYPES
// ============================================================================

/**
 * BOM item with product information for UI display
 */
export interface BomItemWithProduct extends ProjectBomItem {
  product?: {
    id: string;
    name: string;
    sku: string;
    basePrice: number | null;
  };
}

/**
 * API response shape from getProjectBom
 */
export interface GetProjectBomResponse {
  success: boolean;
  data: {
    bom: ProjectBom | null;
    items: BomItemWithProduct[];
  };
}

/**
 * Extract installed/total BOM item counts from API response.
 * Safe for undefined/null/invalid - returns zeros.
 */
export function getBomCompletionStats(
  bomResponse: GetProjectBomResponse | null | undefined
): { installedBomItems: number; totalBomItems: number } {
  const data = bomResponse && typeof bomResponse === 'object' && 'data' in bomResponse ? (bomResponse as GetProjectBomResponse).data : undefined;
  const items = Array.isArray(data?.items) ? data.items : [];
  const installedBomItems = items.filter((i) => i && typeof i === 'object' && 'status' in i && i.status === 'installed').length;
  return { installedBomItems, totalBomItems: items.length };
}
