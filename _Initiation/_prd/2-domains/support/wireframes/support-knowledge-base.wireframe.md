# Support Knowledge Base Wireframe

**Story IDs:** DOM-SUP-007a, DOM-SUP-007b, DOM-SUP-007c
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## UI Patterns (Reference Implementation)

### Knowledge Base Article List
- **Pattern**: RE-UI Accordion
- **Reference**: `_reference/.reui-reference/registry/default/ui/accordion.tsx`
- **Features**:
  - Collapsible category tree navigation
  - Nested subcategory expansion/collapse
  - Article count badges per category
  - Smooth expand/collapse animations

### Search Interface
- **Pattern**: RE-UI Command
- **Reference**: `_reference/.reui-reference/registry/default/ui/command.tsx`
- **Features**:
  - Full-text article search with keyboard shortcuts
  - Fuzzy matching for article titles and content
  - Category filtering within search results
  - Quick navigation to articles via keyboard

### Article Cards
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Article preview with title, description, metadata
  - Helpfulness percentage and view count display
  - Status badge (Published/Draft/Archived)
  - Tag chips for article categorization

### Status Indicators
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Published/Draft/Archived status indicators
  - Helpfulness rating badges (percentage-based)
  - Category labels with color coding
  - Tag badges with dismissible variants for editor

### Helpfulness Widget
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Yes/No feedback buttons with hover states
  - Success confirmation with checkmark icon
  - Feedback form for negative responses
  - Analytics tracking for article improvement

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `knowledgeBase`, `kbArticles` | NOT CREATED |
| **Server Functions Required** | Article CRUD, full-text search, helpfulness tracking | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-007a, DOM-SUP-007b | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Support Types**: Warranty claims, service requests, product questions
- **Priority**: low, normal, high, urgent

---

## Overview

The Knowledge Base (KB) provides searchable articles for support staff and (future) customers. This wireframe covers:
- Article CRUD and management
- Category hierarchy
- Full-text search
- Integration with issue creation
- Helpfulness tracking
- View count analytics

---

## Desktop View (1280px+)

### Knowledge Base List View

