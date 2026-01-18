# Ralph Patterns Repository

> **Standardizing Autonomous Development: PRDs, Prompts, Wireframes**
> **Last Updated**: 2026-01-10
> **Purpose**: Capture learnings and create replicable patterns for Ralph Wiggum autonomous development

---

## Overview

This repository contains standardized patterns, templates, and best practices for Ralph Wiggum autonomous development. Based on our comprehensive audit of 44 PRDs, we've identified critical patterns that must be established for reliable AI-driven development.

**Key Insight**: Pattern establishment is prerequisite for Ralph success. Without codified conventions, Ralph cannot execute reliably.

---

## Repository Structure

```
memory-bank/_ralph/
├── README.md                          # This overview
├── plans/                             # Implementation roadmaps
│   ├── README.md                      # Plan navigation and status
│   ├── phase-0-implementation-plan.md # Complete 4-week pattern roadmap
│   ├── week-1-execution-plan.md       # Day-by-day Week 1 execution
│   └── phase-0-quick-start.md         # Immediate actions to begin
├── prd-patterns/                      # PRD structure and compliance
│   ├── README.md                      # PRD patterns overview
│   ├── story-templates/               # Story templates by type
│   ├── acceptance-criteria-patterns/  # Criteria writing standards
│   ├── dependency-patterns/           # Dependency management
│   └── compliance-checklist.md        # Ralph compliance validation
├── prompt-patterns/                   # PROMPT.md standards
│   ├── README.md                      # Prompt patterns overview
│   ├── template.md                    # Standardized PROMPT.md template
│   ├── task-granularity-rules.md      # Context window management
│   └── completion-detection.md        # Promise detection patterns
├── wireframe-patterns/                # Wireframe standards
│   ├── README.md                      # Wireframe patterns overview
│   ├── ui-spec-standards.md           # UI specification patterns
│   ├── responsive-patterns.md         # Mobile/tablet/desktop patterns
│   └── accessibility-patterns.md      # A11y requirements
├── execution-patterns/                # Ralph execution standards
│   ├── README.md                      # Execution patterns overview
│   ├── iteration-limits.md            # Max iterations by complexity
│   ├── progress-tracking.md           # progress.txt standards
│   └── error-recovery.md              # Stuck detection and recovery
├── validation-tools/                  # Automation and tooling
│   ├── README.md                      # Validation tools overview
│   ├── prd-validator.js               # PRD compliance checker
│   ├── pattern-linter.js              # Code pattern validation
│   └── audit-scripts/                 # Audit automation
└── learnings/                         # Documentation of insights
    ├── audit-summary.md               # Key findings from audit
    ├── pattern-establishment-roadmap.md # Implementation plan
    ├── success-metrics.md             # How to measure pattern adoption
    └── case-studies/                  # Real examples of pattern application
```

---

## Critical Success Factors

### 1. **Pattern Foundation (Phase 0)**

Before Ralph can execute reliably, these patterns must be established:

- Component structure patterns (Base, Compound, Container/Presenter)
- Data fetching patterns (TanStack Query, optimistic updates)
- Error handling patterns (boundaries, API errors, display)
- Form patterns (validation, submission, accessibility)
- File/folder organization standards

### 2. **Ralph Compliance (Phase 1-4)**

PRDs must be optimized for autonomous execution:

- Remove conflicting fields (`passes` vs `status`)
- Move extra fields to `enhancements` objects
- Standardize acceptance criteria with file references
- Ensure completion promises follow exact format

### 3. **Validation Automation**

Establish automated checking:

- ESLint rules for pattern compliance
- PRD schema validation in CI/CD
- Automated completion detection
- Pattern adoption metrics

---

## Usage Guidelines

### Getting Started

1. **Review the implementation plans** in `plans/`
2. **Begin with Phase 0** using `plans/phase-0-quick-start.md`
3. **Follow the Week 1 plan** in `plans/week-1-execution-plan.md`

### For PRD Authors

1. **Use templates** from `prd-patterns/story-templates/`
2. **Follow acceptance criteria patterns** from `prd-patterns/acceptance-criteria-patterns/`
3. **Run validation** using `validation-tools/prd-validator.js`
4. **Check compliance** against `prd-patterns/compliance-checklist.md`

### For Ralph Operators

1. **Use PROMPT.md template** from `prompt-patterns/template.md`
2. **Follow task granularity rules** from `prompt-patterns/task-granularity-rules.md`
3. **Monitor execution** using `execution-patterns/progress-tracking.md`
4. **Handle errors** per `execution-patterns/error-recovery.md`

### For UI Designers

1. **Follow wireframe patterns** from `wireframe-patterns/`
2. **Use responsive standards** from `wireframe-patterns/responsive-patterns.md`
3. **Ensure accessibility** per `wireframe-patterns/accessibility-patterns.md`

### For Team Leads

1. **Follow the Phase 0 roadmap** in `plans/phase-0-implementation-plan.md`
2. **Track progress** using metrics in `learnings/success-metrics.md`
3. **Review findings** from the audit in `learnings/audit-summary.md`

---

## Quality Assurance

### Pattern Maturity Indicators

- [ ] 90%+ pattern adoption across codebase
- [ ] Automated pattern compliance in CI/CD
- [ ] Ralph completes 95% of stories without intervention
- [ ] Code reviews focus on business logic, not structure
- [ ] Pattern violations caught automatically

### Audit Schedule

- **Weekly**: Pattern adoption metrics review
- **Monthly**: PRD compliance audit
- **Quarterly**: Pattern effectiveness assessment
- **Annually**: Pattern evolution and updates

---

## Getting Started

e

1. **Start immediately**: Follow `plans/phase-0-quick-start.md`
2. **Read the audit summary**: `learnings/audit-summary.md`
3. **Follow the Week 1 plan**: `plans/week-1-execution-plan.md`
4. **Understand the full roadmap**: `plans/phase-0-implementation-plan.md`
5. **Choose your role** and follow the corresponding guidelines above
6. **Contribute patterns** by documenting successful approaches

---

## Key References

- **Implementation Plans**: `plans/README.md`
- **Pattern Skill**: `.claude/skills/pattern/SKILL.md`
- **Ralph Skill**: `.claude/skills/ralph-wiggum/SKILL.md`
- **Audit Results**: `../_audits/systematic-ralph-audit.json`
- **Governance**: `../_meta/ralph-guidelines.md`

---

*This repository is the foundation for reliable autonomous development at scale.*
