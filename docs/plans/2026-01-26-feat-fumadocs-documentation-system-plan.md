---
title: Fumadocs Documentation System Integration
type: feat
date: 2026-01-26
---

# Fumadocs Documentation System Integration

## Overview

Add comprehensive in-app documentation to Renoz v3 using Fumadocs, a documentation framework with native TanStack Start support. The documentation will capture architecture, domain catalog, business workflows, and integration patterns for developer onboarding and institutional knowledge.

## Problem Statement / Motivation

Currently, Renoz v3 has scattered documentation across:
- `CLAUDE.md` - AI assistant guidance
- `STANDARDS.md` - Code conventions
- `docs/ui-patterns.md` - UI guidelines
- Various planning docs

There is no unified, browsable documentation that:
- Explains the system architecture holistically
- Documents all 27 domains and their relationships
- Describes end-to-end business workflows
- Maps external integrations

New developers lack a single source of truth for understanding the system.

## Proposed Solution

Integrate Fumadocs directly into the TanStack Start app with:
- Public `/docs` routes (no authentication required)
- MDX content in `content/docs/` directory
- Fumadocs UI components (sidebar, TOC, search)
- Orama-powered client-side search

### Why Fumadocs?

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Fumadocs** | Native TanStack Start support, MDX, built-in search | Newer framework | **Selected** |
| Mintlify | Beautiful UI, hosted | External dependency, cost | Rejected |
| Nextra | Mature, Next.js | Requires separate Next.js app | Rejected |
| Plain Markdown | Simple | No navigation, search, styling | Rejected |

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Renoz v3 Application                    │
├─────────────────────────────────────────────────────────────┤
│  src/routes/                                                │
│  ├── _authenticated/    (existing CRM routes)               │
│  └── docs/              (NEW - public docs routes)          │
│      └── $.tsx          (catch-all for /docs/[[...slug]])   │
├─────────────────────────────────────────────────────────────┤
│  content/docs/          (NEW - MDX content)                 │
│  ├── index.mdx          (docs homepage)                     │
│  ├── meta.json          (navigation config)                 │
│  ├── architecture/                                          │
│  ├── domains/                                               │
│  ├── workflows/                                             │
│  └── integrations/                                          │
├─────────────────────────────────────────────────────────────┤
│  src/lib/docs/source.ts (Fumadocs source loader)            │
│  source.config.ts       (MDX configuration)                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
MDX Files (content/docs/)
    │
    ▼
fumadocs-mdx/vite plugin (compiles at build time)
    │
    ▼
source.config.ts (defines collections)
    │
    ▼
src/lib/docs/source.ts (loader with page tree)
    │
    ▼
DocsLayout (sidebar from page tree)
    │
    ▼
