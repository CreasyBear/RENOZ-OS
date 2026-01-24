premortem:
  mode: deep
  context: "Codebase wiring for idealized DB (TanStack Start + Drizzle + Supabase)"

  potential_risks:
    - "new schemas not wired into existing server function structure"
    - "RLS policy tests missing for portal/subcontractor scope"
    - "search indexing path conflicts with current job/trigger setup"
    - "Zod schemas lag behind new tables and server functions"
    - "analytics MVs created without refresh job ownership"

  tigers:
    - risk: "New search/portal/report schemas not present in Drizzle; wiring will drift without explicit schema files"
      location: "renoz-v3/drizzle/schema/* (no search/portal/reports folders yet)"
      severity: high
      category: data
      mitigation_checked: "No existing search/portal/reports schema files found in drizzle/schema"
      suggested_fix: "Add explicit Drizzle schema files and migrations before server/API wiring"
    - risk: "Portal RLS for customer/subcontractor scope not covered in existing policy structure"
      location: "renoz-v3/drizzle/schema/** (pgPolicy usage)"
      severity: high
      category: security
      mitigation_checked: "No portal-specific RLS policies or customer-scoped policies found in schema folders"
      suggested_fix: "Define portal policies per table and add RLS tests under tests/unit/rls"
    - risk: "Outbox indexing could be implemented inconsistently across write paths"
      location: "renoz-v3/src/server/functions/** (domain functions)"
      severity: high
      category: integration
      mitigation_checked: "No shared outbox helper or uniform write hook located"
      suggested_fix: "Create a shared outbox helper and require usage in all write functions"

  elephants:
    - risk: "Search + analytics job scheduling ownership unclear (trigger vs job vs cron)"
      severity: medium
      suggested_fix: "Standardize on `src/trigger/jobs/*` for scheduled work and document cadence"

  paper_tigers:
    - risk: "Missing hooks for new APIs"
      reason: "Hooks live in src/hooks and can be added incrementally after server functions"
      location: "renoz-v3/src/hooks"

  false_alarms:
    - finding: "No job/cron infrastructure exists"
      reason: "There is a dedicated trigger jobs directory at src/trigger/jobs"

  checklist_gaps:
    - category: "Testing"
      items_failed: ["No explicit RLS test harness in tests/"]
