# Pipeline Kanban Board Wireframe
## DOM-PIPE-007a/b: Enhanced Kanban with Weighted Totals & Filters

**Last Updated:** 2026-01-10
**PRD Reference:** pipeline.prd.json
**Stories:** DOM-PIPE-007a, DOM-PIPE-007b

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | opportunities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-PIPE-007a, DOM-PIPE-007b | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/opportunities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD
- **Pipeline Stages**: Lead → Qualified → Site Visit → Quote Sent → Negotiation → Won/Lost
- **Typical Deal Sizes**: Residential 5-20kWh ($5K-$20K), Commercial 50-500kWh ($50K-$500K)
- **Win Rate Targets**: 65-70%

---

## UI Patterns (Reference Implementation)

### Kanban Board
- **Pattern**: DnD Kit with stage columns
- **Reference**: `_reference/.square-ui-reference/` (kanban patterns)
- **Features**:
  - Drag-drop between stages with animation
  - Stage color gradient headers (design system stage colors)
  - Card preview on drag
  - Drop zone highlight on hover
  - Optimistic update with rollback on error

### Deal Card
- **Pattern**: Compact info card with actions
- **Features**:
  - Value prominently displayed (Fraunces font)
  - Probability badge
  - Days in stage indicator
  - Quick actions on hover (call, email, edit)
  - Color-coded left border by stage

---

## Overview

The Pipeline Kanban Board is the primary interface for sales pipeline management. This wireframe covers:
- Drag-and-drop functionality with visual feedback
- Weighted totals and stale highlighting
- Advanced filters with URL persistence
- Quick inline editing
- Responsive behavior across devices

---

## Desktop View (1280px+)

```
+================================================================================+
| HEADER BAR                                                                      |
+================================================================================+
|                                                                                 |
| Pipeline                                              [Export v] [+ New Opp]    |
| Track and manage your sales opportunities                                       |
|                                                                                 |
+=== PIPELINE METRICS (aria-live="polite") ======================================+
| +------------------+ +------------------+ +------------------+ +---------------+|
| | Conversion Rate  | | Avg Deal Value   | | Total Value      | | Weighted Val  ||
| | 45.2%            | | $12,500          | | $450,000         | | $198,000      ||
| | [sparkline]      | | [sparkline]      | | [sparkline]      | | (calculated)  ||
| +------------------+ +------------------+ +------------------+ +---------------+|
+=================================================================================+
|                                                                                 |
+=== FILTER BAR (role="search") =================================================+
| [Search opportunities...___________________] [Clear Filters]                    |
|                                                                                 |
| [Sales Rep v] [Customer v] [Expected Close: From ___ To ___] [Value: $__ - $__]|
|                                                                                 |
| Active Filters: [John Doe x] [> $10,000 x]              Sort: [Value (High) v] |
+=================================================================================+
|                                                                                 |
+=== KANBAN BOARD (role="region" aria-label="Pipeline board") ===================+
|                                                                                 |
| +-- NEW -----------+ +-- QUOTED --------+ +-- PENDING -------+ +-- ORDERED ---+|
| | (12) $485,000    | | (8) $625,000     | | (5) $340,000     | | (3) $178,000 ||
| | W: $97,000       | | W: $375,000      | | W: $255,000      | | W: $160,200  ||
| +------------------+ +------------------+ +------------------+ +----------------+|
| |                  | |                  | |                  | |              | |
| | +==============+ | | +==============+ | | +==============+ | | +===========+| |
| | |[DRAG HANDLE]|| | | |[DRAG HANDLE]|| | | |[DRAG HANDLE]|| | | |[DRAG     ]|| |
| | | Sunrise Solar|| | | | GreenTech Qld|| | | | Perth BESS   || | | | Melb Inst||| |
| | | $65,000      || | | | $125,000     || | | | $85,000      || | | | $58,000  ||| |
| | | [30%] Jan 15 || | | | [60%] Jan 20 || | | | [75%] Jan 10 || | | | [90%]    ||| |
| | | [STALE 32d]  || | | | 50kWh BESS   || | | | 10kWh Resi   || | | | 25kWh x2 ||| |
| | | [E] [...]    || | | | [E] [...]    || | | | [E] [...]    || | | | [E] [...] ||| |
| | +==============+ | | +==============+ | | +==============+ | | +===========+| |
| |                  | |                  | |                  | |              | |
| | +--------------+ | | +--------------+ | | +--------------+ | |              | |
| | | Coast Solar  | | | | Adelaide BESS| | | | Gov Tender   | | |              | |
| | | $42,000      | | | | $78,000      | | | | $95,000      | | |              | |
| | | [20%] Jan 25 | | | | [45%] Feb 1  | | | | [80%] Jan 8  | | |              | |
| | | 15kWh Hybrid | | | | Commercial   | | | |[OVERDUE] !   | | |              | |
| | +--------------+ | | +--------------+ | | +--------------+ | |              | |
| |                  | |                  | |                  | |              | |
| | [+ Add Card]     | | [+ Add Card]     | | [+ Add Card]     | | [+ Add Card] | |
| +------------------+ +------------------+ +------------------+ +----------------+|
|                                                                                 |
| +-- WON -----------+ +-- LOST ----------+                                       |
| | (23) $1,875,000  | | (7) $245,000     |                                       |
| | W: $1,875,000    | | W: $0            |                                       |
| +------------------+ +------------------+                                       |
| |                  | |                  |                                       |
| | [Collapsed -     | | [Collapsed -     |                                       |
| |  Show 23 items]  | |  Show 7 items]   |                                       |
| +------------------+ +------------------+                                       |
|                                                                                 |
+=================================================================================+

LEGEND:
[30%]      = Probability badge (intensity indicates confidence)
[STALE]    = No activity 30+ days - muted styling
[OVERDUE]  = Expected close date passed - red highlight
[E]        = Edit button (keyboard: press 'E' when card focused)
[...]      = More actions menu
W:         = Weighted total (value * probability/100)
```

