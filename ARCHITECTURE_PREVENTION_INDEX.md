# Container/Presenter Architecture Prevention - Complete Index

## 📚 Documentation Files Created

This prevention system includes comprehensive documentation and automated tooling:

### 1. **PREVENTION_STRATEGIES.md** (Main Reference)
   - **Length:** 850+ lines
   - **Purpose:** Comprehensive prevention guide with all strategies
   - **Contains:**
     - Code review checklist items
     - 7 automated grep commands with usage examples
     - 5 ESLint rule suggestions with full configurations
     - Directory structure conventions and anti-patterns
     - Testing patterns (unit, integration, accessibility)
     - Pre-commit hook configuration
     - Enforcement timeline
     - Real violation examples with fixes
     - Monitoring metrics

### 2. **QUICK_REFERENCE.md** (Get Started Fast)
   - **Length:** 400+ lines
   - **Purpose:** Quick lookup for developers
   - **Contains:**
     - TL;DR rules (DO/DON'T)
     - Decision tree for code placement
     - Checklists for committing/features
     - 3 common patterns with full code
     - Summary table of rules
     - Quick automated checks

### 3. **eslint-architecture-rules.js** (ESLint Configuration)
   - **Purpose:** ESLint rules preventing violations
   - **Contains:**
     - Rules for domain presenters
     - Rules for data fetching layers
     - Rules for shared/UI components
     - Query key enforcement rules
     - Full integration instructions

### 4. **scripts/check-architecture.sh** (Automated Detection)
   - **Purpose:** Bash script to scan for violations
   - **Runs:** 6 major architecture checks
   - **Features:**
     - Colored output (green/red/yellow)
     - Verbose mode for details
     - Exit codes for CI/CD integration
     - Pre-commit hook ready

### 5. **.github/ARCHITECTURE_REVIEW.md** (PR Template)
   - **Length:** 300+ lines
   - **Purpose:** Code review checklist for pull requests
   - **Contains:**
     - 30+ specific review items
     - Common issues with fixes
     - Questions to ask reviewers
     - Approval requirements
     - Links to documentation

### 6. **ARCHITECTURE_PREVENTION_INDEX.md** (This File)
   - **Purpose:** Navigation guide and setup instructions

---

## 🚀 Quick Start (5 minutes)

### Step 1: Review Architecture Rules
```bash
cat QUICK_REFERENCE.md  # Start here (5 min read)
```

### Step 2: Run Automated Check
```bash
npm run check:architecture  # Should pass (0 violations)
```

### Step 3: Understand ESLint Rules
```bash
npm run lint  # Should pass (0 errors)
```

### Step 4: When Creating New Code
See **QUICK_REFERENCE.md** → Common Patterns section

---

## 📋 Problem Reference

### Problem 1: useQuery/useMutation in Components

**Symptom:** ESLint error or grep detects `useQuery` in `src/components/domain/`

**Fix:**
```bash
# Find the file
grep -r "useQuery" src/components/domain

# Create a hook instead (src/hooks/domain/use-*.ts)
# Move code from component to hook
# Import hook in route
# Pass data to component as props
```

**Reference:** PREVENTION_STRATEGIES.md section 9 (Violation Example 1)

### Problem 2: Inline Query Keys

**Symptom:** ESLint warning or grep detects `queryKey: [`

**Fix:**
```bash
# Check current inline keys
grep -r "queryKey: \[" src/ --include="*.tsx" | grep -v "queryKeys\."

# Use queryKeys.* instead
# If missing, add to src/lib/query-keys.ts
```

**Reference:** PREVENTION_STRATEGIES.md section 2.2

### Problem 3: Server Function Imports in Components

**Symptom:** ESLint error or grep detects `from '@/server/functions`

**Fix:**
```bash
# Create hook that imports server function
# Hook imports from @/server/functions
# Component receives callback as prop
# Route passes callback to component
```

**Reference:** PREVENTION_STRATEGIES.md section 9 (Violation Example 2)

### Problem 4: Wrong Directory Structure

**Symptom:** Components in unexpected places

**Fix:**
```bash
# Correct structure:
src/components/domain/{feature}/{component}.tsx
src/components/shared/{feature}/{component}.tsx
src/components/ui/{component}.tsx

# NOT:
src/components/domain/{feature}/components/{component}.tsx
src/hooks/use-*.tsx (hooks go in src/hooks/, not components)
```

**Reference:** PREVENTION_STRATEGIES.md section 4

### Problem 5: Manual Polling

**Symptom:** `setInterval` or `setTimeout` in data fetching

**Fix:**
```typescript
// Before
useEffect(() => {
  const interval = setInterval(() => fetch(), 2000);
  return () => clearInterval(interval);
}, []);

// After
useQuery({
  queryKey: queryKeys.job.status(jobId),
  queryFn: () => getJobStatus({ data: { jobId } }),
  refetchInterval: 2000,
})
```

**Reference:** PREVENTION_STRATEGIES.md section 2.3

---

## 🔍 Automated Detection Commands

Run these to find violations:

```bash
# ALL checks at once
npm run check:architecture

# Check 1: useQuery/useMutation in domain components
grep -r "useQuery\|useMutation" src/components/domain --include="*.tsx" -n

# Check 2: Inline query keys
grep -r "queryKey: \[" src/ --include="*.tsx" | grep -v "queryKeys\." -n

# Check 3: Server function imports in components
grep -r "from '@/server/functions" src/components/domain --include="*.tsx" -n

# Check 4: Manual polling
grep -r "setInterval\|setTimeout" src/components/domain --include="*.tsx" -n

# Check 5: useState + useEffect data patterns
grep -r "useState" src/components/domain --include="*.tsx" -B2 -A2 | grep useEffect

# Check 6: Type errors
npm run typecheck

# Check 7: ESLint errors
npm run lint
```

---

## ✅ Pre-Commit Checklist

Before committing code, run:

```bash
# 1. Architecture violations
npm run check:architecture

# 2. Type checking
npm run typecheck

# 3. Linting
npm run lint

# 4. Tests
bun test

# 5. Format check
npm run format
```

---

## 📖 Documentation Map

### For Different Audiences

**I'm a developer adding a feature:**
1. Read: `QUICK_REFERENCE.md` (5 min)
2. Check: Common Patterns section
3. Use: Checklist "When Adding a New Feature"

**I'm reviewing a PR:**
1. Reference: `.github/ARCHITECTURE_REVIEW.md`
2. Run: `npm run check:architecture`
3. Checklist: Use sections A-D

**I'm setting up CI/CD:**
1. Setup: `scripts/check-architecture.sh`
2. Configure: Pre-commit hooks
3. Reference: ESLint rules in `eslint-architecture-rules.js`

**I'm enforcing compliance:**
1. Phase 1: Read `PREVENTION_STRATEGIES.md` section 7
2. Phase 2: Update ESLint config
3. Phase 3: Add pre-commit hook
4. Phase 4: Train team

**I need to understand the full system:**
1. Read: `PREVENTION_STRATEGIES.md` (comprehensive)
2. Review: All code examples
3. Check: Testing patterns
4. Setup: Monitoring metrics

---

## 🛠️ Configuration Files

### Files to Update/Create

1. **eslint.config.js** (existing, needs updates)
   ```javascript
   import { domainPresenterRules, dataFetchingRules, sharedComponentRules } from './eslint-architecture-rules.js';
   
   export default [
     // ... existing configs
     domainPresenterRules,
     dataFetchingRules,
     sharedComponentRules,
   ];
   ```

2. **package.json** (add script)
   ```json
   {
     "scripts": {
       "check:architecture": "bash scripts/check-architecture.sh"
     }
   }
   ```

3. **.git/hooks/pre-commit** (new file)
   ```bash
   #!/bin/bash
   bash scripts/check-architecture.sh
   ```

4. **.github/pull_request_template.md** (update existing)
   ```markdown
   - [ ] Reviewed ARCHITECTURE_REVIEW.md checklist
   - [ ] npm run check:architecture passes
   ```

---

## 📊 Compliance Metrics

Track these monthly:

```bash
# Run this quarterly audit
echo "=== ARCHITECTURE COMPLIANCE REPORT ==="
echo "Total domain components: $(find src/components/domain -name "*.tsx" | wc -l)"
echo "Components with useQuery (should be 0): $(grep -r 'useQuery' src/components/domain --include='*.tsx' | wc -l)"
echo "Inline query keys (should be 0): $(grep -r "queryKey: \[" src/ --include='*.tsx' | grep -v 'queryKeys\.' | wc -l)"
echo "Server imports in components (should be 0): $(grep -r "from '@/server" src/components/domain --include='*.tsx' | wc -l)"
echo "Type errors: $(npm run typecheck 2>&1 | grep error | wc -l)"
echo "ESLint errors: $(npm run lint 2>&1 | grep error | wc -l)"
```

**Expected Results (Healthy Codebase):**
- Components with useQuery: 0 ✅
- Inline query keys: 0 ✅
- Server imports in components: 0 ✅
- Type errors: 0 ✅
- ESLint errors: 0 ✅

---

## 🎓 Learning Resources

### Understanding Container/Presenter Pattern

1. **Why split containers and presenters?**
   - Containers manage data (what to display)
   - Presenters render UI (how to display it)
   - Benefits: Reusability, testability, separation of concerns

2. **Data flow direction:**
   - Always DOWN: Route → Hook → Component (via props)
   - Never UP: Component should never fetch data directly

3. **TanStack Query benefits:**
   - Automatic caching
   - Cache invalidation
   - Request deduplication
   - Background refetching
   - Error handling

### Example Projects in This Codebase

- **src/routes/_authenticated/pipeline/$opportunityId.tsx** - Good route example
- **src/components/domain/pipeline/quote-builder.tsx** - Good presenter example
- **src/hooks/customers/use-customers.ts** - Good hook example
- **src/lib/query-keys.ts** - Complete query key reference

---

## ⚠️ Common Mistakes to Avoid

| Mistake | Impact | Fix |
|---------|--------|-----|
| useQuery in component | ESLint error, violates pattern | Move to hook/route |
| Inline query keys | Cache issues, duplication | Use queryKeys.* |
| Server imports in component | ESLint error, untestable | Pass callback as prop |
| useState + useEffect for data | Bugs, cache conflicts | Use useQuery |
| Manual polling (setInterval) | Memory leaks, inefficient | Use refetchInterval |
| Nested /components/components | Confusing structure | Flatten structure |
| Callback props with `any` type | Runtime errors, unsafe | Use specific types |
| Missing cache invalidation | Stale data, poor UX | Add onSuccess callbacks |

---

## 🔗 Quick Links

### Within This Codebase
- `src/lib/query-keys.ts` - All available query keys
- `src/hooks/` - Hook examples by domain
- `src/routes/` - Route examples
- `src/components/domain/` - Presenter examples

### External References
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)
- [TanStack Query Cache Invalidation](https://tkdodo.eu/blog/effective-react-query-keys)

---

## 📞 Support

### Getting Help

1. **"How do I write this pattern?"** → `QUICK_REFERENCE.md`
2. **"What's violating the rules?"** → `npm run check:architecture`
3. **"How do I review this PR?"** → `.github/ARCHITECTURE_REVIEW.md`
4. **"Where should I put this code?"** → Decision tree in `QUICK_REFERENCE.md`
5. **"Can I use this library?"** → `PREVENTION_STRATEGIES.md` section 3

### Creating Issues

When filing architecture-related issues:
1. Run `npm run check:architecture --verbose`
2. Share violation details
3. Link to similar working code
4. Reference specific section of docs

---

## 📋 Enforcement Phases

### Phase 1: Documentation & Awareness (Week 1)
- ✅ This prevention system created
- Team reviews documentation
- Setup pre-commit hooks (optional)

### Phase 2: Measurement (Week 2)
- Run monthly compliance audit
- Document current state
- Identify existing violations

### Phase 3: Active Enforcement (Week 3+)
- ESLint rules enabled
- PR reviews use checklist
- Non-compliant PRs blocked

### Phase 4: Maintenance (Ongoing)
- Monthly compliance reports
- Team training on patterns
- Architecture reviews quarterly

---

## ✨ Summary

This prevention system provides:

✅ **Documentation**
- Comprehensive guide (PREVENTION_STRATEGIES.md)
- Quick reference (QUICK_REFERENCE.md)
- Code review template (.github/ARCHITECTURE_REVIEW.md)

✅ **Automation**
- ESLint rules (eslint-architecture-rules.js)
- Bash script (scripts/check-architecture.sh)
- Pre-commit hooks ready

✅ **Patterns**
- Common patterns with full code
- Testing examples
- Directory structure conventions

✅ **Enforcement**
- 6 automated checks
- ESLint integration
- Metrics for tracking

✅ **Support**
- Decision trees
- Troubleshooting guide
- Real violation examples

---

**Last Updated:** January 24, 2026
**System:** Renoz v3 CRM
**Framework:** React 19 + TanStack Start + TanStack Query
