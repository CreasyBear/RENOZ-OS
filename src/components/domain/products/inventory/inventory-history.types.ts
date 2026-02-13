import type { MovementMetadata } from '@/lib/schemas/inventory';

export type MovementType =
  | 'receive'
  | 'allocate'
  | 'deallocate'
  | 'pick'
  | 'ship'
  | 'adjust'
  | 'return'
  | 'transfer';

export interface Movement {
  id: string;
  movementType: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost: number;
  totalCost: number;
  referenceType: string | null;
  referenceId: string | null;
  metadata: MovementMetadata | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  location: {
    id: string;
    code: string;
    name: string;
  };
}
