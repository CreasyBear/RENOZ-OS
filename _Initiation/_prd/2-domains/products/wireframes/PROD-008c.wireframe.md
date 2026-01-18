# Wireframe: DOM-PROD-008c - Product Search Optimization: UI

## Story Reference

- **Story ID**: DOM-PROD-008c
- **Name**: Product Search Optimization: UI
- **PRD**: memory-bank/prd/domains/products.prd.json
- **Type**: UI Component
- **Domain Color**: Emerald-500

## Overview

Enhanced search UI with full-text search capabilities, highlighted matching terms, recent searches saved per user, search suggestions as you type, and result count display. Built on PostgreSQL full-text search with fuzzy matching.

## UI Patterns (Reference Implementation)

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Search input with combobox functionality and autocomplete
  - Clear button (X) for instant query reset
  - Debounced input with loading spinner indicator

### Command
- **Pattern**: RE-UI Command
- **Reference**: `_reference/.reui-reference/registry/default/ui/command.tsx`
- **Features**:
  - Command palette-style global search (Cmd+K)
  - Grouped suggestions (Products, Categories, Actions)
  - Keyboard navigation and quick actions

### Popover
- **Pattern**: RE-UI Popover
- **Reference**: `_reference/.reui-reference/registry/default/ui/popover.tsx`
- **Features**:
  - Search suggestions dropdown with live results
  - Recent searches panel with delete actions
  - Advanced search filter popover

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Search result cards with highlighted matching text
  - Quick result cards in suggestion dropdown
  - No results card with search tips

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Result count badge (e.g., "12 results")
  - Match type badges (Name, SKU, Description)
  - Filter status badges showing active filters

### Separator
- **Pattern**: RE-UI Separator
- **Reference**: `_reference/.reui-reference/registry/default/ui/separator.tsx`
- **Features**:
  - Visual separation between suggestion groups
  - Divider between recent searches and suggestions
  - Section separators in advanced search panel

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | products | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/products.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Product Search (Collapsed)

```
+========================================+
| Products                     [+ New]   |
+========================================+
|                                        |
| +----------------------------------+   |
| | [search] Search products...      |   |
| +----------------------------------+   |
|                                        |
| [Category v] [Status v] [Sort v]       |
|                                        |
+========================================+
```

### Product Search (Expanded with Suggestions)

```
+========================================+
| [<] Search Products                    |
+========================================+
|                                        |
| +----------------------------------+   |
| | [x] solar pan                    |   |
| +----------------------------------+   |
|                                        |
| SUGGESTIONS                            |
| --------------------------------       |
|                                        |
| +----------------------------------+   |
| | solar panel                      |   |
| | ^matching term                   |   |
| +----------------------------------+   |
| | solar panel 400w                 |   |
| +----------------------------------+   |
| | solar panel mounting             |   |
| +----------------------------------+   |
|                                        |
| RECENT SEARCHES                        |
| --------------------------------       |
|                                        |
| +----------------------------------+   |
| | [clock] inverter 5kw         [X] |   |
| +----------------------------------+   |
| | [clock] mounting kit         [X] |   |
| +----------------------------------+   |
| | [clock] battery              [X] |   |
| +----------------------------------+   |
|                                        |
+========================================+
```

### Search Results (Mobile)

```
+========================================+
| [<] "solar panel"               [X]    |
+========================================+
|                                        |
| 12 results for "solar panel"           |
|                                        |
| +----------------------------------+   |
| | [img] [Solar Panel] 400W         |   |
| |       SP-400W | $450.00          |   |
| |       High efficiency mono...    |   |
| |       ^^^^^ matched               |   |
| +----------------------------------+   |
|                                        |
| +----------------------------------+   |
| | [img] [Solar Panel] 500W         |   |
| |       SP-500W | $550.00          |   |
| |       Premium [panel] with...    |   |
| +----------------------------------+   |
|                                        |
| +----------------------------------+   |
| | [img] [Solar Panel] 350W         |   |
| |       SP-350W | $380.00          |   |
| |       Entry level [solar]...     |   |
| +----------------------------------+   |
|                                        |
| +----------------------------------+   |
| | [img] [Solar] Mounting Kit       |   |
| |       MNT-STD | $150.00          |   |
| |       For [solar panel] inst...  |   |
| +----------------------------------+   |
|                                        |
| [Load More] (4 of 12)                  |
|                                        |
+========================================+
```

### No Results (Mobile)

