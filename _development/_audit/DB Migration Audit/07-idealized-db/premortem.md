premortem:
  mode: deep
  context: "Idealized DB design (07-idealized-db)"

  potential_risks:
    - "ownership decisions not finalized lead to duplicate tables"
    - "RLS policies incomplete for join-only and polymorphic tables"
    - "invoice vs order ambiguity breaks financial reporting"
    - "missing scheduled reports/materialized views cause slow dashboards"
    - "role-driven schema changes delayed, creating UI workarounds"

  tigers:
    - risk: "RLS gaps on join-only and polymorphic tables cause data leaks"
      location: "07-idealized-db/rls-and-security.md"
      severity: high
      category: security
      mitigation_checked: "Join-policy checklist and allowlists now documented; implementation still required"
      suggested_fix: "Implement join-based policies and enforce allowlists at DB + app layers"
    - risk: "Unresolved invoice vs order model will derail finance reports and Xero sync"
      location: "06-rationalization/decisions.md"
      severity: high
      category: data
      mitigation_checked: "Orders-as-invoice decision documented in idealized schema"
      suggested_fix: "Update financial tables and docs to reference `orderId` consistently"

  elephants:
    - risk: "Shared ownership (SLA, scheduled reports) not resolved"
      severity: medium
      suggested_fix: "Confirm SLA as shared infra and reports ownership; update ownership-boundaries"

  paper_tigers:
    - risk: "Partitioning might be premature"
      reason: "Partitioning is framed as candidates, not immediate requirements"
      location: "07-idealized-db/performance-and-scaling.md"

  false_alarms:
    - finding: "Missing audit logging strategy"
      reason: "Activities is explicitly defined as canonical audit log in idealized schema"

  checklist_gaps:
    - category: "Integration"
      items_failed: ["Rollback strategy documented, but not validated in migrations"]
