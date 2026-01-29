# Renoz v3 Codebase Audit

**Audit Date:** 2026-01-28  
**Total Routes:** 120  
**Total Server Functions:** 164  
**Total Hooks:** 131  

---

## Executive Summary

This audit categorizes all unimplemented features by **effort required** based on existing infrastructure.

### Critical Stats
- **🔴 Quick Wins (1-2 hours):** 8 items - Hooks & server functions exist, just need wiring
- **🟡 Medium Effort (Half day):** 12 items - Need new routes or minor component work  
- **🔵 Heavy Lifting (Full day+):** 15 items - Need server functions or complex flows
- **✅ Fixed Today:** 9 items already completed

---

## TRIAGE MATRIX

### 🔴 QUICK WINS (Existing Hooks/Server Functions - Just Wire Up)

| Priority | Feature | Location | What's Available | Effort |
|----------|---------|----------|------------------|--------|
| 1 | **Stock Count Creation** | `inventory/counts.tsx` | ✅ `useCreateStockCount` hook exists<br>✅ `createStockCount` server function exists<br>✅ Full stock count API ready | 1-2 hrs |
| 2 | **Complete/Cancel Stock Count** | `inventory/counts.tsx` | ✅ `useCompleteStockCount`, `useCancelStockCount` hooks exist<br>✅ Server functions exist | 1-2 hrs |
| 3 | **Update Stock Count Items** | `inventory/counts.tsx` | ✅ `useUpdateStockCountItem`, `useBulkUpdateCountItems` hooks exist | 1-2 hrs |
| 4 | **Acknowledge Inventory Alerts** | `inventory/alerts.tsx` | ✅ `useAcknowledgeAlert` hook exists<br>✅ Alert management API ready | 1-2 hrs |
| 5 | **Inventory Adjustments** | `inventory/$itemId.tsx` | ✅ `useAdjustInventory` hook exists<br>✅ `adjustStock` server function exists | 2 hrs |
| 6 | **Inventory Transfer** | `inventory/$itemId.tsx` | ✅ `useTransferInventory` hook exists<br>✅ `transferStock` server function exists | 2 hrs |
| 7 | **Duplicate Order** | `orders/index.tsx` | ✅ `useDuplicateOrder` hook exists (in use-orders.ts) | 1-2 hrs |
| 8 | **Pipeline New Navigation Fix** | `pipeline/index.tsx` | Route exists, just needs search params fix | 30 min |

**Total Quick Wins: 8 items ≈ 12-16 hours**

---

### 🟡 MEDIUM EFFORT (Need New Routes or Components)

| Priority | Feature | Location | What's Needed | Effort |
|----------|---------|----------|---------------|--------|
| 1 | **Supplier Edit** | `suppliers/$supplierId.tsx` | • Create `/suppliers/$supplierId/edit.tsx` route<br>• Reuse create supplier form pattern<br>• `useUpdateSupplier` hook exists | 4-6 hrs |
| 2 | **Inventory Item Edit** | `inventory/$itemId.tsx` | • Create edit form component<br>• `useUpdateProduct` or inventory-specific update<br>• Modal or route-based edit | 4-6 hrs |
| 3 | **Product Import Page** | `products/index.tsx` | • Create `/products/import.tsx` route<br>• File upload component<br>• `parseImportFile`, `importProducts` server functions exist | 4-6 hrs |
| 4 | **Order Export** | `orders/index.tsx` | • Export dialog component<br>• Format selection (CSV/Excel/PDF)<br>• May need export server function | 4-6 hrs |
| 5 | **Customer Segment Delete** | `customers/segments/index.tsx` | • Delete confirmation dialog<br>• `deleteCustomerSegment` server function<br>• Invalidate segments cache | 3-4 hrs |
| 6 | **Report Exports** | `reports/customers/index.tsx` | • Export format selector<br>• PDF generation or CSV<br>• May need server functions | 4-6 hrs |
| 7 | **Forecast → PO Creation** | `inventory/forecasting.tsx` | • "Create PO" dialog<br>• `createPurchaseOrder` server function exists<br>• Pre-fill from forecast data | 4-6 hrs |
| 8 | **Job Task Assignment** | `jobs/kanban.tsx` | • User assignment dropdown<br>• `useUpdateTask` hook exists<br>• Assignment mutation | 3-4 hrs |
| 9 | **Alert History View** | `inventory/alerts.tsx` | • Alert history table component<br>• `useAlertHistory` query<br>• May need server function | 4-6 hrs |
| 10 | **Customer Notes/Meetings** | `customers/$customerId.tsx` | • Quick note dialog<br>• `useCreateActivity` or similar<br>• Meeting scheduler component | 4-6 hrs |

**Total Medium Effort: 10 items ≈ 40-60 hours**

---

### 🔵 HEAVY LIFTING (Need Server Functions or Complex Flows)

