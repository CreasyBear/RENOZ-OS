---
status: pending
priority: p2
issue_id: "MMR-006"
tags: [agent-native, ai-tools, feature-parity]
dependencies: []
---

# Missing Agent-Native Tools (35+ UI Capabilities)

## Problem Statement

Only 15 of 50+ UI capabilities are accessible to AI agents. This violates the agent-native architecture principle: "Any action a user can take, an agent can also take."

## Findings

- **Agent-Accessible:** 15 capabilities (customer lookup, order queries, basic CRUD)
- **Missing from Agents:** 35+ capabilities including:
  - Email sending
  - Customer CRUD operations
  - Organization management
  - Job management
  - User invitations
  - Supplier management
  - Warranty tracking
  - Document generation
- **Severity:** P2 HIGH - Limits AI agent usefulness significantly

**Current coverage:**
| Domain | UI Capable | Agent Capable | Gap |
|--------|-----------|---------------|-----|
| Customers | 12 | 3 | 9 |
| Orders | 8 | 2 | 6 |
| Jobs | 10 | 0 | 10 |
| Email | 6 | 0 | 6 |
| Org Mgmt | 5 | 0 | 5 |

## Proposed Solutions

### Option 1: Incremental Tool Addition (Recommended)

**Approach:** Add tools domain-by-domain, starting with highest-impact capabilities.

**Pros:**
- Manageable scope
- Can ship incrementally
- Test each domain thoroughly

**Cons:**
- Takes longer for full coverage
- Priority decisions needed

**Effort:** 2-4 hours per domain

**Risk:** Low

---

### Option 2: Server Function Wrapper Generation

**Approach:** Auto-generate tool wrappers from existing server functions.

**Pros:**
- Fast full coverage
- Consistent patterns
- Less manual work

**Cons:**
- May expose functions not intended for AI
- Need permission review
- Generated code quality varies

**Effort:** 8-12 hours initial, then maintenance

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Priority order for new tools:**
1. Customer CRUD - createCustomer, updateCustomer, deleteCustomer
2. Email - sendEmail, getEmailTemplates, sendCampaign
3. Jobs - createJob, updateJob, getJobStatus, assignJob
4. Organizations - updateOrgSettings, manageUsers
5. Invitations - sendInvitation, cancelInvitation

**Tool pattern to follow:**
```typescript
export const createCustomerTool: AgentTool = {
  name: 'create_customer',
  description: 'Create a new customer in the CRM',
  parameters: createCustomerSchema,
  handler: async (params, ctx) => {
    return await createCustomer({ data: params });
  },
  requiresApproval: true, // For mutations
};
```

## Resources

- **Review Agent:** Agent-Native Reviewer
- **Agent-Native Architecture:** docs/architecture/agent-native.md

## Acceptance Criteria

- [ ] Customer CRUD tools implemented
- [ ] Email tools implemented with proper permissions
- [ ] Job management tools implemented
- [ ] All tools have appropriate approval requirements
- [ ] Tool documentation updated
- [ ] Agent can perform same actions as UI

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Agent-Native Reviewer Agent

**Actions:**
- Audited UI capabilities vs agent tools
- Identified 35+ missing tool implementations
- Prioritized by user impact

**Learnings:**
- Agent-native architecture requires ongoing maintenance
- Each new UI feature should have corresponding tool
- Consider requiring tool in PR checklist