```
+========================================+
| [<] "xyz123"                    [X]    |
+========================================+
|                                        |
| 0 results for "xyz123"                 |
|                                        |
| +----------------------------------+   |
| |                                  |   |
| |     [search icon]                |   |
| |                                  |   |
| |   No products found              |   |
| |                                  |   |
| |   Try:                           |   |
| |   - Check spelling               |   |
| |   - Use different keywords       |   |
| |   - Search by SKU                |   |
| |                                  |   |
| +----------------------------------+   |
|                                        |
| SUGGESTIONS                            |
| --------------------------------       |
|                                        |
| Did you mean:                          |
| [xyz] [123] [inverter]                 |
|                                        |
+========================================+
```

### Recent Searches (Full Screen)

```
+========================================+
| Recent Searches             [Clear All]|
+========================================+
|                                        |
| TODAY                                  |
| --------------------------------       |
|                                        |
| +----------------------------------+   |
| | [clock] solar panel 400w     [X] |   |
| +----------------------------------+   |
| | [clock] inverter             [X] |   |
| +----------------------------------+   |
| | [clock] mounting kit         [X] |   |
| +----------------------------------+   |
|                                        |
| YESTERDAY                              |
| --------------------------------       |
|                                        |
| +----------------------------------+   |
| | [clock] battery 10kwh        [X] |   |
| +----------------------------------+   |
| | [clock] cable mc4            [X] |   |
| +----------------------------------+   |
|                                        |
| OLDER                                  |
| --------------------------------       |
|                                        |
| +----------------------------------+   |
| | [clock] junction box         [X] |   |
| +----------------------------------+   |
| | [clock] surge protector      [X] |   |
| +----------------------------------+   |
|                                        |
+========================================+
```

---

## Tablet Wireframe (768px)

### Search with Dropdown Suggestions

```
+================================================================+
| Products                                      [+ New Product]   |
+================================================================+
|                                                                 |
| +-----------------------------------------------------------+  |
| | [search] solar pan                                    [X] |  |
| +-----------------------------------------------------------+  |
| | +-------------------------------------------------------+ |  |
| | | SUGGESTIONS                                           | |  |
| | | ----------------------------------------------------- | |  |
| | | [search] solar panel                                  | |  |
| | | [search] solar panel 400w                             | |  |
| | | [search] solar panel mounting                         | |  |
| | |                                                       | |  |
| | | RECENT SEARCHES                                       | |  |
| | | ----------------------------------------------------- | |  |
| | | [clock] inverter 5kw                              [X] | |  |
| | | [clock] mounting kit                              [X] | |  |
| | | [clock] battery                                   [X] | |  |
| | +-------------------------------------------------------+ |  |
| +-----------------------------------------------------------+  |
|                                                                 |
| [Category v] [Status v] [Price Range v] [Sort: Relevance v]     |
|                                                                 |
+================================================================+
```

### Search Results with Highlights

```
+================================================================+
| Products                                      [+ New Product]   |
+================================================================+
| +-----------------------------------------------------------+  |
| | [search] solar panel                                  [X] |  |
| +-----------------------------------------------------------+  |
|                                                                 |
| 12 results for "solar panel"                [Relevance v]       |
+================================================================+
|                                                                 |
| +-----------------------------------------------------------+  |
| |                                                            |  |
| | [img] | Product             | SKU      | Price   | Stock   |  |
| | ------+---------------------+----------+---------+-------- |  |
| | [img] | [Solar Panel] 400W  | SP-400W  | $450.00 | 125     |  |
| |       | High efficiency monocrystalline [solar] ...        |  |
| | [img] | [Solar Panel] 500W  | SP-500W  | $550.00 | 89      |  |
| |       | Premium [panel] with bifacial technology           |  |
| | [img] | [Solar Panel] 350W  | SP-350W  | $380.00 | 67      |  |
| |       | Entry level [solar panel] for residential         |  |
| | [img] | [Solar] Mounting Kit| MNT-STD  | $150.00 | 200     |  |
| |       | Universal mount for [solar panel] installation    |  |
| |                                                            |  |
| +-----------------------------------------------------------+  |
|                                                                 |
| Showing 4 of 12 results                             < 1 2 3 >   |
|                                                                 |
+================================================================+
```

### Advanced Search Panel

