export interface StockAdjustmentLocation {
  id: string;
  code: string;
  name: string;
}

export interface StockAdjustmentPayload {
  locationId: string;
  adjustmentType: 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
  currentStock: number;
}
