/**
 * Types for mobile picking - shared between picking-page and fixtures.
 */
export interface PickItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  quantityRequired: number;
  quantityPicked: number;
  status: "pending" | "in_progress" | "completed" | "short";
}

export interface PickList {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  items: PickItem[];
  status: "pending" | "in_progress" | "completed";
  createdAt: Date;
}

export interface PendingPick {
  id?: string;
  pickItemId: string;
  quantityPicked: number;
  verifiedBarcode: string;
  timestamp: Date;
}
