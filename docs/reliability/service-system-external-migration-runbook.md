# Service-System External Migration Runbook

## Purpose
This runbook explains how to execute the **external** legacy migration that links already-activated warranties into the `service` domain.

Use this together with:
- [Service-System External Migration Contract](./service-system-external-migration-contract.md)
- [Warranty Entitlements Rollout](./warranty-entitlements-rollout.md)

This document is intentionally operational.
It is written so an engineer or ops owner can run the migration safely without inventing rules during execution.

## Target Outcome
After the migration:
- legacy activated warranties are either linked to a canonical `service_system`
- or blocked by a visible `service_linkage_review`
- but never silently guessed into the wrong owner/system relationship

The CRM should end up in one of these clean states per warranty:
1. `linked`
2. `owner_missing`
3. `pending_review`
4. `unlinked` by explicit migration choice

## Recommended Tool Shape
Build the migration as an **external batch tool** with these stages:

1. candidate load
2. dry-run classification
3. human review of dry-run results
4. live apply in bounded batches
5. post-run verification in the CRM

Recommended runtime capabilities:
- `--org-id <uuid>` or equivalent org scoping
- `--after-warranty-id <uuid>` checkpointing
- `--limit <n>` bounded batches
- `--dry-run`
- `--live`
- structured JSON output
- resumable execution

Do not build it as:
- a one-shot SQL script with guessed matching
- a CRM-triggered admin mutation
- an app-owned queue runner inside this repository

## Execution Model
### Batch unit
Use `warranty.id` as the unit of work.

Each candidate warranty should produce exactly one outcome:
- `link_existing`
- `create_new`
- `review_created`
- `skipped`
- `failed`

### Checkpointing
Checkpoint by:
- `organizationId`
- last processed `warranty.id`
- run mode (`dry_run` vs `live`)
- generated timestamp

The migration must be safe to rerun.

## Pre-Run Checklist
Before any dry-run:
- confirm migrations through `0033_service_owner_system_foundation.sql` are applied
- confirm the app version with service linkage reviews and service system detail is deployed
- confirm operators know where to work unresolved cases:
  - `/support/warranties`
  - `/support/service-linkage-reviews`
  - `/support/service-systems/$serviceSystemId`
- confirm the migration has a clearly scoped organization or warranty range
- confirm a rollback posture for bad batches:
  - stop further execution
  - identify affected warranties
  - correct rows manually or via repair script

## Candidate Selection
The migration should start from warranties that are:
- activated
- not voided
- not already cleanly linked to `serviceSystemId`
- relevant to the service model

Use the SQL companion for example selection queries:
- [service-system-external-migration-candidates.sql](./sql/service-system-external-migration-candidates.sql)

## Dry-Run Specification
### What dry-run must do
Dry-run must:
- load each candidate
- apply the exact same decision logic planned for live mode
- produce a deterministic outcome per warranty
- produce **no writes**

### Required dry-run output fields
At minimum, emit per-warranty output like:

```json
{
  "organizationId": "org-uuid",
  "warrantyId": "warranty-uuid",
  "warrantyNumber": "WAR-000123",
  "outcome": "review_created",
  "reasonCode": "multiple_system_matches",
  "commercialCustomerId": "customer-uuid",
  "sourceOrderId": "order-uuid",
  "matchedServiceSystemId": null,
  "candidateSystemIds": ["system-a", "system-b"],
  "ownerFingerprint": {
    "normalizedFullName": "jane citizen",
    "normalizedEmail": "jane@example.com",
    "normalizedPhone": "61400000000",
    "normalizedSiteAddressKey": "12-example-street-subiaco-wa-6008-au"
  },
  "createdOwner": false,
  "createdSystem": false,
  "notes": "Multiple exact system candidates found"
}
```

### Required dry-run summary
Each run should also emit summary totals:
- scanned
- `link_existing`
- `create_new`
- `review_created`
- `skipped`
- `failed`

### Dry-run acceptance gate
Do not move to live mode until:
- spot checks confirm exact links are truly exact
- `create_new` cases look plausible
- review-created cases feel appropriately conservative
- there are no obvious false merges

## Decision Flow
For each warranty:

1. If `warranties.serviceSystemId` is already set:
   - outcome = `skipped`

2. Load owner snapshot and source context:
   - owner record
   - commercial customer
   - source order
   - project
   - source entitlement when present

3. Normalize owner and address evidence:
   - normalized full name
   - normalized email
   - normalized phone
   - normalized site-address key

4. Try exact owner resolution:
   - exact email
   - else exact phone + full name
   - else new owner candidate

5. Try exact system matching:
   - same organization
   - exact site address when present
   - exact order/project alignment when present
   - no conflicting current owner evidence

6. Resolve outcome:
   - one safe exact system => `link_existing`
   - zero safe systems with enough source truth => `create_new`
   - many safe exact systems => `review_created`
   - owner/system conflict => `review_created`