```
+================================================================================+
| HEADER BAR                                                      [bell] [Joel v] |
+================================================================================+
|                                                                                 |
| Knowledge Base                                           [+ New Article]        |
| Internal support documentation and FAQs                                         |
|                                                                                 |
+=== SEARCH AND FILTER =========================================================+
| +------------------------------------------------------------------------+     |
| | [magnifier] Search articles...                                         |     |
| +------------------------------------------------------------------------+     |
|                                                                                 |
| [Category: All v] [Status: Published v] [Sort: Most Viewed v]  [List] [Grid]   |
+=================================================================================+
|                                                                                 |
| +== CATEGORIES (Sidebar - 3 cols) ============================================+|
| |                                                                             ||
| |  ALL ARTICLES (156)                                                         ||
| |  ------------------------                                                   ||
| |                                                                             ||
| |  [v] Product Information (45)                                               ||
| |      - Installation Guides (18)                                             ||
| |      - Care & Maintenance (15)                                              ||
| |      - Warranty Info (12)                                                   ||
| |                                                                             ||
| |  [v] Troubleshooting (38)                                                   ||
| |      - Common Issues (22)                                                   ||
| |      - Error Messages (10)                                                  ||
| |      - DIY Fixes (6)                                                        ||
| |                                                                             ||
| |  [v] Order & Returns (28)                                                   ||
| |      - Order Status (12)                                                    ||
| |      - Return Policy (8)                                                    ||
| |      - Shipping FAQ (8)                                                     ||
| |                                                                             ||
| |  [>] Policies & Procedures (25)                                             ||
| |  [>] Internal Processes (20)                                                ||
| |                                                                             ||
| |  + Add Category                                                             ||
| |                                                                             ||
| +============================================================================+||
|                                                                                 |
| +== ARTICLE LIST (9 cols) ====================================================+|
| |                                                                             ||
| |  Showing 1-10 of 45 articles in "Product Information"                       ||
| |                                                                             ||
| |  +-- Installation Guides ---------------------------------------------------+||
| |  |                                                                         |||
| |  |  +== How to Install Inverter Hardware ===================================+|||
| |  |  |                                                                      ||||
| |  |  |  Step-by-step guide for installing handles, knobs, and hinges       ||||
| |  |  |                                                                      ||||
| |  |  |  Category: Product Information > Installation Guides                ||||
| |  |  |  Views: 1,234  |  Helpful: 89%  |  Last Updated: Jan 5              ||||
| |  |  |  Tags: [inverter] [hardware] [installation]                          ||||
| |  |  |                                                                      ||||
| |  |  |  Status: [*] Published           [ Edit ]  [ View ]  [ ... ]        ||||
| |  |  |                                                                      ||||
| |  |  +======================================================================+|||
| |  |                                                                         |||
| |  |  +== Countertop Installation Best Practices ============================+|||
| |  |  |                                                                      ||||
| |  |  |  Professional tips for countertop installation and sealing          ||||
| |  |  |                                                                      ||||
| |  |  |  Category: Product Information > Installation Guides                ||||
| |  |  |  Views: 987  |  Helpful: 92%  |  Last Updated: Dec 28               ||||
| |  |  |  Tags: [countertop] [installation] [sealing]                        ||||
| |  |  |                                                                      ||||
| |  |  |  Status: [*] Published           [ Edit ]  [ View ]  [ ... ]        ||||
| |  |  |                                                                      ||||
| |  |  +======================================================================+|||
| |  |                                                                         |||
| |  +-------------------------------------------------------------------------+||
| |                                                                             ||
| |  +-- Care & Maintenance ----------------------------------------------------+||
| |  |                                                                         |||
| |  |  +== Granite Countertop Care Guide =====================================+|||
| |  |  |                                                                      ||||
| |  |  |  How to clean and maintain granite surfaces                          ||||
| |  |  |                                                                      ||||
| |  |  |  Category: Product Information > Care & Maintenance                 ||||
| |  |  |  Views: 2,156  |  Helpful: 95%  |  Last Updated: Jan 8              ||||
| |  |  |  Tags: [granite] [cleaning] [maintenance]                           ||||
| |  |  |                                                                      ||||
| |  |  |  Status: [*] Published           [ Edit ]  [ View ]  [ ... ]        ||||
| |  |  |                                                                      ||||
| |  |  +======================================================================+|||
| |  |                                                                         |||
| |  +-------------------------------------------------------------------------+||
| |                                                                             ||
| |  Showing 1-10 of 45                               < 1 [2] 3 4 ... 5 >      ||
| |                                                                             ||
| +============================================================================+||
|                                                                                 |
+=================================================================================+
```

### Article Detail/Editor View

