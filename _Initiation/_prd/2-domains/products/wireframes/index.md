# Products Domain Wireframes Index

**Domain:** Product Catalog (DOM-PRODUCTS)
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/products.prd.json`
**Domain Color:** Emerald-500

---

## Overview

This directory contains detailed wireframes for all UI components in the Products domain. Each wireframe includes:
- Mobile (375px), Tablet (768px), and Desktop (1280px+) responsive layouts
- All interaction states (loading, empty, error, success)
- Accessibility specifications (ARIA, keyboard navigation, screen reader)
- Animation choreography with timing
- Component props interfaces (TypeScript)

---

## Wireframe Files

| File | PRD Stories | Description |
|------|-------------|-------------|
| [DOM-PROD-001c.wireframe.md](./DOM-PROD-001c.wireframe.md) | DOM-PROD-001c | Price tier editor, customer-specific pricing, resolved price display in quotes/orders |
| [DOM-PROD-002c.wireframe.md](./DOM-PROD-002c.wireframe.md) | DOM-PROD-002c | Bundle editor, component management, bundle display in orders for picking |
| [DOM-PROD-003c.wireframe.md](./DOM-PROD-003c.wireframe.md) | DOM-PROD-003c | Image uploader, gallery, lightbox, drag-drop reorder, primary image selection |
| [DOM-PROD-004c.wireframe.md](./DOM-PROD-004c.wireframe.md) | DOM-PROD-004c | Attribute management settings, product form editor, specs display, attribute filters |
| [DOM-PROD-006c.wireframe.md](./DOM-PROD-006c.wireframe.md) | DOM-PROD-006c | Discontinue dialog, status filtering, order warnings, replacement suggestions |
| [DOM-PROD-007c.wireframe.md](./DOM-PROD-007c.wireframe.md) | DOM-PROD-007c | Related products management, accessories/alternatives/upgrades display |
| [DOM-PROD-008c.wireframe.md](./DOM-PROD-008c.wireframe.md) | DOM-PROD-008c | Enhanced search, suggestions, highlights, recent searches, result counts |

---

## Story to Wireframe Mapping

| Story ID | Story Name | Wireframe | Type |
|----------|------------|-----------|------|
| DOM-PROD-001c | Price Tiers: UI | DOM-PROD-001c | UI Component |
| DOM-PROD-002c | Product Bundles: UI | DOM-PROD-002c | UI Component |
| DOM-PROD-003c | Product Images: UI | DOM-PROD-003c | UI Component |
| DOM-PROD-004c | Product Attributes: UI | DOM-PROD-004c | UI Component |
| DOM-PROD-006c | Discontinued Product Handling: UI | DOM-PROD-006c | UI Component |
| DOM-PROD-007c | Related Products: UI | DOM-PROD-007c | UI Component |
| DOM-PROD-008c | Product Search Optimization: UI | DOM-PROD-008c | UI Component |

---

## Signature Moments

The Products domain includes these distinctive interaction moments:

### 1. Price Resolution Preview
- **Location:** Price Tier Editor
- **Trigger:** Quantity/customer selection change
- **Animation:** Number counter animation for calculated price
- **Duration:** 300ms
- **File:** `DOM-PROD-001c.wireframe.md`

### 2. Bundle Component Drag
- **Location:** Bundle Editor
- **Trigger:** Drag component to reorder
- **Animation:** Elevated drag state, smooth reorder
- **Duration:** 200ms per position
- **File:** `DOM-PROD-002c.wireframe.md`

### 3. Image Lightbox Transition
- **Location:** Product Image Gallery
- **Trigger:** Click thumbnail
- **Animation:** Zoom from thumbnail to full screen
- **Duration:** 300ms
- **File:** `DOM-PROD-003c.wireframe.md`

### 4. Specification Card Load
- **Location:** Product Attributes Tab
- **Trigger:** Tab activation
- **Animation:** Staggered card fade-in
- **Duration:** 300ms (50ms stagger)
- **File:** `DOM-PROD-004c.wireframe.md`

### 5. Discontinue Confirmation
- **Location:** Product Detail Actions
- **Trigger:** Discontinue action
- **Animation:** Warning dialog with impact summary
- **Duration:** 200ms modal transition
- **File:** `DOM-PROD-006c.wireframe.md`

### 6. Add All Accessories
- **Location:** Related Products / Quote Builder
- **Trigger:** "Add All" button click
- **Animation:** Sequential highlight + confetti burst
- **Duration:** 400ms (staggered)
- **File:** `DOM-PROD-007c.wireframe.md`

### 7. Search Autocomplete
- **Location:** Product Search
- **Trigger:** Typing in search field
- **Animation:** Suggestions dropdown with quick results
- **Duration:** 150ms dropdown, 200ms debounce
- **File:** `DOM-PROD-008c.wireframe.md`

---

## Responsive Breakpoints

| Breakpoint | Width | Key Adaptations |
|------------|-------|-----------------|
| Mobile | < 768px | Bottom sheets for modals, collapsed sections, swipe gestures |
| Tablet | 768px - 1279px | Side-by-side layouts, dropdown panels, horizontal scroll |
| Desktop | >= 1280px | Full layouts, inline editing, command palette search |

---

## Component Patterns Used

### From Shared UI Library
- **FormHeader/Section/Footer** - All form layouts
- **DataTable** - Lists with actions
- **Dialog** - All modals and confirmations
- **Combobox** - Product search, attribute selects
- **Slider** - Price range filters
- **DatePicker** - Discontinued date selection
- **Badge** - Status indicators, price source
- **Toast** - Success/error notifications

### Domain-Specific Components
- **PriceTierEditor** - Volume discount CRUD
- **PricePreview** - Resolution calculator
- **BundleEditor** - Component management
- **BundlePickingList** - Order fulfillment view
- **ImageUploader** - Drag-drop upload zone
- **ImageGallery** - Thumbnail + lightbox
- **AttributeEditor** - Dynamic form based on category
- **AttributeFilter** - Range/select filters
- **DiscontinueBanner** - Warning with replacement
- **RelatedProductsDisplay** - Grouped relations
- **ProductSearch** - Enhanced search with suggestions

---

## Accessibility Checklist

All wireframes include:

- [x] ARIA roles and labels for all interactive elements
- [x] Keyboard navigation paths documented
- [x] Screen reader announcements for state changes
- [x] Focus management for dialogs and modals
- [x] Color-independent status indicators (icons + color)
- [x] Touch targets >= 44px on mobile
- [x] Live regions for dynamic updates
- [x] Proper heading hierarchy

---

## Performance Targets

| Component | Load Target | Response Target |
|-----------|-------------|-----------------|
| Price Tier Editor | < 500ms | Save: < 500ms |
| Bundle Editor | < 1s | Add component: < 300ms |
| Image Gallery | < 1s | Upload: progress shown |
| Attribute Editor | < 500ms | Save: < 500ms |
| Product List | < 1s | Filter: < 300ms |
| Product Search | < 300ms | Suggestions: < 100ms |
| Related Products | < 500ms | Add relation: < 300ms |

---

## Domain Color Usage

**Primary:** Emerald-500 (`#10B981`)