---

## Drag-and-Drop Interaction States

### 1. Idle State (No Drag)
```
+==============+
| Acme Corp    |
| $15,000      |
| [30%] Jan 15 |
| [E] [...]    |
+==============+
  ^cursor: grab
```

### 2. Dragging State
```
+~~~~~~~~~~~~~~+  <- Source card placeholder (dashed border)
|              |
|              |
+~~~~~~~~~~~~~~+

      +================+  <- Drag overlay (follows cursor)
      || Acme Corp    ||     elevated shadow, slight rotation
      || $15,000      ||     opacity: 0.9
      || Moving to... ||
      +================+
              |
              v cursor: grabbing
```

### 3. Over Drop Zone (Valid)
```
+-- QUOTED --------+
| (8) $625,000     |
| DROP HERE        |  <- Column header highlights (blue glow)
+------------------+
|                  |
| +==============+ |
| | GreenTech Qld| |  <- Existing cards shift down
| | $125,000     | |
| +==============+ |
|                  |
| +~~~~~~~~~~~~~~+ |  <- Drop indicator (blue dashed line)
| |  Drop here   | |     height: 4px animated pulse
| +~~~~~~~~~~~~~~+ |
|                  |
+------------------+
```

### 4. Over Drop Zone (Won/Lost - Confirmation Required)
```
+-- WON -----------+
| (23) $125,000    |
| CONFIRM REQUIRED |  <- Orange warning glow
+------------------+
|                  |
| +##############+ |
| # CONFIRM WIN? # |  <- Pulsing border
| # This will    # |
| # mark as won  # |
| +##############+ |
|                  |
+------------------+
```

### 5. Drop Complete - Card Flip Animation (SIGNATURE MOMENT)
```
FRAME 1:        FRAME 2:        FRAME 3:        FRAME 4:
+----------+    +----+          +----+          +----------+
| Sunrise  |    |    |          |    |          | Sunrise  |
| QUOTED   | -> |    | ->       |    | ->       | PENDING  |
| $65,000  |    |    |          |    |          | $65,000  |
+----------+    +----+          +----+          +----------+
  (0deg)        (45deg)         (90deg)         (180deg flip)
                scale: 0.9      scale: 0.8      scale: 1.0
                                                green pulse
```

---

## Card States

### Standard Card
```
+==========================================+
| [=] [Sunrise Solar NSW]         [30%]    |  <- Drag handle, name, probability
|------------------------------------------+
| $65,000                     Expected:    |
| Weighted: $19,500           Jan 15, 2026 |
|------------------------------------------+
| Sarah Smith (Sales Rep)                  |
| System: 30kWh BESS + 15kW Hybrid Inverter|
|------------------------------------------+
| [Edit] [Schedule Follow-up] [...]        |
+==========================================+
  Background: probability-based intensity
  30% = light shade, 90% = dark shade
  Quote: Residential battery storage system
```

### Stale Card (No activity 30+ days)
```
+==========================================+
| [=] [Coast Solar Installers]  [20%]     |
|==========================================|
| $42,000                     Expected:    |
| Weighted: $8,400            Jan 25, 2026 |
|------------------------------------------+
| [!] STALE - 32 days inactive             |  <- Warning badge with icon
| System: 15kWh Hybrid Storage             |
|------------------------------------------+
| [Edit] [Schedule Follow-up] [...]        |
+==========================================+
  Border: muted/gray dashed
  Background: faded/desaturated
  aria-label: "Stale opportunity - no activity for 32 days"
```