```
+================================================================================+
| < Back to Knowledge Base                                                        |
+================================================================================+
|                                                                                 |
| +== ARTICLE HEADER ===========================================================+|
| |                                                                             ||
| |  How to Install Inverter Hardware                      Status: [*] Published ||
| |                                                                             ||
| |  Category: Product Information > Installation Guides                        ||
| |  Created: Dec 15, 2025 by Sarah K.  |  Updated: Jan 5, 2026 by John D.      ||
| |                                                                             ||
| |  [ Edit Article ]  [ Preview ]  [ Unpublish ]  [ Delete ]                   ||
| |                                                                             ||
| +============================================================================+||
|                                                                                 |
| +== ARTICLE CONTENT ==========================================================+|
| |                                                                             ||
| |  ## Overview                                                                ||
| |                                                                             ||
| |  This guide covers the installation of inverter hardware including          ||
| |  handles, knobs, and hinges. Following these steps ensures proper          ||
| |  alignment and secure attachment.                                          ||
| |                                                                             ||
| |  ## Tools Required                                                          ||
| |                                                                             ||
| |  - Drill with appropriate bits                                              ||
| |  - Measuring tape                                                           ||
| |  - Level                                                                    ||
| |  - Screwdriver set                                                          ||
| |  - Pencil for marking                                                       ||
| |                                                                             ||
| |  ## Step-by-Step Instructions                                               ||
| |                                                                             ||
| |  ### 1. Measure and Mark                                                    ||
| |                                                                             ||
| |  Measure from the edge of the inverter door to determine handle              ||
| |  placement. Standard placement is 2.5-3 inches from the edge.              ||
| |                                                                             ||
| |  [Image: Measuring inverter door]                                            ||
| |                                                                             ||
| |  ### 2. Drill Pilot Holes                                                   ||
| |                                                                             ||
| |  Using the appropriate drill bit, create pilot holes at the                ||
| |  marked locations. Drill straight through the door.                        ||
| |                                                                             ||
| |  ...                                                                        ||
| |                                                                             ||
| +============================================================================+||
|                                                                                 |
| +== ARTICLE SIDEBAR ==========================================================+|
| |                                                                             ||
| |  +-- METRICS -----------------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  Views: 1,234                                                        |  ||
| |  |  Helpful: 89% (112 of 126 responses)                                 |  ||
| |  |  Linked to: 5 resolved issues                                        |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| |  +-- TAGS --------------------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  [inverter] [hardware] [installation] [handles] [knobs]               |  ||
| |  |  [ + Add Tag ]                                                       |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| |  +-- RELATED ARTICLES --------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  - Countertop Installation Best Practices                            |  ||
| |  |  - Hinge Adjustment Guide                                            |  ||
| |  |  - Inverter Door Alignment Tips                                       |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| +============================================================================+||
|                                                                                 |
+=================================================================================+
```

### Create/Edit Article Form

```
+================================================================+
| Create New Article                                        [X]  |
+================================================================+
|                                                                |
|  Title *                                                       |
|  +----------------------------------------------------------+  |
|  | How to Install Inverter Hardware                           |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Category *                                                    |
|  +---------------------------------------------- v-----------+  |
|  | Product Information > Installation Guides                 |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Tags                                                          |
|  +----------------------------------------------------------+  |
|  | [inverter x] [hardware x] [installation x] [+ add tag]     |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  Content *                                                     |
|  +----------------------------------------------------------+  |
|  | [B] [I] [U] [H1] [H2] [List] [Link] [Image] [Code]        |  |
|  +----------------------------------------------------------+  |
|  |                                                           |  |
|  | ## Overview                                                |  |
|  |                                                           |  |
|  | This guide covers the installation of inverter hardware    |  |
|  | including handles, knobs, and hinges...                   |  |
|  |                                                           |  |
|  |                                                           |  |
|  |                                                           |  |
|  |                                                           |  |
|  |                                                           |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  Status                                                        |
|  +----------------------------------------------------------+  |
|  | (o) Draft - Not visible to staff                          |  |
|  | ( ) Published - Visible and searchable                    |  |
|  | ( ) Archived - Hidden from search                         |  |
|  +----------------------------------------------------------+  |
|                                                                |
|                     ( Cancel )  [ Save Draft ]  [ Publish ]    |
+================================================================+
```

### KB Search in Issue Creation

