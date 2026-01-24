# Domain: Communications — Cleanup & Refinement

## Findings
- Email history now has campaign/template FKs; verify UUID type migration.
- Campaign recipients should be unique per campaign+email.
- PRD calls for org+createdAt DESC indexes on email history/scheduled emails.

## Required Fixes (Atomic)
- [x] Add or verify `campaignId`/`templateId` FK constraints and UUID types.
- [x] Ensure unique constraint on `campaign_recipients (campaignId, email)`.
- [x] Add org+createdAt DESC indexes where PRD requires.

## Validation
- [x] RLS/org scoping verified
- [x] Index ordering matches PRD
- [x] FK integrity for campaigns/templates