### Overdue Card (Past expected close)
```
+==========================================+
| [=] [Government Tender BESS]   [80%]     |
|==========================================|
| $95,000                     OVERDUE!     |  <- Red text with icon
| Weighted: $76,000           Jan 8 (2d)   |
|------------------------------------------+
| Sarah Smith (Sales Rep)                  |
| System: 100kWh Commercial BESS           |
|------------------------------------------+
| [Edit] [Schedule Follow-up] [...]        |
+==========================================+
  Border: red
  Expected date: red background badge
  aria-label: "Overdue - expected close was 2 days ago"
```

### Card with Expiring Quote
```
+==========================================+
| [=] [GreenTech Queensland]     [60%]     |
|==========================================|
| $125,000                    Expected:    |
| Weighted: $75,000           Jan 20, 2026 |
|------------------------------------------+
| [!] Quote expires in 3 days              |  <- Yellow warning
| System: 50kWh Commercial BESS            |
|------------------------------------------+
| [Edit] [Extend Quote] [...]              |  <- Extend action prominent
+==========================================+
```

---

## Inline Edit Mode

### Card Edit Overlay (Desktop)
```
+==========================================+
| [=] [Sunrise Solar NSW]         [EDIT]   |
|==========================================|
|                                          |
| Value: [$_______65,000___]               |
|                                          |
| Probability:                             |
| [====O=============] 45%                 |  <- Slider with live update
| (aria-valuenow="45" aria-valuemin="0"    |
|  aria-valuemax="100")                    |
|                                          |
| Expected Close: [Jan 15, 2026 v]         |  <- Date picker
|                                          |
| Notes:                                   |
| [30kWh BESS + 15kW hybrid inverter___]   |
|                                          |
| [Cancel (Esc)] [Save Changes (Enter)]    |
+==========================================+
  Focus trap active
  Tab navigates fields
  Escape cancels
  aria-live announces changes
```

### Quick Edit Actions
```
Keyboard Shortcuts (when card focused):
  E          -> Open inline edit
  Enter      -> Open full panel
  Arrow Keys -> Navigate between cards
  Space      -> Select card for bulk action
  D          -> Start drag
```

---

## Tablet View (768px - 1279px)

```
+================================================================+
| Pipeline                              [Export] [+ New Opp]      |
+================================================================+
|                                                                 |
| +----------+ +----------+ +----------+ +----------+             |
| | Conv 45% | | Avg $78K | | Tot $3.7M| | Wtd $2.1M|             |
| +----------+ +----------+ +----------+ +----------+             |
|                                                                 |
| [Search...___________] [Filters v]  <- Filters collapse to menu |
|                                                                 |
| <- Horizontal scroll for columns ->                             |
| +============================================================+  |
| | +-- NEW ---+ +-- QUOTED-+ +-- PEND --+ +-- ORD --+ +--WON--+| |
| | | (12)     | | (8)      | | (5)      | | (3)     | | (23)  || |
| | | $485K    | | $625K    | | $340K    | | $178K   | | $1.8M || |
| | +----------+ +----------+ +----------+ +---------+ +-------+| |
| | |+--------+| |+--------+| |+--------+| |+-------+| |Expand || |
| | || Sunrise|| ||GreenTch|| ||PerthBSS|| ||MelbIns|| |  v    || |
| | || $65K   || || $125K  || || $85K   || || $58K  || |       || |
| | |+--------+| |+--------+| |+--------+| |+-------+| |       || |
| +============================================================+  |
|                                                                 |
+================================================================+
  - Cards show compact info (name, value only)
  - Tap card to open slide-out detail panel
  - Inline edit via mini-dialog overlay
  - Horizontal scroll indicator at bottom
```

---

## Mobile View (< 768px)