```
+================================================================+
| Create Issue                                              [X]  |
+================================================================+
|                                                                |
|  Customer: Brisbane Solar Cooration                                    |
|  Type: Question                                                |
|                                                                |
|  Subject *                                                     |
|  +----------------------------------------------------------+  |
|  | How do I install inverter hardware?                        |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +== SUGGESTED KB ARTICLES ====================================|
|  |                                                            |
|  |  We found articles that might help:                        |
|  |                                                            |
|  |  +------------------------------------------------------+  |
|  |  | [doc] How to Install Inverter Hardware                |  |
|  |  |       Step-by-step guide for installing handles...   |  |
|  |  |       Helpful: 89%  |  Views: 1,234                  |  |
|  |  |       [ Send to Customer ]  [ View ]                 |  |
|  |  +------------------------------------------------------+  |
|  |                                                            |
|  |  +------------------------------------------------------+  |
|  |  | [doc] Hinge Adjustment Guide                         |  |
|  |  |       How to adjust inverter door hinges...           |  |
|  |  |       Helpful: 92%  |  Views: 876                    |  |
|  |  +------------------------------------------------------+  |
|  |                                                            |
|  |  [ Search More Articles ]                                  |
|  |                                                            |
|  +============================================================|
|                                                                |
|  Description                                                   |
|  +----------------------------------------------------------+  |
|  |                                                           |  |
|  +----------------------------------------------------------+  |
|                                                                |
+================================================================+
```

### Article Helpfulness Widget

```
+-- Was This Article Helpful? ------------------------------------------+
|                                                                       |
|  +== HELPFULNESS FEEDBACK ==========================================+|
|  |                                                                   ||
|  |      Was this article helpful?                                    ||
|  |                                                                   ||
|  |      [ Yes, it helped! ]     [ No, I need more help ]             ||
|  |                                                                   ||
|  +===================================================================+|
|                                                                       |
+-----------------------------------------------------------------------+

+-- After Selection: Yes -----------------------------------------------+
|                                                                       |
|  +== THANK YOU =====================================================+|
|  |                                                                   ||
|  |      [checkmark] Thanks for your feedback!                        ||
|  |                                                                   ||
|  |      112 people found this article helpful.                       ||
|  |                                                                   ||
|  +===================================================================+|
|                                                                       |
+-----------------------------------------------------------------------+

+-- After Selection: No ------------------------------------------------+
|                                                                       |
|  +== FEEDBACK ======================================================+|
|  |                                                                   ||
|  |      What could we improve?                                       ||
|  |                                                                   ||
|  |      +--------------------------------------------------------+   ||
|  |      | ( ) Information was incomplete                         |   ||
|  |      | ( ) Steps didn't work for me                           |   ||
|  |      | ( ) Hard to understand                                 |   ||
|  |      | ( ) Other                                              |   ||
|  |      +--------------------------------------------------------+   ||
|  |                                                                   ||
|  |      Additional comments (optional):                              ||
|  |      +--------------------------------------------------------+   ||
|  |      |                                                        |   ||
|  |      +--------------------------------------------------------+   ||
|  |                                                                   ||
|  |      [ Submit Feedback ]                                          ||
|  |                                                                   ||
|  +===================================================================+|
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Tablet View (768px)

### KB List (Tablet)

```
+================================================================+
| Knowledge Base                                  [+ New Article] |
+================================================================+
|                                                                 |
| +-------------------------------------------------------------+ |
| | [search] Search articles...                                 | |
| +-------------------------------------------------------------+ |
|                                                                 |
| [Category v] [Status v] [Sort v]                                |
|                                                                 |
| CATEGORIES                                                      |
| +-------------------------------------------------------------+ |
| | [v] Product Information (45)                                | |
| |     > Installation Guides (18)                              | |
| |     > Care & Maintenance (15)                               | |
| | [>] Troubleshooting (38)                                    | |
| | [>] Order & Returns (28)                                    | |
| +-------------------------------------------------------------+ |
|                                                                 |
| ARTICLES                                                        |
| +-------------------------------------------------------------+ |
| | How to Install Inverter Hardware                             | |
| | Installation Guides  |  Views: 1,234  |  89% helpful        | |
| | [*] Published                            [Edit] [View]      | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | Countertop Installation Best Practices                      | |
| | Installation Guides  |  Views: 987  |  92% helpful          | |
| | [*] Published                            [Edit] [View]      | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | Granite Countertop Care Guide                               | |
| | Care & Maintenance  |  Views: 2,156  |  95% helpful         | |
| | [*] Published                            [Edit] [View]      | |
| +-------------------------------------------------------------+ |
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### KB List (Mobile)

