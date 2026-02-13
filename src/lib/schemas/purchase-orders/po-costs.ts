/**
 * Purchase Order Costs Schema
 *
 * Types for PO costs (freight, duty, insurance, etc.) and form data.
 * Aligns with server po-costs.ts costTypeSchema and allocationMethodSchema.
 *
 * @see src/server/functions/suppliers/po-costs.ts
 */

import { z } from 'zod';

// ============================================================================
// COST TYPES
// ============================================================================

export const poCostTypeSchema = z.enum([
  'freight',
  'duty',
  'insurance',
  'handling',
  'customs',
  'other',
]);

export type POCostType = z.infer<typeof poCostTypeSchema>;

export const poAllocationMethodSchema = z.enum([
  'equal',
  'by_value',
  'by_weight',
  'by_quantity',
]);

export type POAllocationMethod = z.infer<typeof poAllocationMethodSchema>;

// ============================================================================
// COST ALLOCATION (server engine - shared with cost-allocation.ts)
// ============================================================================

/** Line item shape for cost allocation engine */
export interface AllocationItem {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  weight: number;
}

/** Single cost to allocate across items */
export interface CostToAllocate {
  amount: number;
  method: POAllocationMethod;
}

/** PO cost entry for bulk allocation */
export interface POCostEntry {
  amount: number;
  allocationMethod: POAllocationMethod;
}

// ============================================================================
// FORM DATA
// ============================================================================

export interface CostFormData {
  costType: POCostType;
  amount: string;
  allocationMethod: POAllocationMethod;
  description: string;
  supplierInvoiceNumber: string;
  notes: string;
}