```
+================================================================+
| Products                                      [+ New Product]   |
+================================================================+
| +-----------------------------------------------------------+  |
| | [search] Search products, SKU, or description...      [X] |  |
| +-----------------------------------------------------------+  |
|                                                                 |
| [Advanced Search v]                                             |
| +-----------------------------------------------------------+  |
| | ADVANCED SEARCH OPTIONS                                    |  |
| | ---------------------------------------------------------- |  |
| |                                                            |  |
| | Search In:                                                 |  |
| | [x] Product Name  [x] SKU  [x] Description  [ ] Attributes |  |
| |                                                            |  |
| | Category          Price Range         Stock                |  |
| | [All Cats   v]    [$___]-[$___]       [In Stock Only]      |  |
| |                                                            |  |
| | Match Type:                                                |  |
| | (*) Contains any word  ( ) Contains all words  ( ) Exact   |  |
| |                                                            |  |
| | [Reset]                                  [Apply Search]    |  |
| +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Search with Full Suggestions Panel

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | Products                                               [+ New Product]|
| ------  | -------------------------------------------------------------------   |
| Catalog |                                                                       |
|   All   | +------------------------------------------------------------------+ |
|   Cat.  | | [search] solar pan                                           [X] | |
| Orders  | +------------------------------------------------------------------+ |
| Custmrs | | +--------------------------------------------------------------+ | |
| Reports | | |                                                              | | |
|         | | | SUGGESTIONS                          RECENT SEARCHES         | | |
|         | | | --------------------------------     ----------------------- | | |
|         | | |                                                              | | |
|         | | | [search] solar panel                 [clock] inverter 5kw    | | |
|         | | | [search] solar panel 400w            [clock] mounting kit    | | |
|         | | | [search] solar panel 500w            [clock] battery 10kwh   | | |
|         | | | [search] solar panel mounting        [clock] cable mc4       | | |
|         | | | [search] solar panel bifacial                                | | |
|         | | |                                                              | | |
|         | | | PRODUCTS (quick results)                                     | | |
|         | | | ------------------------------------------------------------ | | |
|         | | |                                                              | | |
|         | | | [img] Solar Panel 400W    SP-400W   $450.00   [View ->]      | | |
|         | | | [img] Solar Panel 500W    SP-500W   $550.00   [View ->]      | | |
|         | | | [img] Solar Panel 350W    SP-350W   $380.00   [View ->]      | | |
|         | | |                                                              | | |
|         | | | [See all 12 results for "solar pan" ->]                      | | |
|         | | +--------------------------------------------------------------+ | |
|         | +------------------------------------------------------------------+ |
|         |                                                                       |
+=========+======================================================================+
```

### Search Results Page (Full Desktop)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | Products > Search Results                              [+ New Product]|
| ------  | -------------------------------------------------------------------   |
| Catalog |                                                                       |
|   All   | +------------------------------------------------------------------+ |
|   Cat.  | | [search] solar panel                                         [X] | |
| Orders  | +------------------------------------------------------------------+ |
| Custmrs |                                                                       |
| Reports | 12 results for "solar panel"          Sort: [Relevance v] [Grid][List]|
|         |                                                                       |
|         | +------------------------------------------------------------------+ |
|         | | FILTERS                          | RESULTS                       | |
|         | | -------------------------------- | ----------------------------- | |
|         | |                                  |                               | |
|         | | Category                         | +---------------------------+ | |
|         | | [ ] Solar Panels (8)             | | [img]                     | | |
|         | | [ ] Mounting (2)                 | |                           | | |
|         | | [ ] Cables (2)                   | | [Solar Panel] 400W        | | |
|         | |                                  | | SP-400W                   | | |
|         | | Price                            | | $450.00                   | | |
|         | | [__$0__] - [__$600__]            | |                           | | |
|         | |                                  | | High efficiency mono-     | | |
|         | | Stock                            | | crystalline [solar]       | | |
|         | | [x] In Stock Only                | | [panel] with 21.5%        | | |
|         | |                                  | | efficiency rating.        | | |
|         | | Status                           | |                           | | |
|         | | [x] Active  [ ] Discontinued     | | [View Product]            | | |
|         | |                                  | +---------------------------+ | |
|         | |                                  |                               | |
|         | | [Clear Filters]                  | +---------------------------+ | |
|         | |                                  | | [img]                     | | |
|         | |                                  | |                           | | |
|         | |                                  | | [Solar Panel] 500W        | | |
|         | |                                  | | SP-500W                   | | |
|         | |                                  | | $550.00                   | | |
|         | |                                  | |                           | | |
|         | |                                  | | Premium [panel] with      | | |
|         | |                                  | | bifacial technology for   | | |
|         | |                                  | | maximum [solar] capture.  | | |
|         | |                                  | |                           | | |
|         | |                                  | | [View Product]            | | |
|         | |                                  | +---------------------------+ | |
|         | |                                  |                               | |
|         | |                                  | Showing 1-10 of 12  < 1 2 >   | |
|         | +------------------------------------------------------------------+ |
|         |                                                                       |
+=========+======================================================================+
```

### Product Picker Search (Quote/Order Context)

```
+================================================================================+
| Add Product to Quote                                                      [X]  |
+================================================================================+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | [search] Search products by name, SKU, or description...             [X] |  |
|  +--------------------------------------------------------------------------+  |
|  | +----------------------------------------------------------------------+ |  |
|  | | SUGGESTIONS                                                          | |  |
|  | | -------------------------------------------------------------------- | |  |
|  | | [search] solar panel 400w                                            | |  |
|  | | [search] solar panel                                                 | |  |
|  | |                                                                      | |  |
|  | | QUICK RESULTS                                                        | |  |
|  | | -------------------------------------------------------------------- | |  |
|  | |                                                                      | |  |
|  | | [img] | [Solar Panel] 400W | SP-400W | $450.00 | 125 | [+ Add x1]   | |  |
|  | | [img] | [Solar Panel] 500W | SP-500W | $550.00 | 89  | [+ Add x1]   | |  |
|  | | [img] | [Solar Panel] 350W | SP-350W | $380.00 | 67  | [+ Add x1]   | |  |
|  | |                                                                      | |  |
|  | | [View all 12 results ->]                                             | |  |
|  | +----------------------------------------------------------------------+ |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  RECENT ADDITIONS (this quote)                                                  |
|  +--------------------------------------------------------------------------+  |
|  | Inverter 5kW             INV-5K     x 2     $2,400.00                    |  |
|  | Mounting Kit             MNT-STD    x 10    $1,500.00                    |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