7. Never fuzzy-link.

## Live Mode Specification
### Transaction boundary
Each warranty should be processed in its own transaction.

That transaction should perform exactly the writes required for its outcome.

### Live outcome: `link_existing`
Write:
- update `warranties.serviceSystemId`

Recommended:
- sync `warranty_owner_records` only if the owner mirror is intentionally being corrected

### Live outcome: `create_new`
Write in one transaction:
1. create or reuse `service_owners`
2. create `service_systems`
3. create one current `service_system_ownerships`
4. update `warranties.serviceSystemId`
5. sync `warranty_owner_records` compatibility mirror

### Live outcome: `review_created`
Write:
- insert `service_linkage_reviews`

Do not:
- set `warranties.serviceSystemId`
- mutate ownership rows

### Live outcome: `skipped`
Write nothing.

### Live outcome: `failed`
Write nothing partial if the transaction fails.
Log externally with enough context to retry safely.

## Recommended Run Sequence
### Step 1: small dry-run
Run a small sample:
- one org
- 20 to 50 warranties

Review:
- outcome distribution
- exact links
- create-new decisions
- review reasons

### Step 2: medium dry-run
Run a larger but still bounded sample:
- one org
- 200 to 500 warranties

Review:
- does review volume feel manageable
- are there repeated false positives in matching logic
- are there org-specific quirks in site addresses or owner data

### Step 3: first live batch
Run a small live batch:
- one org
- 20 to 50 warranties

Immediately verify in the CRM:
- linked warranty detail
- linked service system detail
- pending review rows

### Step 4: controlled rollout
Increase batch size only after:
- operators confirm linked rows look correct
- review queue remains manageable
- no duplicate current ownership rows appear

## Post-Run CRM Checks
For each live batch, spot check:

### Exact-linked warranty
- open warranty detail
- confirm `Service System` is populated
- confirm `Current Owner` is correct
- confirm `System History` loads
- confirm service system detail opens and lists the warranty

### Created-system warranty
- confirm a new service system exists
- confirm one current ownership row exists
- confirm owner mirror on the warranty is aligned

### Review-created warranty
- confirm warranty detail shows `Pending Review`
- confirm review opens in `/support/service-linkage-reviews`
- confirm snapshot and candidate systems look useful for an operator

## Failure Handling
### If a batch shows false merges
1. stop further live runs
2. identify affected warranties and service systems
3. correct the mistaken `warranties.serviceSystemId`
4. repair ownership rows if needed
5. reopen or create `service_linkage_reviews` where the tool over-linked
6. fix matching logic before resuming

### If the review queue explodes
That usually means one of:
- matching rules are too strict
- source data is too incomplete
- a specific org has poor legacy owner/address hygiene

Do not loosen matching blindly.
Instead:
- classify which review reason dominates
- decide whether more exact source fields can be added
- keep conservative behavior until that is understood

### If duplicates appear
Investigate:
- idempotency guards
- existing clean links not being skipped
- owner lookup returning inconsistent results
- current ownership uniqueness assumptions

## Operator Handoff
Once a batch is complete, ops should receive:
- organization or warranty range processed
- timestamp
- counts by outcome
- list of failed warranties
- list of review-created warranties

Recommended operator handoff format:

```text
Org: <org-id>
Mode: live
Processed: 250
Linked existing: 138
Created system: 71
Review created: 34
Skipped: 5
Failed: 2

Action required:
- Review 34 linkage decisions in /support/service-linkage-reviews
- Inspect 2 failed warranty IDs in external run logs
```

## Suggested External Artifacts
The external tool should persist these artifacts outside the repo:
- run manifest JSON
- per-warranty outcome log
- checkpoint file
- failure log
- optional reconciliation report

Suggested filenames:
- `service-migration-run-<timestamp>.json`
- `service-migration-items-<timestamp>.ndjson`
- `service-migration-failures-<timestamp>.json`
- `service-migration-checkpoint-<org>.json`

## Minimal Spec For The Tooling Owner
The external tool should implement these functions or equivalents:
- `loadCandidates(orgId, afterWarrantyId, limit)`
- `classifyCandidate(candidate)`
- `applyLinkExisting(candidate, serviceSystemId)`
- `applyCreateNew(candidate, normalizedOwner, sourceContext)`
- `applyCreateReview(candidate, reasonCode, candidateSystemIds, snapshot)`
- `runDryBatch(orgId, afterWarrantyId, limit)`
- `runLiveBatch(orgId, afterWarrantyId, limit)`
- `verifyBatch(orgId, affectedWarrantyIds)`

## Definition Of Done
The migration capability is ready when:
- dry-run and live mode use the same decision logic
- reruns are idempotent
- exact links stay exact
- ambiguous cases become reviews instead of guesses
- operators can resolve remaining ambiguity entirely through the CRM