```
+================================+
| Knowledge Base            [+]  |
+================================+
|                                |
| +----------------------------+ |
| | Search articles...         | |
| +----------------------------+ |
|                                |
| [Category v] [Filter v]        |
|                                |
| CATEGORIES                     |
| +----------------------------+ |
| | [>] Product Info (45)      | |
| | [>] Troubleshooting (38)   | |
| | [>] Order & Returns (28)   | |
| | [>] Policies (25)          | |
| +----------------------------+ |
|                                |
| RECENT / POPULAR               |
|                                |
| +----------------------------+ |
| | How to Install Inverter     | |
| | Hardware                   | |
| |                            | |
| | Installation Guides        | |
| | Views: 1,234 | 89% helpful | |
| | [*] Published              | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | Granite Countertop Care    | |
| | Guide                      | |
| |                            | |
| | Care & Maintenance         | |
| | Views: 2,156 | 95% helpful | |
| | [*] Published              | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | Return Policy Explained    | |
| |                            | |
| | Return Policy              | |
| | Views: 1,543 | 88% helpful | |
| | [*] Published              | |
| +----------------------------+ |
|                                |
+================================+
```

### Article View (Mobile)

```
+================================+
| < Back                         |
+================================+
|                                |
| How to Install Inverter         |
| Hardware                       |
|                                |
| Product Information >          |
| Installation Guides            |
|                                |
| Views: 1,234 | 89% helpful     |
| Updated: Jan 5, 2026           |
|                                |
| [Edit] [Share]                 |
|                                |
+================================+
|                                |
| ## Overview                    |
|                                |
| This guide covers the          |
| installation of inverter        |
| hardware including handles,    |
| knobs, and hinges...           |
|                                |
| ## Tools Required              |
|                                |
| - Drill with appropriate       |
|   bits                         |
| - Measuring tape               |
| - Level                        |
| - Screwdriver set              |
| - Pencil for marking           |
|                                |
| ## Step-by-Step Instructions   |
|                                |
| ### 1. Measure and Mark        |
|                                |
| Measure from the edge of       |
| the inverter door to            |
| determine handle placement...  |
|                                |
| [Image]                        |
|                                |
+================================+
|                                |
| Was this helpful?              |
|                                |
| [Yes] [No]                     |
|                                |
+================================+
|                                |
| TAGS                           |
| [inverter] [hardware]           |
| [installation]                 |
|                                |
| RELATED                        |
| - Hinge Adjustment Guide       |
| - Inverter Door Alignment       |
|                                |
+================================+
```

### Create Article (Mobile Bottom Sheet)

