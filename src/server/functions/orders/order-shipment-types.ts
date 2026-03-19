'use server'

import { orderShipments, shipmentItems } from 'drizzle/schema';

export type OrderShipment = typeof orderShipments.$inferSelect;
export type ShipmentItem = typeof shipmentItems.$inferSelect;

export interface ShipmentWithItems extends OrderShipment {
  items: ShipmentItem[];
}

export interface ListShipmentsResult {
  shipments: OrderShipment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
