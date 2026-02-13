/**
 * Mock Data Fixtures for Mobile Routes
 *
 * These are development fixtures that will be replaced with real API data.
 *
 * @deprecated Remove when real APIs are connected
 * TODO: Remove this file when real APIs are integrated
 */

import type { PickList } from '../picking-types';

export const MOCK_PICK_LIST: PickList = {
  id: "pick-001",
  orderId: "order-001",
  orderNumber: "ORD-2026-0042",
  customerName: "Johnson Renovation Co",
  status: "in_progress",
  createdAt: new Date(),
  items: [
    {
      id: "pi-1",
      productId: "prod-1",
      productName: "Premium Vinyl Siding - White",
      productSku: "VIN-WHT-001",
      locationId: "loc-a1",
      locationCode: "A-01-02",
      locationName: "Aisle A, Rack 1, Shelf 2",
      quantityRequired: 24,
      quantityPicked: 0,
      status: "pending",
    },
    {
      id: "pi-2",
      productId: "prod-2",
      productName: "Aluminum J-Channel",
      productSku: "ALU-JCH-001",
      locationId: "loc-b3",
      locationCode: "B-03-01",
      locationName: "Aisle B, Rack 3, Shelf 1",
      quantityRequired: 12,
      quantityPicked: 0,
      status: "pending",
    },
    {
      id: "pi-3",
      productId: "prod-3",
      productName: "Starter Strip - 10ft",
      productSku: "STR-10F-001",
      locationId: "loc-a2",
      locationCode: "A-02-04",
      locationName: "Aisle A, Rack 2, Shelf 4",
      quantityRequired: 8,
      quantityPicked: 0,
      status: "pending",
    },
  ],
};