Used for:
- Active states on product-related UI
- Price/savings highlights
- Success indicators
- Progress bars
- Primary action buttons in product context

Supporting colors:
- **Gray-500:** Neutral text, borders
- **Red-500:** Error states, discontinued badges
- **Yellow-500:** Warning states, expiring notices
- **Blue-500:** Info badges, links

---

## Related Documentation

- **PRD:** `/memory-bank/prd/domains/products.prd.json`
- **Audit:** `/memory-bank/prd/_audits/products-audit.json`
- **Schema:** `/lib/schema/products.ts`
- **Server Functions:** `/src/server/functions/products.ts`
- **Glossary:** `/memory-bank/_meta/glossary.md`

---

## Component Integration Points

### Product Detail Page Tabs
1. Overview (existing)
2. **Pricing** (DOM-PROD-001c) - Price tiers
3. **Components** (DOM-PROD-002c) - Bundle editor (if isBundle)
4. **Images** (DOM-PROD-003c) - Image gallery
5. **Attributes** (DOM-PROD-004c) - Specifications
6. Stock (existing)
7. **Related** (DOM-PROD-007c) - Related products

### Product List Enhancements
- **Search** (DOM-PROD-008c) - Enhanced search bar
- **Filters** (DOM-PROD-004c) - Attribute filters
- **Status Filter** (DOM-PROD-006c) - Active/Discontinued toggle
- **Image Column** (DOM-PROD-003c) - Primary image display

### Order/Quote Integration
- **Price Display** (DOM-PROD-001c) - Resolved price with source
- **Bundle Expansion** (DOM-PROD-002c) - Components for picking
- **Discontinued Warning** (DOM-PROD-006c) - Item warnings
- **Accessory Suggestions** (DOM-PROD-007c) - Upsell opportunities
- **Product Picker** (DOM-PROD-008c) - Search in context

### Settings Pages
- **Product Attributes** (DOM-PROD-004c) - `/settings/product-attributes`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | UI Wireframe Generator | Initial wireframes for all UI stories |

---

## Next Steps

1. Review wireframes with design team
2. Prototype signature moments in Framer/Figma
3. Component implementation following wireframe specs
4. Accessibility audit on implemented components
5. Performance testing against targets
6. User testing with real product data