```
+================================+
| ============================== |
|                                |
| NEW ARTICLE               [X]  |
| =============================== |
|                                |
| Title *                        |
| +----------------------------+ |
| | Article title...           | |
| +----------------------------+ |
|                                |
| Category *                     |
| +----------------------------+ |
| | Select category...      v  | |
| +----------------------------+ |
|                                |
| Tags                           |
| +----------------------------+ |
| | [+ add tag]                | |
| +----------------------------+ |
|                                |
| Content *                      |
| +----------------------------+ |
| | [B] [I] [H1] [List] [Link] | |
| +----------------------------+ |
| |                            | |
| | Start writing your         | |
| | article content...         | |
| |                            | |
| |                            | |
| |                            | |
| +----------------------------+ |
|                                |
| Status                         |
| (o) Draft  ( ) Published       |
|                                |
| +----------------------------+ |
| |                            | |
| |    [ Save ]  [ Publish ]   | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

---

## Category Management (Settings)

```
+================================================================================+
| Settings > Knowledge Base > Categories                                          |
+================================================================================+
|                                                                                 |
| Manage Categories                                          [ + Add Category ]   |
|                                                                                 |
| +-----------------------------------------------------------------------------+ |
| |                                                                             | |
| |  +== Product Information (45 articles) ====================================+| |
| |  |                                                                         || |
| |  |  [drag] Product Information              [ Edit ]  [ Delete ]           || |
| |  |                                                                         || |
| |  |  +-- Subcategories --------------------------------------------------+  || |
| |  |  |                                                                   |  || |
| |  |  |  [drag] Installation Guides (18)          [ Edit ]  [ Delete ]   |  || |
| |  |  |  [drag] Care & Maintenance (15)           [ Edit ]  [ Delete ]   |  || |
| |  |  |  [drag] Warranty Info (12)                [ Edit ]  [ Delete ]   |  || |
| |  |  |                                                                   |  || |
| |  |  |  [ + Add Subcategory ]                                           |  || |
| |  |  |                                                                   |  || |
| |  |  +-------------------------------------------------------------------+  || |
| |  |                                                                         || |
| |  +=========================================================================+| |
| |                                                                             | |
| |  +== Troubleshooting (38 articles) ========================================+| |
| |  |                                                                         || |
| |  |  [drag] Troubleshooting                  [ Edit ]  [ Delete ]           || |
| |  |                                                                         || |
| |  |  +-- Subcategories --------------------------------------------------+  || |
| |  |  |                                                                   |  || |
| |  |  |  [drag] Common Issues (22)                [ Edit ]  [ Delete ]   |  || |
| |  |  |  [drag] Error Messages (10)               [ Edit ]  [ Delete ]   |  || |
| |  |  |  [drag] DIY Fixes (6)                     [ Edit ]  [ Delete ]   |  || |
| |  |  |                                                                   |  || |
| |  |  +-------------------------------------------------------------------+  || |
| |  |                                                                         || |
| |  +=========================================================================+| |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+=================================================================================+
```

---

## Loading States

### Article List Loading

```
+-- ARTICLES (Loading) -------------------------------------------------+
|                                                                       |
|  +-- [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~] ----------+|
|  | [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]                    ||
|  | [shimmer~~~~~~~~~~~]  |  [shimmer~~~~~~]  |  [shimmer~~~~]        ||
|  +-------------------------------------------------------------------+|
|                                                                       |
|  +-- [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~] ----------+|
|  | [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]                    ||
|  | [shimmer~~~~~~~~~~~]  |  [shimmer~~~~~~]  |  [shimmer~~~~]        ||
|  +-------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

### Search Results Loading

```
+-- SEARCH RESULTS (Loading) -------------------------------------------+
|                                                                       |
|  Searching for "inverter installation"...                              |
|                                                                       |
|  [spinner]  Finding relevant articles                                 |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Empty States

### No Articles

```
+===============================================================+
|                                                               |
| KNOWLEDGE BASE                           [ + New Article ]    |
|                                                               |
+===============================================================+
|                                                               |
|                    [illustration]                             |
|                                                               |
|           No articles yet                                     |
|                                                               |
|    Create articles to help your team resolve                  |
|    issues faster with documented solutions.                   |
|                                                               |
|    [ + Create First Article ]                                 |
|                                                               |
+===============================================================+
```

### No Search Results

```
+===============================================================+
|                                                               |
| Search: "quantum flux capacitor"                              |
|                                                               |
+===============================================================+
|                                                               |
|                    [search icon]                              |
|                                                               |
|           No articles found                                   |
|                                                               |
|    We couldn't find any articles matching your search.        |
|                                                               |
|    Suggestions:                                               |
|    - Check your spelling                                      |
|    - Try different keywords                                   |
|    - Browse categories instead                                |
|                                                               |
|    [ Clear Search ]                                           |
|                                                               |
+===============================================================+
```

### No Articles in Category

```
+-- CATEGORY: New Subcategory ------------------------------------------+
|                                                                       |
|                    [folder icon]                                      |
|                                                                       |
|           No articles in this category                                |
|                                                                       |
|    Be the first to add an article here.                               |
|                                                                       |
|    [ + Add Article ]                                                  |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Error States

