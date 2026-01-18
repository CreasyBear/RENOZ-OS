# Error Recovery

## Error Categories

| Category | Example | Recovery Action |
|----------|---------|-----------------|
| **Type Error** | Missing property, wrong type | Fix types, re-run typecheck |
| **Lint Error** | Style violation, unused import | Auto-fix where possible, manual otherwise |
| **Runtime Error** | Null reference, missing import | Trace error, fix source |
| **Test Failure** | Assertion failed | Review test expectation vs implementation |
| **Build Error** | Module not found, syntax | Check imports, fix syntax |

## Recovery Strategies

### Strategy 1: Incremental Fix
Best for: Type errors, lint errors
1. Read error output carefully
2. Fix ONE error at a time
3. Re-run verification
4. Repeat until clean

### Strategy 2: Rollback and Retry
Best for: Structural mistakes, wrong approach
1. Identify the wrong assumption
2. Revert to last known-good state
3. Try alternative approach
4. Document what didn't work

### Strategy 3: Simplify
Best for: Complex stories, many failures
1. Reduce scope to minimum viable
2. Get core working first
3. Add complexity incrementally
4. Mark enhancements for polish phase

### Strategy 4: Escalate
Best for: Unclear requirements, external blockers
1. Document exactly what's unclear
2. List attempted approaches
3. Mark story as `blocked`
4. Add to blockers list with context
5. Continue with non-dependent work

## Anti-Patterns

❌ **Don't:** Make multiple unrelated changes per iteration
❌ **Don't:** Ignore type errors to "fix later"
❌ **Don't:** Copy code without understanding it
❌ **Don't:** Skip verification to move faster
❌ **Don't:** Continue when foundation is broken