### Global Search (Command Palette Style)

```
+================================================================================+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | [search] solar                                                       [X] |  |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | PRODUCTS                                                                 |  |
|  | ---------------------------------------------------------------------- |  |
|  | [product] Solar Panel 400W           SP-400W         $450.00    [Enter] |  |
|  | [product] Solar Panel 500W           SP-500W         $550.00            |  |
|  | [product] Solar Panel 350W           SP-350W         $380.00            |  |
|  | [product] Solar Mounting Kit         MNT-STD         $150.00            |  |
|  |                                                                          |  |
|  | CATEGORIES                                                               |  |
|  | ---------------------------------------------------------------------- |  |
|  | [folder] Solar Panels                45 products                        |  |
|  |                                                                          |  |
|  | ACTIONS                                                                  |  |
|  | ---------------------------------------------------------------------- |  |
|  | [plus] Create "solar" product                                           |  |
|  | [search] Search "solar" in all products                                 |  |
|  |                                                                          |  |
|  | Press Enter to select, Esc to close                                     |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Interaction States

### Loading States

```
SEARCHING:
+----------------------------------+
| [search] solar panel_______ [X] |
|                                  |
| +------------------------------+ |
| | [spinner] Searching...       | |
| +------------------------------+ |
+----------------------------------+

LOADING MORE RESULTS:
+----------------------------------+
| Results 1-10 of 50               |
|                                  |
| [spinner] Loading more...        |
|                                  |
+----------------------------------+

SUGGESTION LOADING:
+----------------------------------+
| [search] sol                     |
|                                  |
| +------------------------------+ |
| | [......] Shimmer             | |
| | [......] Shimmer             | |
| | [......] Shimmer             | |
| +------------------------------+ |
+----------------------------------+
```

### Empty States

```
NO RESULTS:
+----------------------------------+
| 0 results for "xyz123abc"        |
|                                  |
| +------------------------------+ |
| |                              | |
| |     [search icon]            | |
| |                              | |
| |   No products found          | |
| |                              | |
| |   Suggestions:               | |
| |   - Check your spelling      | |
| |   - Try broader terms        | |
| |   - Search by SKU            | |
| |                              | |
| +------------------------------+ |
|                                  |
| Did you mean: [xyz] [abc]        |
|                                  |
+----------------------------------+

NO RECENT SEARCHES:
+----------------------------------+
| RECENT SEARCHES                  |
| -------------------------------- |
|                                  |
|   No recent searches             |
|                                  |
|   Your search history will       |
|   appear here                    |
|                                  |
+----------------------------------+

