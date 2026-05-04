# Documentation Guide

This directory is intentionally curated for stable repo knowledge.

If a doc does not help explain current operational behavior, evergreen engineering rules, or long-lived architecture, it should probably not live here.

## Start Here

### Product and workflow understanding

- [workflows/warranty-support-phase2-workflows.md](./workflows/warranty-support-phase2-workflows.md)
  Current operator-facing workflow companion for warranty, support, issue, and RMA paths.
- [architecture/support-issue-rma-b2b2c.md](./architecture/support-issue-rma-b2b2c.md)
  Long-lived architecture and product-model reference for warranty, support, service, issue, and RMA flows.
- [inventory/README.md](./inventory/README.md)
  Canonical inventory, serialization, valuation, and operator-stock workflow guide.

### Engineering reference

- [reference/repo-standards.md](./reference/repo-standards.md)
  Codebase conventions and architectural standards.
- [reference/schema-trace.md](./reference/schema-trace.md)
  Data-flow and schema trace-through methodology.
- [reference/workflow-audit-remediation-process.md](./reference/workflow-audit-remediation-process.md)
  Workflow audit/remediation process used for hardening work.
- [reference/form-standards.md](./reference/form-standards.md)
  Form architecture and implementation guidance.

### Operations and integration

- [operations/deployment.md](./operations/deployment.md)
  Canonical deployment, migrations, rollback, and Vercel guidance.
- [operations/pre-deployment-checklist.md](./operations/pre-deployment-checklist.md)
  Production-readiness checklist for the `main` release path.
- [operations/auth-lifecycle.md](./operations/auth-lifecycle.md)
  Auth lifecycle notes and SSR/auth implementation constraints.
- [operations/xero-integration.md](./operations/xero-integration.md)
  Xero integration setup and operational notes.

### Reliability and traces

- [reliability/RELIABILITY-STANDARDS.md](./reliability/RELIABILITY-STANDARDS.md)
  Repo reliability rules and anti-pattern prevention.
- [reliability/MUTATION-CONTRACT-STANDARD.md](./reliability/MUTATION-CONTRACT-STANDARD.md)
  Shared mutation contract guidance for workflow-heavy server changes.
- [code-traces/README.md](./code-traces/README.md)
  Ordered index of deep workflow traces.

## Folder Guide

### `architecture/`

Long-lived domain-model and product-architecture references.

### `operations/`

Deployment, auth, integration, and pre-deploy runbooks.

### `reference/`

Evergreen engineering standards, methodology, and implementation references.

### `workflows/`

Current operator-oriented workflow companions.

### `inventory/`

Inventory, serialized lineage, valuation, and operator stock workflow documentation.

### `reliability/`

Release hardening, mutation-contract, rollout, and operational safety documentation.

### `code-traces/`

Specification-grade traces of critical workflows. These are useful for debugging, audits, and onboarding engineers into an end-to-end path.

## Recommended Reading Paths

### For a new engineer

1. [../README.md](../README.md)
2. [../ARCHITECTURE.md](../ARCHITECTURE.md)
3. [reference/repo-standards.md](./reference/repo-standards.md)
4. [workflows/warranty-support-phase2-workflows.md](./workflows/warranty-support-phase2-workflows.md)
5. [architecture/support-issue-rma-b2b2c.md](./architecture/support-issue-rma-b2b2c.md)

### For support / RMA work

1. [workflows/warranty-support-phase2-workflows.md](./workflows/warranty-support-phase2-workflows.md)
2. [architecture/support-issue-rma-b2b2c.md](./architecture/support-issue-rma-b2b2c.md)
3. [code-traces/13-rma-receive-inventory.md](./code-traces/13-rma-receive-inventory.md)
4. [code-traces/14-rma-create.md](./code-traces/14-rma-create.md)
5. [code-traces/15-rma-process-resolution.md](./code-traces/15-rma-process-resolution.md)

### For deploy / rollout work

1. [operations/deployment.md](./operations/deployment.md)
2. [operations/pre-deployment-checklist.md](./operations/pre-deployment-checklist.md)
3. [reliability/RELIABILITY-STANDARDS.md](./reliability/RELIABILITY-STANDARDS.md)

If you add a new high-signal doc that future contributors should find quickly, add it here.
