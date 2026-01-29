# Products + Inventory ETL Runbook

 **Script:** `scripts/migrate-products-inventory.ts`
 **Mode:** One-time migration (repeatable with RESET_TARGET)

 ## 1) Prerequisites
 - Main Warehouse location exists in new DB.
 - You have both connection strings (old + new).
 - You know old org id and new org id.
 - Purchase orders / shipments can be backfilled later (not required for this run).

 ## 2) Environment Variables
 ```env
 OLD_DATABASE_URL=postgresql://...
 NEW_DATABASE_URL=postgresql://...
 OLD_ORG_ID=uuid-of-old-org
 NEW_ORG_ID=uuid-of-new-org
 MAIN_WAREHOUSE_LOCATION_ID=uuid-of-location

 # Optional
 DRY_RUN=1           # default recommended for first run
 RESET_TARGET=1      # clears products/inventory/movements for org
 ```

 ## 3) Dry Run
 ```bash
 DRY_RUN=1 bun scripts/migrate-products-inventory.ts
 ```
 Expected: prints counts only, no writes.

 ## 4) Real Run
 ```bash
 DRY_RUN=0 bun scripts/migrate-products-inventory.ts
 ```
 If rerunning, use:
 ```bash
 RESET_TARGET=1 DRY_RUN=0 bun scripts/migrate-products-inventory.ts
 ```

 ## 5) Quick Validation
 - Compare product count old vs new.
 - Compare serialized inventory item count vs new inventory rows with serials.
 - Spot-check 10 serial numbers and their linked product IDs.