EMPTY SEARCH:
+----------------------------------+
| [search] ____________________    |
|                                  |
| +------------------------------+ |
| |                              | |
| | Start typing to search       | |
| | products by name, SKU, or    | |
| | description                  | |
| |                              | |
| | POPULAR SEARCHES             | |
| | - solar panel                | |
| | - inverter                   | |
| | - mounting                   | |
| +------------------------------+ |
+----------------------------------+
```

### Error States

```
SEARCH FAILED:
+----------------------------------+
| [!] Search failed                |
|                                  |
|     Unable to search products.   |
|     Please try again.            |
|                                  |
|     [Retry]                      |
+----------------------------------+

CONNECTION ERROR:
+----------------------------------+
| [!] Connection lost              |
|                                  |
|     Check your internet          |
|     connection and try again.    |
|                                  |
|     [Retry]                      |
+----------------------------------+
```

### Success States

```
SEARCH COMPLETE:
+----------------------------------+
| 12 results for "solar panel"     |
|                                  |
| <- Results displayed             |
+----------------------------------+

RECENT SEARCH SAVED:
+----------------------------------+
| (No visible toast - silent)      |
| Search saved to localStorage     |
+----------------------------------+

RECENT SEARCH CLEARED:
+----------------------------------+
| [checkmark] Search history       |
|             cleared              |
| <- Toast 2s                      |
+----------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Search Input**
   - Always focusable
   - Tab to clear button
   - Arrow keys navigate suggestions

2. **Suggestions Dropdown**
   - Arrow Up/Down navigate options
   - Enter selects option
   - Escape closes dropdown
   - Tab moves to next element outside

3. **Search Results**
   - Tab through result cards
   - Enter opens product detail
   - Pagination with Tab

### ARIA Requirements

```html
<!-- Search Input with Combobox -->
<div role="combobox" aria-expanded="true" aria-haspopup="listbox">
  <label for="product-search" class="visually-hidden">
    Search products
  </label>
  <input
    id="product-search"
    type="search"
    role="searchbox"
    aria-autocomplete="list"
    aria-controls="search-suggestions"
    aria-activedescendant="suggestion-1"
    placeholder="Search products, SKU, or description..."
  />
  <button aria-label="Clear search">X</button>
</div>

<!-- Suggestions Listbox -->
<ul
  id="search-suggestions"
  role="listbox"
  aria-label="Search suggestions"
>
  <li role="presentation">
    <span class="suggestion-group">Suggestions</span>
  </li>
  <li
    id="suggestion-1"
    role="option"
    aria-selected="true"
  >
    solar panel
  </li>
  <li
    id="suggestion-2"
    role="option"
    aria-selected="false"
  >
    solar panel 400w
  </li>
</ul>

<!-- Recent Searches -->
<section aria-labelledby="recent-searches-heading">
  <h3 id="recent-searches-heading">Recent Searches</h3>
  <ul role="list">
    <li>
      <button aria-label="Search for inverter 5kw">
        inverter 5kw
      </button>
      <button aria-label="Remove inverter 5kw from recent searches">
        Remove
      </button>
    </li>
  </ul>
  <button aria-label="Clear all recent searches">
    Clear All
  </button>
</section>

<!-- Search Results -->
<section aria-labelledby="results-heading">
  <h2 id="results-heading">
    12 results for "solar panel"
  </h2>
  <ul role="list" aria-label="Search results">
    <li>
      <article aria-labelledby="result-1-title">
        <h3 id="result-1-title">
          <mark>Solar Panel</mark> 400W
        </h3>
        <p>
          High efficiency monocrystalline <mark>solar</mark>
          <mark>panel</mark> with 21.5% efficiency.
        </p>
      </article>
    </li>
  </ul>
</section>

<!-- Live Region for Results Count -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="visually-hidden"
>
  Found 12 results for solar panel
</div>
```

### Screen Reader Announcements

- Typing: "12 suggestions available" (after debounce)
- Select suggestion: "Selected: solar panel 400w"
- Search complete: "Found 12 results for solar panel"
- No results: "No results found for xyz123"
- Recent removed: "Removed inverter 5kw from recent searches"
- Clear all: "Search history cleared"

---

## Animation Choreography

### Suggestions Dropdown

```
DROPDOWN OPEN:
- Duration: 150ms
- Easing: ease-out
- Origin: top center
- Scale: 0.95 -> 1
- Opacity: 0 -> 1

DROPDOWN CLOSE:
- Duration: 100ms
- Opacity: 1 -> 0

SUGGESTION HIGHLIGHT:
- Duration: 50ms
- Background color transition
```

