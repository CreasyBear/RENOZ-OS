# Stuck Detection

## Definition of "Stuck"

Ralph is stuck when:
1. Same error repeats 3+ times with different fixes
2. Iteration count reaches `estimated_iterations` limit
3. Fix for one error creates new errors (whack-a-mole)
4. Cannot determine what to do next

## Detection Signals

| Signal | Threshold | Action |
|--------|-----------|--------|
| Repeated error message | 3 identical | Try fundamentally different approach |
| Iteration count | >= limit | Stop, assess, escalate if needed |
| Oscillating changes | 2 revert cycles | Stop, simplify scope |
| No verification progress | 3 iterations | Step back, review requirements |

## Stuck Protocol

### Step 1: Recognize
```
Current iteration: 4 of 3 (EXCEEDED)
Last 3 errors: [same TypeScript error]
Status: STUCK
```

### Step 2: Diagnose
- Is the requirement clear?
- Is the approach fundamentally sound?
- Are dependencies in place?
- Is this a tooling/environment issue?

### Step 3: Decide

| Diagnosis | Action |
|-----------|--------|
| Unclear requirement | Mark blocked, escalate |
| Wrong approach | Rollback, try alternative (if foundation) |
| Missing dependency | Mark blocked, note dependency |
| Environment issue | Fix environment, don't count as iteration |
| Approach is fine, just hard | Simplify scope, defer complexity |

### Step 4: Document
Always log in progress.txt:
```yaml
blockers:
  - story: ORD-007
    reason: "Type error in OrderForm - form library types incompatible with Zod schema"
    attempts: 
      - "Tried react-hook-form with zodResolver"
      - "Tried manual validation"
      - "Tried simpler schema subset"
    escalated: true
    escalated_at: 2026-01-12T16:00:00Z
```

## Prevention

1. **Start simple** - Get minimal version working first
2. **Verify early** - Run typecheck after every significant change
3. **One thing at a time** - Don't combine schema + server + UI in one iteration
4. **Read errors carefully** - The error message usually tells you what's wrong
5. **Check dependencies** - Ensure required schemas/functions exist before using
