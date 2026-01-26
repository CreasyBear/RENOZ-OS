# AI Infrastructure Patterns

Reference patterns extracted from Midday's production AI implementation for consistent implementation of the AI Infrastructure PRD.

## Pattern Index

| Pattern | File | PRD Stories |
|---------|------|-------------|
| Agent Architecture | [01-agent-architecture.md](./01-agent-architecture.md) | AI-INFRA-005, AI-INFRA-006 |
| AppContext | [02-app-context.md](./02-app-context.md) | AI-INFRA-013 |
| Parameter Resolution | [03-parameter-resolution.md](./03-parameter-resolution.md) | AI-INFRA-013, AI-INFRA-014 |
| Tool Patterns | [04-tool-patterns.md](./04-tool-patterns.md) | AI-INFRA-014 |
| Artifact Streaming | [05-artifact-streaming.md](./05-artifact-streaming.md) | AI-INFRA-009, AI-INFRA-016 |
| Memory Templates | [06-memory-templates.md](./06-memory-templates.md) | AI-INFRA-012 |
| Shared Prompts | [07-shared-prompts.md](./07-shared-prompts.md) | AI-INFRA-005, AI-INFRA-006 |

## Examples

| Example | Description |
|---------|-------------|
| [agent-triage.ts.md](./examples/agent-triage.ts.md) | Router agent with forced handoffs |
| [agent-specialist.ts.md](./examples/agent-specialist.ts.md) | Domain specialist agent |
| [tool-simple.ts.md](./examples/tool-simple.ts.md) | Basic data retrieval tool |
| [tool-with-artifact.ts.md](./examples/tool-with-artifact.ts.md) | Tool with visualization |
| [context-builder.ts.md](./examples/context-builder.ts.md) | AppContext construction |

## Quick Reference

### Temperature Strategy
| Agent Role | Temperature | Rationale |
|------------|-------------|-----------|
| Triage/Router | 0.1 | Deterministic routing |
| Data Agents | 0.3 | Precision for data retrieval |
| Analytics | 0.5 | Balanced insights |
| Creative | 0.7-0.8 | Content generation |

### Model Selection
| Use Case | Model | Rationale |
|----------|-------|-----------|
| Routing | claude-3-5-haiku | Fast, cheap, sufficient |
| Specialists | claude-sonnet-4 | Balanced quality/cost |
| Titles/Suggestions | gpt-4.1-nano | Ultra-cheap utility |

### Parameter Resolution Priority
1. `forcedToolCall.toolParams` - Widget click (highest)
2. AI params - User query override
3. `currentViewFilter` - Dashboard state
4. Hardcoded defaults - Fallback

### Artifact Stages
```
loading → chart_ready → metrics_ready → analysis_ready
```

## Source
Patterns extracted from: `_reference/.midday-reference/apps/api/src/ai/`