### Option A: List View (Default on Mobile)
```
+================================+
| Pipeline          [+] [=]      |  <- FAB and menu
+================================+
|                                |
| Total: $3.7M  Weighted: $2.1M  |
+================================+
|                                |
| [Filters...] [Sort: Value v]   |
|                                |
| === NEW (12) - $485,000 =======|
|                                |
| +----------------------------+ |
| | Sunrise Solar NSW          | |
| | $65,000  [30%]  Jan 15     | |
| | [STALE 32d]                | |
| | 30kWh BESS + 15kW Inverter | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | Coast Solar Installers     | |
| | $42,000  [20%]  Jan 25     | |
| | 15kWh Hybrid Storage       | |
| +----------------------------+ |
|                                |
| === QUOTED (8) - $625,000 ====|
|                                |
| +----------------------------+ |
| | GreenTech Queensland       | |
| | $125,000  [60%]  Jan 20    | |
| | [!] Quote expires 3d       | |
| | 50kWh Commercial BESS      | |
| +----------------------------+ |
|                                |
| [Load More...]                 |
|                                |
+================================+
| [+] <- Floating Action Button  |
+================================+
```

### Option B: Swimlane View (Swipeable)
```
+================================+
| Pipeline          [List] [+]   |
+================================+
|                                |
| <-swipe-> [NEW] [QUOTED] [...]|
|           ^active              |
+================================+
|                                |
| NEW (12) - $485,000            |
| Weighted: $97,000              |
|                                |
| +----------------------------+ |
| | [=] Sunrise Solar NSW      | |
| |    $65,000  30%  Jan 15    | |
| |    30kWh BESS + 15kW Inv.  | |
| +----------------------------+ |
|        |                       |
|        v swipe down            |
| +----------------------------+ |
| | [=] Coast Solar Installers | |
| |    $42,000  20%  Jan 25    | |
| |    15kWh Hybrid Storage    | |
| +----------------------------+ |
|                                |
+================================+
  - Swipe left/right changes stage
  - Swipe card left for quick actions
  - Swipe card right to advance stage
```

### Mobile Filters (Bottom Sheet)
```
+================================+
| Filters                    [x] |
+================================+
|                                |
| Sales Rep                      |
| [All Reps               v]     |
|                                |
| Customer                       |
| [Search customers...    ]      |
|                                |
| Expected Close                 |
| [From: ___] [To: ___]          |
|                                |
| Value Range                    |
| [Min: $___] [Max: $___]        |
|                                |
| Show                           |
| [x] Stale (30+ days)           |
| [x] Expiring quotes            |
| [x] Overdue                    |
|                                |
| [Clear All] [Apply Filters]    |
+================================+
```

---

## Loading States

### Initial Board Load
```
+-- NEW -----------+ +-- QUOTED --------+
| [skeleton]       | | [skeleton]       |
| [skeleton]       | | [skeleton]       |
+------------------+ +------------------+
|                  | |                  |
| +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ |
| | [shimmer]    | | | | [shimmer]    | |
| | [shimmer]    | | | | [shimmer]    | |
| | [shimmer]    | | | | [shimmer]    | |
| +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ |
|                  | |                  |
| +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ |
| | [shimmer]    | | | | [shimmer]    | |
| | [shimmer]    | | | | [shimmer]    | |
| +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ |
+------------------+ +------------------+
```

### Column Total Refresh
```
+-- QUOTED --------+
| (8) [shimmer===] |  <- Only totals shimmer
| W: [shimmer====] |
+------------------+
| Cards remain     |
| visible during   |
| total refresh    |
+------------------+
```

### Drag Operation Processing
```
+==============+
| Acme Corp    |
| [spinner]    |  <- Small spinner
| Updating...  |
+==============+
  Card dims slightly during save
  aria-busy="true"
```

---

## Empty States

### Empty Column
```
+-- NEW -----------+
| (0) $0           |
| W: $0            |
+------------------+
|                  |
|   [illustration] |
|                  |
|   No new         |
|   opportunities  |
|                  |
|   New leads      |
|   appear here    |
|                  |
| [+ Add First]    |
+------------------+
```

### No Filter Results
```
+================================================================+
|                                                                 |
|                    [illustration]                               |
|                                                                 |
|              No opportunities match your filters                |
|                                                                 |
|    Try adjusting your search or [Clear All Filters]             |
|                                                                 |
+================================================================+
```

---

## Error States

### Failed to Load Board
```
+================================================================+
| [!] Unable to load pipeline                                     |
|                                                                 |
|     There was a problem loading your opportunities.             |
|     Please try again.                                           |
|                                                                 |
|     [Retry]                                                     |
+================================================================+
  role="alert"
  Focus moves to retry button
```

### Failed to Move Card
```
+==========================================+
| [!] Move Failed                          |
|                                          |
| Could not move "Sunrise Solar NSW"       |
| to Quoted. Opportunity reverted.         |
|                                          |
| [Dismiss] [Try Again]                    |
+==========================================+
  Toast notification
  Card returns to original position
  aria-live="assertive"
```