| Priority | Feature | Location | What's Needed | Effort |
|----------|---------|----------|---------------|--------|
| 1 | **Scheduled Reports** | `reports/customers/index.tsx` | • `createScheduledReport` server function<br>• Cron/job scheduling infrastructure<br>• Email delivery system<br>• Report storage | 2-3 days |
| 2 | **Bulk Order Actions** | `orders/index.tsx` | • `bulkUpdateOrders`, `bulkDeleteOrders` server functions<br>• Selection UI<br>• Batch processing | 1-2 days |
| 3 | **Bulk PO from Forecast** | `inventory/forecasting.tsx` | • `bulkCreatePurchaseOrders` server function<br>• Multi-select UI<br>• Batch PO creation flow | 1-2 days |
| 4 | **Quote Email Templates** | `pipeline/quotes/$quoteId.tsx` | • Email template system<br>• Rich text editor<br>• SendGrid/email integration<br>• Attachment handling | 2-3 days |
| 5 | **Inventory Item Soft Delete** | `inventory/$itemId.tsx` | • Soft delete schema change (add deletedAt)<br>• `deleteInventoryItem` server function<br>• Cascade handling | 1-2 days |
| 6 | **Product Bundle Creation UI** | `products/new.tsx` | • Bundle builder component<br>• Component product selector<br>• Quantity/optional settings | 2-3 days |
| 7 | **Advanced Report Builder** | `reports/*` | • Drag-drop report builder<br>• Custom field selector<br>• Chart generation<br>• Save/load report templates | 3-5 days |
| 8 | **Multi-location Inventory** | `inventory/*` | • Location transfer workflows<br>• Inter-location movements<br>• Location-specific stock views | 2-3 days |

**Total Heavy Lifting: 8 items ≈ 2-3 weeks**

---

## WHAT WE FIXED TODAY (9 items)

| Domain | Feature | Implementation |
|--------|---------|----------------|
| Products | Delete Product | Wired `useDeleteProduct` + confirmation dialog |
| Products | Duplicate Product | Created `duplicateProduct` server function + `useDuplicateProduct` hook |
| Customers | Delete Customer | Wired `useDeleteCustomer` + confirmation dialog |
| Customers | Add Note | Navigation to communications page |
| Customers | Schedule Meeting | Navigation to communications page |
| Customers | Create Quote | Navigation to pipeline/new |
| Pipeline | Send Quote | Wired `useSendQuote` with email sending |
| Pipeline | Convert to Order | Wired `useConvertToOrder` + confirmation |
| Suppliers | Create Purchase Order | Navigation to purchase-orders/create |

---

## AVAILABLE INFRASTRUCTURE (Ready to Use)

### Stock Count System (FULLY BUILT - Just Wire It Up!)
```typescript
// Hooks available:
- useStockCounts, useStockCount, useStockCountItems
- useCreateStockCount, useUpdateStockCount
- useStartStockCount, useCompleteStockCount, useCancelStockCount
- useUpdateStockCountItem, useBulkUpdateCountItems

// Server functions available:
- createStockCount, updateStockCount, startStockCount
- completeStockCount, cancelStockCount
- updateStockCountItem, bulkUpdateCountItems
```

### Inventory Adjustments (Ready)
```typescript
// Hooks available:
- useAdjustInventory
- useTransferInventory

// Server functions available:
- adjustStock, transferStock
```

### Alert Management (Ready)
```typescript
// Hooks available:
- useAlerts, useAlert
- useAcknowledgeAlert, useDeleteAlert
- useToggleAlertActive
```

### Order Operations (Partial)
```typescript
// Hooks available:
- useDuplicateOrder
- useCreateOrder, useUpdateOrder, useDeleteOrder

// Missing:
- Export functionality
```

---

## QUESTIONS FOR PRODUCT OWNER

### Quick Wins (Do These First?)
1. **Stock Counts**: The entire system is built but not wired up. Is this a priority feature?

2. **Inventory Adjustments**: Users can adjust/transfer stock. Should this be available on the item detail page?

3. **Duplicate Order**: Hook exists but not wired. Useful for repeat orders?

### Medium Effort
4. **Supplier Edit**: Create edit route? Or inline editing on detail page?

5. **Product Import**: CSV upload - what columns? Template download needed?

6. **Forecast → PO**: Auto-generate purchase orders from low stock forecasts?

### Heavy Lifting
7. **Scheduled Reports**: Real feature or remove button for now?

8. **Bulk Actions**: Which domains need bulk operations most urgently?

---

## RECOMMENDED ORDER

### Phase 1: Quick Wins (This Week)
1. Wire up Stock Count system (biggest bang for buck)
2. Inventory Adjustments/Transfers
3. Fix pipeline navigation
4. Duplicate Order

### Phase 2: Medium (Next Week)
5. Supplier Edit route
6. Product Import page
7. Order Export
8. Customer Segment Delete

### Phase 3: Heavy (Later)
9. Scheduled Reports (if needed)
10. Bulk operations
11. Advanced reporting

---

## PRE-EXISTING TECHNICAL DEBT

### Type Errors (Non-blocking)
- Pipeline new route search params mismatch
- Some permission type mismatches
- Orders hooks using dynamic imports (complex)

### Navigation Issues
- `/pipeline/new` requires search params but navigation doesn't provide them
- Some routes validate search that should be optional

### Hook Pattern Inconsistencies
- Some hooks use `useServerFn`, others call directly
- Some mutations have toast, others don't
- Query key invalidation varies

---

*Document Version: 2.0 (Post-Triage)*
