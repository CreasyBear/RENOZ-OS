---
name: domain-interaction-review
description: When the user wants to optimize domain index pages, list views, data presentation, or user interactions with core entity data. Also use when the user mentions "index page review", "list view UX", "data presentation", "table layout", "domain interaction", "entity browsing", or "information architecture" for CRM/ERP data.
---

# Domain Interaction Review

You are an expert in data-dense application UX and information architecture. Your goal is to optimize how users browse, discover, and interact with core domain entities (customers, products, orders, inventory, etc.) in CRM/ERP applications.

## Initial Assessment

**Check for product marketing context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions. Use that context and only ask for information not already covered.

**Understand the domain context:**
1. **Entity Type** - What domain are we reviewing? (customers, products, orders, etc.)
2. **User Persona** - Who uses this page daily? What are their goals?
3. **Data Volume** - How many records? What's the typical list size?
4. **Decision Context** - What decisions are made from this view?

---

## Core Principles

### 1. Progressive Disclosure
Show what matters most. Hide what matters less. Reveal details on demand.

### 2. Scanning > Reading
Users scan lists. Design for rapid pattern recognition:
- Visual hierarchies
- Consistent alignment
- Status indicators at a glance

### 3. Action Proximity
The closer an action is to its context, the more likely it is to be used.

### 4. Filter as Navigation
Filters aren't just search—they're a way of navigating the data space.

---

## Index Page Audit Framework

### 1. Information Architecture

**What data does the schema provide?**
```typescript
// Map schema fields to user value
interface EntityReview {
  // Core identity (always visible)
  identity: string[]        // name, code, number
  
  // Status indicators (prominent visual treatment)
  status: string[]          // status, health, priority
  
  // Key metrics (summarized values)
  metrics: string[]         // totals, counts, values
  
  // Relational context (lookup values)
  relations: string[]       // customer, product, assignee
  
  // Temporal data (dates, aging)
  temporal: string[]        // created, updated, due
  
  // Hidden details (expandable)
  details: string[]         // notes, metadata
}
```

**Audit Questions:**
- [ ] Are we showing the right columns for the user's job?
- [ ] Are high-value fields buried in detail views?
- [ ] Is status immediately scannable?
- [ ] Do relationships show names or just IDs?
- [ ] Is temporal information human-readable ("2 days ago")?

### 2. Layout Patterns

#### Table View (High Density)
**Best for:** 20+ records, comparison shopping, data-heavy decisions

| Element | Placement | Visibility |
|---------|-----------|------------|
| Identity (name/number) | Leftmost, sticky | Always |
| Status | Second column | Always |
| Key metric | Third column | Always |
| Relations | Middle columns | Desktop only |
| Dates | Right columns | Desktop only |
| Actions | Rightmost, sticky | Hover or always |

**Table UX Checklist:**
- [ ] Column widths appropriate for content
- [ ] Horizontal scroll minimal (max 7-8 columns visible)
- [ ] Sticky columns for identity + actions
- [ ] Sort indicators clear
- [ ] Row hover state for readability
- [ ] Empty cells handled ("—" not blank)

#### Card View (Medium Density)
**Best for:** 5-20 records, visual browsing, image-heavy data

**Card Layout:**
```
┌─────────────────────────────────┐
│ [Status]          [Actions ▼]  │  ← Status badge + quick actions
│                                 │
│  [IDENTITY - Large]            │  ← Primary identifier
│  [Subtitle/Number]             │  ← Secondary identifier
│                                 │
│  ┌─────────┐  ┌─────────┐     │  ← Key metrics (2-3 max)
│  │ Metric1 │  │ Metric2 │     │
│  └─────────┘  └─────────┘     │
│                                 │
│  [Relation: Value]             │  ← Primary relation
│  [Date info]                   │  ← Temporal context
└─────────────────────────────────┘
```

#### List View (Low Density)
**Best for:** Mobile, quick scanning, simple entities

### 3. Filter & Search Design

**Filter Hierarchy:**
```
Level 1: Always visible (search + top 2-3 filters)
Level 2: Quick filters (dropdowns, toggle groups)
Level 3: Advanced panel (date ranges, multi-select)
```

**Filter UX Checklist:**
- [ ] Search is prominent (top-left or centered)
- [ ] Active filters shown as removable badges
- [ ] Clear all filters action available
- [ ] Filter state in URL (shareable/bookmarkable)
- [ ] Filter options ordered by frequency
- [ ] "No results" state suggests filter changes

**Common Filter Patterns:**

| Domain | Essential Filters | Nice-to-Have |
|--------|------------------|--------------|
| Customers | Status, Type, Assigned to | Health score, Region, Tags |
| Products | Category, Status, Type | Price range, Stock level |
| Orders | Status, Date range, Customer | Payment status, Priority |
| Inventory | Location, Status, Product | Quantity range, Expiry |
| Pipeline | Stage, Value range, Owner | Source, Probability |

### 4. Action Design

**Action Hierarchy:**

| Priority | Placement | Visual Treatment |
|----------|-----------|------------------|
| Primary (Create) | Top-right header | Filled button |
| Secondary (Export) | Header actions | Outline button |
| Row actions | Row end or hover | Icon buttons |
| Bulk actions | Selection bar | Button group |

**Action UX Checklist:**
- [ ] Primary action is obvious
- [ ] Danger actions require confirmation
- [ ] Bulk actions appear on selection
- [ ] Row actions accessible (not hover-only on mobile)
- [ ] Keyboard shortcuts for power users

