# Progress Tracking

## File Location
Each domain has: `{domain}/progress.txt`

## Format

```yaml
domain: orders
started: 2026-01-12T10:00:00Z
last_updated: 2026-01-12T14:30:00Z

current_stage: scaffold  # scaffold | core | polish
current_story: ORD-003

stories:
  ORD-001:
    schema: done
    server: done
    route: done
    components: done
    polish: done
    status: complete
    iterations_used: 2
    
  ORD-002:
    schema: done
    server: done
    route: in_progress
    components: pending
    polish: pending
    status: active
    iterations_used: 1
    current_iteration: 2
    
  ORD-003:
    schema: pending
    server: pending
    route: pending
    components: pending
    polish: pending
    status: pending
    iterations_used: 0

blockers: []
  # - story: ORD-005
  #   reason: "Dependency on inventory schema not yet available"
  #   escalated: false

notes:
  - "2026-01-12T12:00: Schema scaffold complete for all 15 stories"
  - "2026-01-12T14:00: Server stubs complete, starting routes"
```

## Update Rules

1. Update `last_updated` on every iteration
2. Update story status immediately on stage completion
3. Add to `notes` for significant events
4. Add to `blockers` immediately when stuck
5. Never delete history - append only
