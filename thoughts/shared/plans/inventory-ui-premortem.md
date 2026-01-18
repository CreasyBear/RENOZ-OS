# DEEP Premortem Analysis: Inventory UI Implementation

Created: 2026-01-18
Author: architect-agent
Mode: DEEP

## Analysis Scope

Analyzed 11 inventory UI stories across:
- Mobile Interface: `src/routes/_authenticated/mobile/` (receiving, picking, counting, index)
- Components: `src/components/mobile/inventory-actions.tsx`
- Integration Layer: `src/contexts/inventory-context.tsx`, `src/hooks/use-inventory.ts`, `src/hooks/use-locations.ts`
- Utilities: `src/lib/inventory-utils.ts`, `src/lib/forecast-engine.ts`
- Server Functions: `src/server/functions/inventory.ts`

---

## Premortem Results

```yaml
premortem:
  mode: deep
  
  tigers:
    # TIGER 1: Offline Queue Not Persisted to LocalStorage
    - id: T1
      risk: "Offline queue data loss on browser close/refresh"
      location: "src/routes/_authenticated/mobile/receiving.tsx:71, picking.tsx:134, counting.tsx:97"
      severity: HIGH
      evidence: |
        pendingItems, pendingPicks, pendingCounts are all useState([]) 
        with no localStorage persistence. Data is lost on page refresh.
      mitigation_checked: false
      recommendation: |
        Implement localStorage persistence with useEffect:
        - Save to localStorage on queue change
        - Restore from localStorage on component mount
        - Use navigator.sendBeacon for sync on page unload

    # TIGER 2: Picking Route Uses Mock Data Only
    - id: T2
      risk: "Picking workflow not connected to real backend"
      location: "src/routes/_authenticated/mobile/picking.tsx:74-119 (MOCK_PICK_LIST)"
      severity: HIGH
      evidence: |
        Line 74-119: MOCK_PICK_LIST constant with hardcoded items
        Line 129: pickList state initialized with MOCK_PICK_LIST
        Line 282: handleSync just uses setTimeout promise, no server call
        Comment on line 71: "would be fetched from server in production"
      mitigation_checked: false
      recommendation: |
        Implement actual pick list fetching from server
        Add createPickList, confirmPick, markShort server functions

    # TIGER 3: Counting Sync Uses Mock Implementation
    - id: T3  
      risk: "Cycle count results not persisted to server"
      location: "src/routes/_authenticated/mobile/counting.tsx:298-312"
      severity: HIGH
      evidence: |
        Line 303-304: await new Promise((resolve) => setTimeout(resolve, 1000))
        Comment on line 303: "In production, this would call the server"
        No actual adjustInventory or createCountSession call
      mitigation_checked: false
      recommendation: |
        Integrate with adjustInventory for variance corrections
        Create stockCounts table and server functions for audit trail

    # TIGER 4: No Rate Limiting on Inventory Operations
    - id: T4
      risk: "Inventory adjustments can be spammed, no rate limiting"
      location: "src/server/functions/inventory.ts:240-339 (adjustInventory)"
      severity: MEDIUM
      evidence: |
        No checkApiRateLimit call before inventory mutations
        Compare to auth/rate-limit.ts which has checkLoginRateLimit
        Rapid-fire adjustments could cause race conditions
      mitigation_checked: true
      existing_mitigation: |
        Transactions used (line 277: db.transaction) prevent data corruption
        But no throttling to prevent abuse
      recommendation: |
        Add rate limiting similar to auth patterns
        Consider optimistic locking for high-concurrency scenarios

    # TIGER 5: Location Loading Hard-Limited to 100
    - id: T5
      risk: "Locations truncated at 100 - warehouses with 100+ bins invisible"
      location: |
        src/routes/_authenticated/mobile/receiving.tsx:95
        src/routes/_authenticated/mobile/counting.tsx:127
      severity: MEDIUM
      evidence: |
        Both files: pageSize: 100 hardcoded
        Large warehouses commonly have 200+ bin locations
        Users would see incomplete location lists
      mitigation_checked: false
      recommendation: |
        Implement pagination/infinite scroll for locations
        Or increase limit with server-side search filtering

    # TIGER 6: Barcode Verification Case-Sensitive Mismatch Risk
    - id: T6
      risk: "Barcode verification may fail on case differences"
      location: |
        src/routes/_authenticated/mobile/picking.tsx:172-174
        src/routes/_authenticated/mobile/counting.tsx:207-209
      severity: LOW
      evidence: |
        Uses toLowerCase() for comparison - GOOD
        But productId comparison is exact match without normalization
        If barcode has leading zeros that get stripped, verification fails
      mitigation_checked: true
      existing_mitigation: |
        toLowerCase() comparison handles case (line 172-173)
        productId fallback provides secondary match option
      recommendation: |
        Consider normalizing barcodes (trim, handle UPC check digits)

  elephants:
    # ELEPHANT 1: No Concurrent Edit Protection
    - id: E1
      concern: "Two users can receive same product simultaneously without conflict detection"
      location: "src/server/functions/inventory.ts:713-770"
      discussion: |
        receiveInventory creates/updates inventory records in transaction
        But if two warehouse workers scan same product at same location:
        - Both read current quantity (e.g., 10)
        - Both add 5
        - Expected: 20, Actual: depends on timing
        FIFO cost layers created correctly, but quantity could race
      recommendation: |
        Add optimistic locking with version column
        Or use SELECT FOR UPDATE in transaction

    # ELEPHANT 2: No Audit Log for Mobile Operations
    - id: E2
      concern: "Mobile receives/picks not tracked to specific device/user"
      location: "src/routes/_authenticated/mobile/*.tsx"
      discussion: |
        Server functions get ctx.user.id for createdBy
        But no device fingerprint, session ID, or mobile-specific metadata
        Hard to investigate discrepancies ("who scanned this?")
      recommendation: |
        Add device_id, client_session_id to movement metadata
        Consider QR-based worker login for accountability

    # ELEPHANT 3: Camera Scanning Not Implemented
    - id: E3
      concern: "Camera barcode scanning is stubbed, manual entry only"
      location: "src/components/mobile/inventory-actions.tsx:189-194"
      discussion: |
        handleCameraClick immediately sets setCameraError(true)
        Comment: "Placeholder for camera scanning"
        Real warehouse scanners need camera or Bluetooth integration
      recommendation: |
        Integrate @mebjas/html5-qrcode or similar
        Support USB/Bluetooth scanner input

    # ELEPHANT 4: No Batch Operations
    - id: E4
      concern: "Each item requires individual scan/submit cycle"
      location: "src/routes/_authenticated/mobile/receiving.tsx"
      discussion: |
        Receiving flow: scan -> set qty -> set location -> submit
        No way to receive entire PO at once or bulk operations
        Inefficient for large shipments
      recommendation: |
        Add "Receive PO" mode that pre-loads expected items
        Batch confirmation with variance detection

  paper_tigers:
    # PAPER TIGER 1: Negative Inventory Allowed?
    - id: P1
      initial_concern: "Adjustments could create negative inventory"
      location: "src/server/functions/inventory.ts:261-274"
      mitigation_code: |
        Lines 261-274:
        if (newQuantity < 0) {
          const [loc] = await db.select().from(locations).where(eq(locations.id, data.locationId))
          if (!loc?.allowNegative) {
            throw new ValidationError("Adjustment would result in negative inventory"...)
          }
        }
      status: MITIGATED
      notes: Location-level allowNegative flag controls this behavior

    # PAPER TIGER 2: SQL Injection via Search
    - id: P2
      initial_concern: "Search parameter could allow SQL injection"
      location: "src/server/functions/inventory.ts:86-92"
      mitigation_code: |
        Lines 86-92:
        if (search) {
          conditions.push(
            sql`(${inventory.lotNumber} ILIKE ${`%${search}%`} OR ...)`
          )
        }
        Uses parameterized queries via Drizzle ORM sql template
      status: MITIGATED
      notes: Drizzle's sql tag escapes parameters properly

    # PAPER TIGER 3: Missing Auth on Server Functions
    - id: P3
      initial_concern: "Server functions might skip authentication"
      location: "src/server/functions/inventory.ts"
      mitigation_code: |
        Line 78: const ctx = await withAuth()
        Line 243: const ctx = await withAuth({ permission: "inventory.adjust" })
        Line 347: const ctx = await withAuth({ permission: "inventory.transfer" })
        Line 505: const ctx = await withAuth({ permission: "inventory.allocate" })
        Line 679: const ctx = await withAuth({ permission: "inventory.receive" })
      status: MITIGATED
      notes: All mutations require permission checks

    # PAPER TIGER 4: Data Type Coercion Issues
    - id: P4
      initial_concern: "Number/string type mismatches in cost calculations"
      location: "src/server/functions/inventory.ts:734-736"
      mitigation_code: |
        Uses numeric calculations with proper type handling
        Decimal columns in schema (currencyColumn) handle precision
        Cost layer unitCost stored as String(data.unitCost) for precision
      status: MITIGATED
      notes: Decimal/numeric handling is deliberate for financial accuracy

    # PAPER TIGER 5: Offline Mode Data Corruption
    - id: P5
      initial_concern: "Stale data synced after conflict"
      location: "src/routes/_authenticated/mobile/receiving.tsx:199-231"
      mitigation_code: |
        Lines 199-231: handleSync processes items sequentially
        Failed items kept in pendingItems array (line 219-223)
        Server-side transactions ensure atomic updates
      status: PARTIALLY_MITIGATED
      notes: |
        Failures are retained for retry. But see T1 - queue itself not persisted.
        Race conditions between offline devices still possible (see E1).

    # PAPER TIGER 6: XSS in Product Names
    - id: P6
      initial_concern: "User-supplied product names rendered without escaping"
      location: "src/components/mobile/inventory-actions.tsx:400+"
      mitigation_code: |
        React JSX auto-escapes content
        No dangerouslySetInnerHTML usage found
        Product names rendered as {item.productName} text content
      status: MITIGATED
      notes: React's default escaping handles this

testing_gaps:
  - area: "Mobile routes"
    status: "NO TESTS"
    files_missing:
      - "tests/unit/mobile/*.spec.ts"
      - "tests/integration/inventory/*.spec.ts"
    impact: "HIGH - Core warehouse operations untested"
    
  - area: "inventory-utils.ts"
    status: "NO TESTS"
    files_missing:
      - "tests/unit/lib/inventory-utils.spec.ts"
    impact: "MEDIUM - FIFO calculations, stock status logic untested"
    
  - area: "forecast-engine.ts"
    status: "NO TESTS"  
    files_missing:
      - "tests/unit/lib/forecast-engine.spec.ts"
    impact: "MEDIUM - Demand forecasting algorithms untested"
    
  - area: "Server functions"
    status: "NO TESTS"
    files_missing:
      - "tests/integration/inventory/server-functions.spec.ts"
    impact: "HIGH - Inventory mutations, transactions, edge cases untested"

scalability_concerns:
  - concern: "10x load: Location dropdown with 1000+ locations"
    current: "Hard limit of 100 locations fetched"
    at_scale: "Users can't see/select all locations"
    recommendation: "Implement search-as-you-type with server-side filtering"
    
  - concern: "100x load: Concurrent warehouse operations"
    current: "No optimistic locking on inventory records"
    at_scale: "Lost updates possible with many simultaneous adjustments"
    recommendation: "Add version column, SELECT FOR UPDATE, or event sourcing"
    
  - concern: "Alert polling interval"
    current: "60-second polling in InventoryProvider"
    at_scale: "100 users = 100 requests/minute for alerts"
    recommendation: "Use WebSocket/SSE for push notifications instead of polling"

integration_breaking_changes:
  - area: "Pick list integration"
    status: "NOT INTEGRATED"
    dependency: "Order fulfillment system"
    notes: "Currently uses mock data, no connection to orders"
    
  - area: "Count session persistence"
    status: "NOT INTEGRATED"
    dependency: "Stock count/audit module"
    notes: "Count results not saved, no variance reporting"
```

---

## Priority Action Items

### Critical (Block Release)
1. **T1**: Persist offline queues to localStorage - data loss on refresh
2. **T2**: Implement real pick list fetching from orders
3. **T3**: Implement count session persistence and variance tracking

### High Priority (Post-MVP)
4. **T4**: Add rate limiting to inventory mutation endpoints
5. **T5**: Fix location pagination for large warehouses
6. **E1**: Add optimistic locking for concurrent edits

### Medium Priority (Technical Debt)
7. **E3**: Implement camera barcode scanning
8. **E4**: Add batch receiving operations
9. Add comprehensive test coverage (currently 0% for inventory domain)

### Low Priority (Enhancements)
10. **E2**: Add device tracking for mobile operations
11. **T6**: Normalize barcode formats (UPC check digits, etc.)

---

## Verification Summary

| Category | Count | Status |
|----------|-------|--------|
| Tigers (Real Risks) | 6 | Need mitigation |
| Elephants (Unspoken) | 4 | Need discussion |
| Paper Tigers (False Alarms) | 6 | Already mitigated |
| Test Coverage | 0% | Critical gap |