### Inline Edit Save Error
```
+==========================================+
| [=] [Sunrise Solar NSW]         [EDIT]   |
|==========================================|
|                                          |
| [!] Failed to save changes               |  <- Inline error banner
|                                          |
| Value: [$_______65,000___]               |
|        ^ [Required field]                |  <- Field-level error
|                                          |
| [Cancel] [Retry Save]                    |
+==========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```
<main role="main" aria-label="Pipeline board">
  <section role="region" aria-label="Pipeline metrics">
    <div role="status" aria-live="polite">
      <!-- Metrics update announcements -->
    </div>
  </section>

  <section role="search" aria-label="Filter opportunities">
    <!-- Filter controls -->
  </section>

  <section role="region" aria-label="Kanban board">
    <div role="list" aria-label="Pipeline stages">
      <article role="listitem" aria-label="New stage, 12 opportunities, $485,000">
        <h3>NEW</h3>
        <div role="list" aria-label="Opportunities in New stage">
          <article role="listitem"
                   aria-label="Sunrise Solar NSW, $65,000, 30% probability, 30kWh BESS system"
                   tabindex="0"
                   aria-grabbed="false">
            <!-- Card content -->
          </article>
        </div>
      </article>
    </div>
  </section>
</main>
```

### Keyboard Navigation
```
Tab Order:
1. Search input
2. Filter controls (left to right)
3. Clear filters button
4. Sort dropdown
5. First card in first column
6. Navigate cards with arrow keys:
   - Left/Right: Move between columns
   - Up/Down: Move within column
7. Add card buttons
8. FAB (mobile)

Card Actions:
- Enter: Open opportunity panel
- E: Start inline edit
- Space: Toggle selection
- D: Start drag mode (then arrow keys to move)
- Delete: Opens delete confirmation (if permitted)

Drag Mode:
- Arrow keys move card between columns/positions
- Enter confirms drop
- Escape cancels drag
```

### Screen Reader Announcements
```
On filter apply:
  "Showing 15 of 55 opportunities matching filters"

On card drag start:
  "Sunrise Solar NSW grabbed. Use arrow keys to move between stages.
   Press Enter to drop, Escape to cancel."

On card drop:
  "Sunrise Solar NSW moved to Quoted stage. Probability updated to 30%."

On stage change to Won/Lost:
  "Moving to Won stage. Confirmation dialog opened.
   Select a win reason to complete."

On totals update:
  "Pipeline totals updated. Total value: $3.7M. Weighted: $2.1M."
```

---

## Confirmation Dialogs

### Move to Won Confirmation
```
+================================================+
| Mark as Won                               [x]  |
+================================================+
|                                                |
| [Trophy Icon]                                  |
|                                                |
| Congratulations! Mark "Sunrise Solar NSW" as   |
| won for $65,000?                               |
|                                                |
| Win Reason *                                   |
| [Select a reason...              v]            |
|   - Better pricing                             |
|   - Superior features                          |
|   - Relationship                               |
|   - Competitor weakness                        |
|   - Other                                      |
|                                                |
| Notes (optional)                               |
| [Add any additional notes...        ]          |
|                                                |
|                    [Cancel] [Confirm Win]      |
+================================================+
  Focus trap active
  Win Reason required before Confirm enabled
  aria-labelledby="dialog-title"
```

### Move to Lost Confirmation
```
+================================================+
| Mark as Lost                              [x]  |
+================================================+
|                                                |
| Mark "Sunrise Solar NSW" as lost?              |
|                                                |
| Loss Reason *                                  |
| [Select a reason...              v]            |
|   - Price too high                             |
|   - Missing features                           |
|   - Chose competitor                           |
|   - Budget constraints                         |
|   - Timeline mismatch                          |
|   - No decision                                |
|   - Other                                      |
|                                                |
| Competitor (if applicable)                     |
| [Competitor name...                 ]          |
|                                                |
| Notes                                          |
| [What could we have done differently?]         |
|                                                |
|                   [Cancel] [Confirm Loss]      |
+================================================+
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial board load | < 2s | Time to interactive |
| Drag start response | < 100ms | From mousedown to visual feedback |
| Drop response | < 500ms | From drop to card settled |
| Filter apply | < 500ms | From click to board update |
| Inline edit save | < 1s | From save to confirmation |
| Column totals update | < 200ms | After any value change |

---

## Related Wireframes

- [Opportunity Card Detail](./pipeline-opportunity-card.wireframe.md)
- [Forecasting Fields UI](./pipeline-forecasting-fields.wireframe.md)
- [Quote Validity Badge](./pipeline-quote-validity.wireframe.md)
- [Pipeline Forecasting Report](./pipeline-forecasting-report.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