### Search Results

```
RESULTS LOAD:
- Duration: 300ms (staggered)
- Each card: fade in + slide up
- 30ms delay between items

HIGHLIGHT APPEAR:
- Duration: 200ms
- Background: transparent -> yellow
- Text: normal -> bold (subtle)
```

### Recent Searches

```
ADD TO RECENT:
- Silent (no animation)

REMOVE SINGLE:
- Duration: 200ms
- Item: slide out right
- Others shift up

CLEAR ALL:
- Duration: 300ms
- All items: fade out simultaneously
- Empty state fades in
```

### Loading States

```
SEARCH SPINNER:
- Continuous rotation
- Appears after 200ms debounce

SKELETON SHIMMER:
- Duration: 1.5s
- Continuous gradient sweep
```

### Input Feedback

```
FOCUS:
- Duration: 150ms
- Border: gray -> emerald
- Shadow: subtle glow

TYPING:
- Clear button appears (fade in)
- Suggestions trigger after 200ms debounce
```

---

## Component Props Interfaces

```typescript
// Product Search
interface ProductSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onSelect?: (product: Product) => void;
  initialQuery?: string;
  showSuggestions?: boolean;
  showRecentSearches?: boolean;
  showQuickResults?: boolean;
  autoFocus?: boolean;
}

// Search Suggestions
interface SearchSuggestionsProps {
  query: string;
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  quickResults?: Product[];
  onSuggestionSelect: (suggestion: string) => void;
  onRecentSelect: (search: string) => void;
  onRecentRemove: (search: string) => void;
  onClearRecent: () => void;
  highlightedIndex: number;
  isLoading?: boolean;
}

interface SearchSuggestion {
  text: string;
  type: 'suggestion' | 'category' | 'sku';
  count?: number;
}

// Search Results
interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  totalCount: number;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  filters?: SearchFilters;
  onFilterChange?: (filters: SearchFilters) => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
}

interface SearchResult {
  product: Product;
  highlights: SearchHighlight[];
  score: number;
}

interface SearchHighlight {
  field: 'name' | 'description' | 'sku';
  fragments: string[]; // HTML with <mark> tags
}

interface SearchFilters {
  categories?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  status?: ('active' | 'discontinued')[];
}

// Highlighted Text
interface HighlightedTextProps {
  text: string;
  query: string;
  highlightClassName?: string;
}

// Recent Searches
interface RecentSearchesProps {
  searches: RecentSearch[];
  onSelect: (search: string) => void;
  onRemove: (searchId: string) => void;
  onClearAll: () => void;
  maxItems?: number;
}

interface RecentSearch {
  id: string;
  query: string;
  timestamp: Date;
  resultCount?: number;
}

// Product Picker Search
interface ProductPickerSearchProps {
  onSelect: (product: Product, quantity: number) => void;
  excludeProductIds?: string[];
  context?: 'quote' | 'order' | 'general';
  showRecentAdditions?: boolean;
  recentAdditions?: Product[];
}

// Global Search (Command Palette)
interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  onCategorySelect: (categoryId: string) => void;
  onActionSelect: (action: SearchAction) => void;
}

interface SearchAction {
  type: 'create' | 'search-all' | 'navigate';
  label: string;
  payload?: unknown;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/products/product-search.tsx` | Main search input component |
| `src/components/domain/products/search-suggestions.tsx` | Suggestions dropdown |
| `src/components/domain/products/search-results.tsx` | Results display |
| `src/components/domain/products/highlighted-text.tsx` | Text with highlights |
| `src/components/domain/products/recent-searches.tsx` | Recent search list |
| `src/components/domain/products/product-picker-search.tsx` | Quote/order context |
| `src/components/shared/global-search.tsx` | Command palette search |
| `src/hooks/useRecentSearches.ts` | LocalStorage management |
| `src/hooks/useProductSearch.ts` | Search API integration |
| `src/routes/catalog/index.tsx` | Search integration |

---

## Performance Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Suggestion response | < 100ms | After 200ms debounce |
| Search results | < 300ms | Full-text search |
| Fuzzy matching | < 200ms | pg_trgm similarity |
| Result rendering | < 100ms | First 10 results |
| Highlight parsing | < 50ms | Per result |

---

## Related Wireframes

- Product List (search integration)
- Quote Builder (product picker search)
- Order Creation (product search)
- Global Navigation (command palette)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Wireframe Generator
