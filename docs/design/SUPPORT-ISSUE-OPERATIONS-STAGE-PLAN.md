# Support Issue Operations Stage Plan

**Purpose:** Preserve the Phase 4 support-issue plan as an implementation record now that the work is in the repo.

**Review lenses used when shaping the work:** `plan-ceo-review`, `plan-eng-review`

**Status:** Implemented

---

## Executive Summary

Phase 4 is now live in the repo.

The support product now has:
- service foundation landed in-repo
- explicit issue anchors
- serial-first, warranty-first, order-first, and customer-first issue intake
- anchor conflict validation
- anchor-first issue detail related context
- lineage-aware issue queue filters

That means the problem this plan set out to solve is no longer the next roadmap question. It is the current product baseline.

## What Landed

### Support entry
- `/support` is now workflow-shaped, with explicit issue intake paths and queue-entry actions.

### Issue intake
- `/support/issues/new` now supports:
  - serial
  - warranty
  - order
  - customer
- context is resolved before submit
- conflicting anchors are blocked instead of silently normalized

### Issue persistence
- issue anchors are stored structurally, not only in `metadata`
- issue reads prefer anchor columns first and metadata second for compatibility

### Issue detail
- issue detail is now the anchor-first triage workspace
- related context is prioritized in this order:
  1. same service system
  2. same serialized item
  3. linked warranty / order / shipment / RMAs
  4. customer-wide context

### Queue behavior
- issue list filters now support lineage states like present / missing
- rows show both linked context and missing lineage states

## Why This Plan Is Kept

This file remains useful because it explains the product intent behind the current implementation.

The next stage should not re-open Phase 4 scope. It should build on it.

## What Is Next

The next logical stage is documented in:

- [Support Issue + RMA Operations Next Stage](./SUPPORT-ISSUE-RMA-OPERATIONS-NEXT-STAGE.md)
