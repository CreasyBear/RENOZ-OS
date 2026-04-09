# Lesson Learned: Preview Detail View Regression

**Date:** 2026-04-09  
**Severity:** P0 in preview builds  
**Affected surfaces:** Order detail, customer detail, product detail, and likely other entity detail views  
**Reference preview URLs:**
- Broken previews:
  - `https://renoz-dicy5wufs-creasybears-projects.vercel.app`
  - `https://renoz-b3pmia573-creasybears-projects.vercel.app`
- Healthy control previews / deployments:
  - `https://renoz-p0bnulrs0-creasybears-projects.vercel.app`
  - `https://renoz-os.vercel.app`

## Summary

We saw a broad regression where many detail pages in preview started failing with generic "not found" states or route errors, while production and a clean control preview still worked for the same entity IDs.

The important lesson is that the shipped PDF/order work was **not** the root problem. The regression came from later local, uncommitted debugging changes on top of an otherwise healthy branch.

## What We Know

- The branch commit at `f259393` was healthy when deployed from a clean snapshot.
- The same order that failed in the broken previews loaded correctly in:
  - production
  - a clean control preview built from `HEAD`
- The broken previews came from a worktree that contained uncommitted local changes.
- The strongest suspect was the temporary `normalizeObjectInput` experiment in [`src/lib/schemas/_shared/patterns.ts`](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/schemas/_shared/patterns.ts), which attempted to coerce `URLSearchParams` / `FormData`-like values for GET validators.

## What We Do Not Know

We did **not** fully prove the exact low-level mechanism that broke preview detail views.

Most likely possibilities:
- the normalization experiment changed the shape of GET validator inputs in a way TanStack Start / Seroval did not tolerate
- the mixed local worktree introduced a serialization/deserialization edge case that only appeared in preview builds
- the user-facing "not found" fallbacks hid the real validation boundary, which made the issue look like missing data instead of malformed input

So the honest conclusion is:

> We isolated the regression to local post-commit experimentation, but we did not fully root-cause the exact runtime serialization failure.

## Evidence Trail

1. Production and an older healthy deployment loaded the same detail URLs correctly.
2. Two newer previews failed broadly across detail views.
3. Direct route files and route tree generation looked unchanged versus the known-good commit.
4. A clean preview built from `HEAD` without the extra local changes worked again.
5. That isolated the failure to local uncommitted changes rather than the committed branch.

## Why This Was Hard to Debug

- Order/customer detail containers collapsed many failures into generic "not found" UI.
- Product detail surfaced more raw validation output, but only in the browser console.
- Preview deploys were initially tested from a dirty worktree, which mixed real branch state with experimental fixes.
- We spent time reasoning from code when the faster truth source was a clean control deploy.

## Guardrails Going Forward

### 1. Always keep one clean control preview

Before debugging a broad preview regression, deploy a clean snapshot of `HEAD` with no local changes.

If the clean control works, stop blaming the branch and inspect the local worktree first.

### 2. Do not test preview regressions from a dirty worktree unless intentional

If a deploy includes local experimental changes:
- say so explicitly
- record which files are part of the experiment
- avoid treating that preview as representative of branch health

### 3. Do not hide validation failures behind "not found"

For detail views:
- validation/input errors should surface as validation/input errors
- true missing records should surface as not found

This distinction matters a lot for debugging.

### 4. Treat shared schema/input helpers as high-blast-radius

Changes under shared validator helpers like [`src/lib/schemas/_shared/patterns.ts`](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/schemas/_shared/patterns.ts) can affect many domains at once.

Any change there should require:
- focused unit coverage
- at least one clean preview validation
- spot checks on multiple detail pages, not just the target flow

### 5. When the failure is cross-app, test breadth first

If orders, customers, and products all fail similarly, assume:
- shared route/input/auth/runtime boundary
- not domain-specific business logic

Start with the highest-blast-radius files and a clean control deploy.

## Practical Debug Playbook

When this class of issue happens again:

1. Check `git status`.
2. Record whether the preview came from clean `HEAD` or a dirty worktree.
3. Deploy a clean control preview from `HEAD`.
4. Test one entity URL across:
   - production
   - broken preview
   - clean control preview
5. If only the dirty preview fails, diff the local worktree before touching committed code.
6. If the clean control also fails, then continue root-cause analysis in shared runtime/schema/auth layers.

## Action Items

- Improve detail containers so validation failures are not mislabeled as missing records.
- Be explicit in future deploy notes about whether a preview was built from clean `HEAD` or a dirty worktree.
- Treat shared input-normalization helpers as a special-risk change category.

## Bottom Line

The branch was healthier than it looked.

The regression was introduced during local experimentation on top of the branch, and the biggest process failure was not the bad change itself. It was that the dirty preview briefly became our source of truth.