DocsPage (renders MDX content + TOC)
```

### Implementation Phases

#### Phase 1: Infrastructure Setup

**Objective:** Install packages, configure Vite, create source adapter

**Tasks:**

- [ ] Install Fumadocs packages
  ```bash
  npm install fumadocs-core fumadocs-ui fumadocs-mdx
  ```

- [ ] Create `source.config.ts` at project root
  ```typescript
  // source.config.ts
  import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

  export const docs = defineDocs({
    dir: 'content/docs',
  });

  export default defineConfig();
  ```

- [ ] Update `vite.config.ts` - add MDX plugin BEFORE tanstackStart
  ```typescript
  // vite.config.ts
  import mdx from 'fumadocs-mdx/vite';

  export default defineConfig({
    plugins: [
      virtualTanstackHeadScripts(),
      mdx(await import('./source.config')),  // ADD - before tanstackStart
      tanstackStart(),
      react(),
      tailwindcss(),
      devtools(),
    ],
  });
  ```

- [ ] Create source loader at `src/lib/docs/source.ts`
  ```typescript
  // src/lib/docs/source.ts
  import { docs } from 'fumadocs-mdx:collections/server';
  import { loader } from 'fumadocs-core/source';

  export const source = loader({
    baseUrl: '/docs',
    source: docs.toFumadocsSource(),
  });
  ```

- [ ] Update `src/styles.css` - add Fumadocs CSS
  ```css
  @import 'tailwindcss';
  @import 'tw-animate-css';
  @import 'fumadocs-ui/css/neutral.css';
  @import 'fumadocs-ui/css/preset.css';

  @source '../node_modules/fumadocs-ui/dist/**/*.js';
  ```

- [ ] Add TanstackProvider to `src/routes/__root.tsx`
  ```typescript
  import { TanstackProvider } from 'fumadocs-core/framework/tanstack';

  // Wrap inside QueryClientProvider
  <TanstackProvider>
    <Outlet />
  </TanstackProvider>
  ```

**Files Changed:**
| File | Action |
|------|--------|
| `package.json` | Add dependencies |
| `source.config.ts` | Create |
| `vite.config.ts` | Add mdx plugin |
| `src/lib/docs/source.ts` | Create |
| `src/lib/docs/index.ts` | Create (barrel) |
| `src/styles.css` | Add imports |
| `src/routes/__root.tsx` | Add TanstackProvider |

---

#### Phase 2: Route & Layout Setup

**Objective:** Create docs routes with Fumadocs layout components

**Tasks:**

- [ ] Create docs layout at `src/routes/docs.tsx`
  ```typescript
  // src/routes/docs.tsx
  import { createFileRoute, Outlet } from '@tanstack/react-router';
  import { DocsLayout } from 'fumadocs-ui/layouts/docs';
  import { source } from '@/lib/docs/source';

  export const Route = createFileRoute('/docs')({
    component: DocsLayoutWrapper,
  });

  function DocsLayoutWrapper() {
    return (
      <DocsLayout
        tree={source.getPageTree()}
        nav={{
          title: 'Renoz Docs',
          url: '/docs',
        }}
        sidebar={{
          enabled: true,
          prefetch: true,
        }}
      >
        <Outlet />
      </DocsLayout>
    );
  }
  ```

- [ ] Create docs index route at `src/routes/docs/index.tsx`
  ```typescript
  // src/routes/docs/index.tsx
  import { createFileRoute } from '@tanstack/react-router';
  import { source } from '@/lib/docs/source';
  import { DocsPage } from 'fumadocs-ui/page';

  export const Route = createFileRoute('/docs/')({
    component: DocsIndexPage,
  });

  function DocsIndexPage() {
    const page = source.getPage([]);
    if (!page) return <div>Documentation home not found</div>;

    const MDX = page.data.body;

    return (
      <DocsPage toc={page.data.toc}>
        <MDX />
      </DocsPage>
    );
  }
  ```

- [ ] Create catch-all docs route at `src/routes/docs/$.tsx`
  ```typescript
  // src/routes/docs/$.tsx
  import { createFileRoute, notFound } from '@tanstack/react-router';
  import { source } from '@/lib/docs/source';
  import { DocsPage, DocsBody } from 'fumadocs-ui/page';

  export const Route = createFileRoute('/docs/$')({
    component: DocsSlugPage,
  });

  function DocsSlugPage() {
    const { _splat: slug } = Route.useParams();
    const slugArray = slug ? slug.split('/') : [];

    const page = source.getPage(slugArray);
    if (!page) throw notFound();

    const MDX = page.data.body;

    return (
      <DocsPage
        toc={page.data.toc}
        tableOfContent={{
          style: 'clerk',
        }}
      >
        <DocsBody>
          <h1>{page.data.title}</h1>
          {page.data.description && (
            <p className="text-muted-foreground">{page.data.description}</p>
          )}
          <MDX />
        </DocsBody>
      </DocsPage>
    );
  }
  ```

- [ ] Create docs 404 component at `src/routes/docs/$.tsx` (error handling)
  ```typescript
  // Add to the route configuration
  export const Route = createFileRoute('/docs/$')({
    component: DocsSlugPage,
    notFoundComponent: () => (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The documentation page you're looking for doesn't exist.
        </p>
        <a href="/docs" className="mt-4 text-primary hover:underline">
          Return to documentation home
        </a>
      </div>
    ),
  });
  ```

**Files Changed:**
| File | Action |
|------|--------|
| `src/routes/docs.tsx` | Create (layout) |
| `src/routes/docs/index.tsx` | Create |
| `src/routes/docs/$.tsx` | Create (catch-all) |

---

#### Phase 3: Search Integration

**Objective:** Add Orama-powered search functionality

**Tasks:**

- [ ] Create search API route at `src/routes/api/docs-search.ts`
  ```typescript
  // src/routes/api/docs-search.ts
  import { createAPIFileRoute } from '@tanstack/react-start';
  import { source } from '@/lib/docs/source';
  import { createSearchAPI } from 'fumadocs-core/search/server';

  const searchAPI = createSearchAPI('advanced', {
    language: 'english',
    indexes: source.getPages().map((page) => ({
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      id: page.url,
      structuredData: page.data.structuredData,
    })),
  });

  export const APIRoute = createAPIFileRoute('/api/docs-search')({
    GET: async ({ request }) => searchAPI.GET(request),
  });
  ```

- [ ] Add search dialog to docs layout
  ```typescript
  // Update src/routes/docs.tsx
  import { SearchDialog } from 'fumadocs-ui/components/dialog/search';

  // Add to DocsLayout props or as child component
  <SearchDialog
    api="/api/docs-search"
    placeholder="Search documentation..."
  />
  ```

**Files Changed:**
| File | Action |
|------|--------|
| `src/routes/api/docs-search.ts` | Create |
| `src/routes/docs.tsx` | Add search dialog |

---

#### Phase 4: Content Structure

**Objective:** Create content directory and initial documentation scaffolding

**Tasks:**

- [ ] Create content directory structure
  ```
  content/docs/
  ├── index.mdx
  ├── meta.json
  ├── architecture/
  │   ├── meta.json
  │   ├── index.mdx
  │   ├── tech-stack.mdx
  │   ├── data-flow.mdx
  │   ├── multi-tenancy.mdx
  │   └── authentication.mdx
  ├── domains/
  │   ├── meta.json
  │   ├── index.mdx
  │   └── [one file per domain - 27 total]
  ├── workflows/
  │   ├── meta.json
  │   ├── index.mdx
  │   ├── quote-to-cash.mdx
  │   ├── job-lifecycle.mdx
  │   ├── procurement.mdx
  │   └── support-escalation.mdx
  └── integrations/
      ├── meta.json
      ├── index.mdx
      ├── supabase.mdx
      ├── trigger-dev.mdx
      ├── xero.mdx
      └── email.mdx
  ```

- [ ] Create root `content/docs/meta.json`
  ```json
  {
    "title": "Renoz Documentation",
    "root": true,
    "pages": [
      "index",
      "---Getting Started---",
      "...architecture",
      "---Reference---",
      "...domains",
      "---Guides---",
      "...workflows",
      "---Integrations---",
      "...integrations"
    ]
  }
  ```

- [ ] Create `content/docs/index.mdx` (homepage)
  ```mdx
  ---
  title: Renoz Documentation
  description: Comprehensive documentation for the Renoz CRM platform
  ---

  # Welcome to Renoz Documentation

  Renoz v3 is a multi-tenant CRM application for renovation/construction businesses.

  ## Quick Links

  - [Architecture Overview](/docs/architecture) - Understand how the system works
  - [Domain Catalog](/docs/domains) - Explore all 27 business domains
  - [Workflows](/docs/workflows) - Learn end-to-end business processes
  - [Integrations](/docs/integrations) - External system connections
  ```

- [ ] Create `content/docs/architecture/meta.json`
  ```json
  {
    "title": "Architecture",
    "icon": "Layers",
    "defaultOpen": true,
    "pages": ["index", "tech-stack", "data-flow", "multi-tenancy", "authentication"]
  }
  ```

- [ ] Create `content/docs/domains/meta.json`
  ```json
  {
    "title": "Domains",
    "icon": "Grid3x3",
    "pages": [
      "index",
      "---Core---",
      "customers",
      "orders",
      "jobs",
      "products",
      "inventory",
      "---Sales---",
      "pipeline",
      "suppliers",
      "---Operations---",
      "support",
      "communications",
      "dashboard",
      "financial",
      "---Other---",
      "activities",
      "warranty",
      "settings",
      "users"
    ]
  }
  ```

- [ ] Create `content/docs/workflows/meta.json`
  ```json
  {
    "title": "Workflows",
    "icon": "Workflow",
    "pages": ["index", "quote-to-cash", "job-lifecycle", "procurement", "support-escalation"]
  }
  ```

- [ ] Create `content/docs/integrations/meta.json`
  ```json
  {
    "title": "Integrations",
    "icon": "Plug",
    "pages": ["index", "supabase", "trigger-dev", "xero", "email"]
  }
  ```

**Files Created:**
| Directory | Files |
|-----------|-------|
| `content/docs/` | index.mdx, meta.json |
| `content/docs/architecture/` | meta.json, index.mdx, tech-stack.mdx, data-flow.mdx, multi-tenancy.mdx, authentication.mdx |
| `content/docs/domains/` | meta.json, index.mdx, + 17 domain files |
| `content/docs/workflows/` | meta.json, index.mdx, + 4 workflow files |
| `content/docs/integrations/` | meta.json, index.mdx, + 4 integration files |

---

#### Phase 5: Content Writing

**Objective:** Write substantive documentation content

**Priority 1 - Architecture (write first):**
- [ ] `architecture/index.mdx` - System overview with diagrams
- [ ] `architecture/tech-stack.mdx` - Framework choices and rationale
- [ ] `architecture/data-flow.mdx` - Routes → Hooks → Functions → DB pattern
- [ ] `architecture/multi-tenancy.mdx` - Organization isolation model
- [ ] `architecture/authentication.mdx` - Supabase Auth flow

**Priority 2 - Domain Catalog:**
- [ ] `domains/index.mdx` - Domain map with relationships
- [ ] Generate stub for each domain with:
  - Overview / purpose
  - Database schema reference
  - Key hooks and their usage
  - Server functions
  - Routes
  - Related domains

**Priority 3 - Workflows:**
- [ ] `workflows/quote-to-cash.mdx` - Sales pipeline → order → fulfillment → invoice
- [ ] `workflows/job-lifecycle.mdx` - Job creation → scheduling → execution → completion
- [ ] `workflows/procurement.mdx` - PO → receiving → payment
- [ ] `workflows/support-escalation.mdx` - Ticket → triage → resolution

**Priority 4 - Integrations:**
- [ ] `integrations/supabase.mdx` - Auth, DB, Realtime, Storage
- [ ] `integrations/trigger-dev.mdx` - Background jobs
- [ ] `integrations/xero.mdx` - Accounting sync
- [ ] `integrations/email.mdx` - Resend integration

---

## Acceptance Criteria

### Functional Requirements

- [ ] `/docs` route is publicly accessible (no auth required)
- [ ] Sidebar navigation shows all content categories
- [ ] Search (Cmd+K) returns relevant results
- [ ] All internal links work correctly
- [ ] 404 handling for invalid docs slugs
- [ ] Mobile responsive layout

### Non-Functional Requirements

- [ ] Page load < 500ms (SSR)
- [ ] Search results < 100ms
- [ ] Works offline after initial load (PWA-ready)
- [ ] Accessible (WCAG 2.1 AA compliant)

### Quality Gates

- [ ] All MDX files have valid frontmatter
- [ ] No broken internal links
- [ ] TypeScript types pass
- [ ] Build succeeds without warnings

## Dependencies & Prerequisites

| Dependency | Status | Notes |
|------------|--------|-------|
| TanStack Start | ✅ Exists | v1.150.0 |
| Tailwind CSS v4 | ✅ Exists | CSS-first config |
| Vite | ✅ Exists | v7.1.7 |
| fumadocs-core | ❌ Install | Core utilities |
| fumadocs-ui | ❌ Install | UI components |
| fumadocs-mdx | ❌ Install | MDX processing |

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fumadocs/TanStack Start incompatibility | High | Low | Use official TanStack Start docs, test early |
| Tailwind v4 CSS conflicts | Medium | Medium | Test preset compatibility, custom overrides |
| Plugin order issues | Medium | Medium | Follow documented order: mdx → tanstackStart → react |
| Large content bundle | Low | Low | MDX code splits by default |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Developer onboarding time | -50% | Survey new team members |
| Documentation coverage | 100% of domains | Content audit |
| Search success rate | >80% | Analytics (if added) |
| Page load time | <500ms | Lighthouse |

## Future Considerations

- **Versioning**: Add version selector for major releases
- **API Reference**: Auto-generate from TypeScript types
- **Edit on GitHub**: Add edit links when repo is public
- **Analytics**: Track most-viewed pages
- **Internationalization**: Multi-language support

## References & Research

### Internal References

- Vite config: `vite.config.ts`
- Root route: `src/routes/__root.tsx`
- Styling: `src/styles.css`
- Standards: `STANDARDS.md`
- Hook patterns: `.claude/rules/hook-architecture.md`

### External References

- [Fumadocs Documentation](https://fumadocs.dev)
- [Fumadocs TanStack Start Guide](https://fumadocs.dev/docs/framework/tanstack-start)
- [TanStack Router File-based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)

### Related Codebase Patterns

- Document generation: `docs/solutions/DOCUMENT_GENERATION_RESEARCH.md`
- Container/presenter: `docs/solutions/architecture/container-presenter-standardization.md`
- Schema organization: `docs/solutions/codebase-organization/consolidate-duplicate-zod-schemas.md`
