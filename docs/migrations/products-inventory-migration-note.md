 # Products + Inventory Migration Note (Old → New)

 **Scope:** `products`, serialized inventory, and movement history
 **Source DB:** renoz-crm (old)
 **Target DB:** renoz-website (new)
 **Location:** Main Warehouse — Unit 4, 8 Murphy St O'Connor, 6163
 **Assumption:** All stock is on shop floor (single default location)

 ## 1) Minimal Goals
 - Preserve all products.
 - Preserve serial numbers.
 - Preserve movement history (event timeline).
 - Avoid over-engineering FK enforcement on movement references.

 ## 2) Mapping Summary
 ### Products
 - **Old** `public.products` → **New** `public.products`
 - Direct field mapping where names match (`sku`, `name`, `description`, `cost_price`, etc).
 - Set new-only fields with sensible defaults:
   - `track_inventory = true` for serialized items
   - `is_serialized = true` if any serial exists for the SKU in old inventory
   - `is_active = true` if old status is active/draft otherwise false
 - Leave `warranty_policy_id` null unless you migrate warranty policies.

 ### Inventory (current state)
 - **Old** `public.inventory_items` → **New** `public.inventory`
 - **One row per serial**:
   - `serial_number` = `inventory_items.serial_number`
   - `quantity_on_hand = 1`, `quantity_allocated = 0`, `quantity_available = 1`
   - `product_id` from old `inventory_items.product_id`
   - `location_id` = Main Warehouse location id
   - `unit_cost` = `inventory_items.cost_price` (fallback to product cost_price)
   - `total_value = unit_cost * quantity_on_hand`
 - If `serial_number` is null, group by `product_id` and create a non-serialized aggregate row.

 ### Inventory Movements (history)
 - **Old** `public.inventory_transaction_events` → **New** `public.inventory_movements`
 - Use `inventory_transaction_events` as canonical stream (avoid double counting).
 - Map fields:
   - `movement_type` from `event_type` (map enum values 1:1 where possible)
   - `quantity` from `quantity_changed` (if null and serialized, set 1)
  - `reference_type` from `related_order_id` / `related_adjustment_id` (optional)
  - `reference_id` from those same ids (optional)
   - `metadata.serial_number` from `serial_number_snapshot`
 - `previous_quantity` / `new_quantity` can be derived by replaying events per product+location if needed.
 - Backfill purchase order / shipment references later if needed.

 ## 3) Order of Operations
 1) Ensure `organizations` exist in new DB.
 2) Create Main Warehouse location and record its id.
 3) Insert `products`.
 4) Insert `inventory` (serialized rows first, aggregate rows after).
 5) Insert `inventory_movements` (event history).
 6) Validate counts and spot-check.

 ## 4) Validation (Minimal)
 - Count products old vs new.
 - Count inventory items old vs serialized inventory rows new.
 - Spot-check 10 SKUs: verify serial counts and product ids match.

 ## 5) FK Strategy
 - **Do not add hard FKs** for `inventory_movements.reference_id`.
 - Use soft validation queries post-migration if needed.

 ## 6) Systematic Port Options
 **Option A: SQL-only (execute_sql)**
 - Use staged `INSERT INTO ... SELECT ...` statements per table.
 - Best for one-off migration.

 **Option B: Scripted ETL**
 - Extract from old DB via SQL.
 - Transform in script (JS/Python).
 - Load into new DB with bulk inserts.
 - Best for repeatability and retries.