### Failed to Load Articles

```
+===============================================================+
|                                                               |
| [!] Unable to load articles                                   |
|                                                               |
| There was a problem loading the knowledge base.               |
| Please try again.                                             |
|                                                               |
| [Retry]                                                       |
|                                                               |
+===============================================================+
```

### Article Save Failed

```
+================================================================+
| [!] Failed to Save Article                                      |
+================================================================+
|                                                                |
|  Could not save the article.                                   |
|                                                                |
|  Error: Title is required.                                     |
|                                                                |
|  [ Dismiss ]  [ Try Again ]                                    |
|                                                                |
+================================================================+
```

---

## Success States

### Article Published

```
+================================================================+
| [success] Article Published                                     |
|                                                                |
| "How to Install Inverter Hardware" is now live and searchable.  |
|                                                                |
| [ View Article ]  [ Dismiss ]                                  |
+================================================================+
```

### Helpfulness Feedback Submitted

```
+================================================================+
| [success] Thanks for your feedback!                             |
|                                                                |
| Your input helps us improve our articles.                      |
|                                                                |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// Knowledge Base Page
<main role="main" aria-label="Knowledge base">
  <h1>Knowledge Base</h1>

  // Search
  <form role="search" aria-label="Search articles">
    <input
      type="search"
      aria-label="Search articles"
      placeholder="Search articles..."
    />
  </form>

  // Category Navigation
  <nav role="navigation" aria-label="Article categories">
    <ul role="tree" aria-label="Categories">
      <li role="treeitem" aria-expanded="true">
        Product Information (45)
        <ul role="group">
          <li role="treeitem">Installation Guides (18)</li>
          <li role="treeitem">Care & Maintenance (15)</li>
        </ul>
      </li>
    </ul>
  </nav>

  // Article List
  <section role="region" aria-label="Articles">
    <article aria-label="How to Install Inverter Hardware">
      <h2>How to Install Inverter Hardware</h2>
      <p>Step-by-step guide...</p>
      <div aria-label="Article metrics">
        Views: 1,234. 89% found helpful.
      </div>
    </article>
  </section>
</main>

// Helpfulness Widget
<div role="group" aria-label="Article helpfulness feedback">
  <p id="helpfulness-label">Was this article helpful?</p>
  <button aria-describedby="helpfulness-label">
    Yes, it helped!
  </button>
  <button aria-describedby="helpfulness-label">
    No, I need more help
  </button>
</div>
```

### Keyboard Navigation

```
Knowledge Base List:
1. Tab to search field
2. Tab to category filters
3. Tab to category tree (Arrow keys to navigate, Enter to expand/select)
4. Tab to article cards
5. Enter on card opens article
6. Tab to pagination

Article View:
1. Tab to Edit/Share buttons
2. Tab through content (headings, links, images)
3. Tab to helpfulness buttons
4. Tab to tags (clickable)
5. Tab to related articles

Article Editor:
1. Tab to title field
2. Tab to category dropdown
3. Tab to tag input
4. Tab to rich text editor toolbar
5. Tab into editor content area
6. Tab to status radio buttons
7. Tab to Save/Publish buttons
```

### Screen Reader Announcements

```
On search:
  "3 articles found for 'inverter installation'."

On category expand:
  "Product Information expanded. 3 subcategories.
   Installation Guides, 18 articles."

On article open:
  "Article: How to Install Inverter Hardware.
   Published. 1,234 views. 89 percent found helpful."

On helpfulness selection:
  "Thank you for your feedback. 113 people found this article helpful."

On article save:
  "Article saved as draft."

On article publish:
  "Article published. Now visible and searchable."
```

---

## Animation Choreography

### Category Expand/Collapse