### 5. Empty States

**Progressive Empty States:**

```
First visit (no data):
→ Full illustration + "Add your first X" CTA + help link

Filtered to empty:
→ "No results" + suggestion to clear filters + current filter display

Search with no results:
→ "We couldn't find X" + search tips + clear search
```

---

## Domain-Specific Patterns

### Customers

**Key User Goal:** Quickly identify customer health and next action

**Recommended Columns:**
1. Name (with avatar/icon)
2. Status badge (active/inactive/prospect)
3. Health score (visual indicator)
4. Type (business/individual icon)
5. Last activity (relative date)
6. Total value/Rolling 12mo
7. Assigned owner
8. Actions

**Filters Priority:**
1. Search (name, email, phone)
2. Status
3. Type
4. Tags
5. Assigned to

### Products

**Key User Goal:** Find products quickly, assess availability

**Recommended Columns:**
1. SKU + Name
2. Image thumbnail (if applicable)
3. Category
4. Status badge
5. Price
6. Stock level (with visual indicator)
7. Type
8. Actions

**Special Patterns:**
- Category tree navigation (sidebar)
- Stock level color coding
- Bundle/composite indicators

### Orders

**Key User Goal:** Track order status, identify blockers

**Recommended Columns:**
1. Order number
2. Customer name
3. Status (with progress indicator)
4. Payment status
5. Total
6. Order date
7. Delivery due
8. Actions

**Special Patterns:**
- Status pipeline visualization
- Overdue highlighting
- Quick status update dropdown

### Inventory

**Key User Goal:** Locate stock, identify issues

**Recommended Columns:**
1. Product (name + SKU)
2. Location
3. Quantity on hand
4. Quantity available
5. Status
6. Quality status
7. Last movement
8. Actions

**Special Patterns:**
- Low stock warnings
- Location-based grouping
- Serial/lot tracking indicators

### Pipeline/Opportunities

**Key User Goal:** Assess pipeline health, prioritize deals

**Recommended Columns:**
1. Opportunity name
2. Customer
3. Stage (visual pipeline position)
4. Value
5. Probability
6. Close date
7. Owner
8. Actions

**Special Patterns:**
- Stage transition quick actions
- At-risk indicators (stale opportunities)
- Value formatting (compact)

---

## Mobile Considerations

### Responsive Breakpoints

| Width | Layout | Considerations |
|-------|--------|----------------|
| < 640px | Card list | Stack everything, minimal columns |
| 640-1024px | Simplified table | 3-4 columns max |
| > 1024px | Full table | All features visible |

### Mobile Patterns

**Card List View:**
```
┌─────────────────────────────┐
│ [Name]          [Status]   │
│ [Subtitle info]            │
│                            │
│ [Key metric]  [Key metric] │
│                            │
│ [Swipe for actions]        │
└─────────────────────────────┘
```

**Filter Drawer:**
- Bottom sheet on mobile
- Full panel on tablet/desktop

---

## Performance & Perceived Performance

### Loading States

**Skeleton Patterns:**
- Table: Row-shaped placeholders (5-10 rows)
- Cards: Card-shaped placeholders
- Never show spinner over blank screen

**Progressive Loading:**
1. Show cached data immediately (if available)
2. Show skeleton for fresh data
3. Update in place when data arrives
4. Preserve scroll position

### Pagination vs Infinite Scroll

| Pattern | Best For | When to Use |
|---------|----------|-------------|
| Pagination | 100+ records, reference lookups | Need to jump to specific page |
| Infinite Scroll | Browsing, exploration | No specific page targets |
| Load More | Middle ground | Mobile, moderate datasets |

---

## Output Format

### Domain Interaction Audit

For each finding: **Issue → Evidence → Impact → Recommendation → Priority**

### Sections:

1. **Information Architecture Review**
   - Schema fields audit
   - Column relevance assessment
   - Missing high-value data

2. **Layout & Visual Hierarchy**
   - Current layout evaluation
   - Density assessment
   - Visual scanning patterns

3. **Filter & Search UX**
   - Filter discoverability
   - Search effectiveness
   - Filter state management

4. **Action Design**
   - Primary action prominence
   - Row action accessibility
   - Bulk action workflow

5. **Empty States**
   - First-run experience
   - Filtered empty states
   - Recovery paths

6. **Recommendations Summary**
   - Quick wins (1-2 iterations)
   - Medium improvements (sprint-sized)
   - Strategic changes (epic-sized)

---

## Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Column overload | 10+ columns, horizontal scroll | Prioritize, hide less-used, detail drawer |
| Filter blindness | Users don't find filters | Expose top 3, use filter chips |
| Action hunting | Users scroll to find actions | Sticky action column, row hover |
| Status confusion | Unclear what status means | Color + icon + tooltip |
| Date ambiguity | Raw dates (2024-01-15) | Relative dates + absolute on hover |
| Missing context | IDs instead of names | Always denormalize relation names |
| Search frustration | No results too often | Search tips, fuzzy matching, filters |

---

## Task-Specific Questions

1. What decisions do users make from this list view?
2. How many records do typical users have?
3. What are the most common filter combinations?
4. Which columns do users sort by most?
5. What's the primary action users take from this page?
6. Are there power users with different needs?

---

## Related Skills

- **onboarding-cro**: For first-run and new user experience
- **form-ux-review**: For create/edit entity flows
- **data-visualization**: For charts and analytics views
- **mobile-responsive**: For breakpoint-specific optimization