```
Expand Animation:

FRAME 1 (0ms):
  Chevron pointing right
  Subcategories height: 0

FRAME 2 (150ms):
  Chevron rotates 90deg
  Subcategories height grows

FRAME 3 (300ms):
  Full height revealed
  Subcategories fade in

Duration: 300ms
Easing: ease-out
```

### Search Results Appearance

```
Results Animation:

FRAME 1: Typing in search field
FRAME 2 (debounce 300ms): Search initiated
FRAME 3: Results fade in with stagger (50ms each)
FRAME 4: Match highlights pulse briefly

Duration: 400ms total
```

### Helpfulness Button Selection

```
Selection Animation:

FRAME 1: Button pressed (scale 0.95)
FRAME 2 (100ms): Icon transforms (thumbs up scales)
FRAME 3 (200ms): Button background changes to success color
FRAME 4 (300ms): Thank you message fades in

Duration: 300ms
```

---

## Component Props Interface

```typescript
// Knowledge Base Article
interface KBArticle {
  id: string;
  title: string;
  content: string; // Markdown
  categoryId: string;
  categoryPath: string; // "Product Information > Installation Guides"
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  organizationId: string;
}

// KB Category
interface KBCategory {
  id: string;
  name: string;
  parentId?: string;
  articleCount: number;
  children?: KBCategory[];
  organizationId: string;
}

// Article List
interface ArticleListProps {
  articles: KBArticle[];
  onArticleClick: (articleId: string) => void;
  onEdit: (articleId: string) => void;
  searchQuery?: string;
  selectedCategory?: string;
  statusFilter?: KBArticle['status'];
  sortBy?: 'views' | 'helpful' | 'updated' | 'title';
  isLoading?: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

// Category Tree
interface CategoryTreeProps {
  categories: KBCategory[];
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string | undefined) => void;
  onAddCategory: () => void;
  expandedCategories: string[];
  onToggleExpand: (categoryId: string) => void;
}

// Article Editor
interface ArticleEditorProps {
  article?: KBArticle; // Undefined for new
  categories: KBCategory[];
  onSave: (data: ArticleFormData, publish: boolean) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface ArticleFormData {
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
  status: KBArticle['status'];
}

// Article View
interface ArticleViewProps {
  article: KBArticle;
  relatedArticles: KBArticle[];
  onEdit: () => void;
  onHelpfulFeedback: (helpful: boolean, reason?: string) => Promise<void>;
  onShare: () => void;
  isLoading?: boolean;
}

// Helpfulness Widget
interface HelpfulnessWidgetProps {
  articleId: string;
  helpfulCount: number;
  notHelpfulCount: number;
  userFeedback?: boolean; // Has user already voted?
  onFeedback: (helpful: boolean, reason?: string) => Promise<void>;
}

// KB Search in Issue Form
interface KBSearchSuggestionProps {
  query: string;
  articles: KBArticle[];
  onArticleSelect: (article: KBArticle) => void;
  onSendToCustomer: (article: KBArticle) => void;
  onSearchMore: () => void;
  isLoading?: boolean;
}

// Category Manager (Settings)
interface CategoryManagerProps {
  categories: KBCategory[];
  onAddCategory: (parentId?: string) => void;
  onEditCategory: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onReorder: (categoryId: string, newParentId?: string, newIndex: number) => void;
  isLoading?: boolean;
}

// Article Metrics
interface ArticleMetricsProps {
  viewCount: number;
  helpfulPercentage: number;
  linkedIssues: number;
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Article list load | < 500ms | With categories |
| Search results | < 300ms | From keystroke to results |
| Article detail load | < 300ms | Including markdown render |
| Article save | < 1s | Draft or publish |
| Category tree expand | < 100ms | Animation complete |
| Helpfulness submit | < 500ms | Feedback recorded |

---

## Related Wireframes

- [Issue Creation](./support-issue-templates.wireframe.md) - KB search integration
- [Issue Detail](./support-issue-detail.wireframe.md) - KB article linking
- [Support Settings](./support-settings.wireframe.md) - Category management

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
