/**
 * Test Script: Claude Haiku Forced Tool Choice for Triage Routing
 *
 * This script verifies that Claude Haiku respects forced tool choice
 * and always calls the handoff_to_agent tool for routing queries.
 *
 * Usage:
 *   bun run scripts/test-haiku-triage-routing.ts
 *
 * Prerequisites:
 *   - ANTHROPIC_API_KEY in .env
 *   - @ai-sdk/anthropic package installed
 */

import "dotenv/config";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool } from "ai";
import { z } from "zod";

// ============================================================================
// CONFIGURATION
// ============================================================================

const HAIKU_MODEL = "claude-3-haiku-20240307";

// Agent names that can be routed to
const AGENTS = [
  "customerAgent",
  "analyticsAgent",
  "quoteAgent",
  "orderAgent",
  "generalAgent",
] as const;

type AgentName = (typeof AGENTS)[number];

// ============================================================================
// TRIAGE SYSTEM PROMPT
// ============================================================================

const TRIAGE_SYSTEM_PROMPT = `You are a triage router for a CRM system. Your ONLY job is to route user queries to the appropriate specialized agent.

You MUST call the handoff_to_agent tool with the correct agent based on these rules:

- customerAgent: Questions about customers, contacts, finding people, customer information
- analyticsAgent: Questions about sales, revenue, metrics, reports, statistics, performance
- quoteAgent: Questions about quotes, proposals, estimates, pricing, creating quotes
- orderAgent: Questions about orders, order status, deliveries, tracking orders
- generalAgent: Any other questions that don't fit the above categories

IMPORTANT: You must ALWAYS call the handoff_to_agent tool. Never respond without calling it.`;

// ============================================================================
// HANDOFF TOOL DEFINITION
// ============================================================================

const handoffTool = tool({
  description:
    "Hand off the user query to a specialized agent for processing. You MUST always call this tool.",
  inputSchema: z.object({
    agent: z
      .enum(AGENTS)
      .describe("The specialized agent to route this query to"),
    reason: z
      .string()
      .describe("Brief explanation of why this agent was selected"),
    query_summary: z
      .string()
      .describe("A brief summary of what the user is asking for"),
  }),
  // Note: execute is optional - we're just capturing the tool call for testing
});

// ============================================================================
// TEST CASES
// ============================================================================

interface TestCase {
  query: string;
  expectedAgent: AgentName;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    query: "Show me customer John Smith",
    expectedAgent: "customerAgent",
    description: "Customer lookup by name",
  },
  {
    query: "What were sales last month",
    expectedAgent: "analyticsAgent",
    description: "Sales metrics query",
  },
  {
    query: "Create a quote for solar panels",
    expectedAgent: "quoteAgent",
    description: "Quote creation request",
  },
  {
    query: "List open orders",
    expectedAgent: "orderAgent",
    description: "Order status query",
  },
  // Additional edge cases
  {
    query: "Find all customers in California",
    expectedAgent: "customerAgent",
    description: "Customer search with filter",
  },
  {
    query: "What's our revenue trend for Q4?",
    expectedAgent: "analyticsAgent",
    description: "Revenue analytics query",
  },
  {
    query: "I need a proposal for roofing work",
    expectedAgent: "quoteAgent",
    description: "Proposal/quote request (synonym)",
  },
  {
    query: "Check on order #12345",
    expectedAgent: "orderAgent",
    description: "Specific order lookup",
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

interface TestResult {
  query: string;
  expectedAgent: AgentName;
  actualAgent: AgentName | null;
  passed: boolean;
  toolCalled: boolean;
  reason: string | null;
  latencyMs: number;
  error?: string;
}

async function runTriageTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const result = await generateText({
      model: anthropic(HAIKU_MODEL),
      system: TRIAGE_SYSTEM_PROMPT,
      prompt: testCase.query,
      tools: {
        handoff_to_agent: handoffTool,
      },
      toolChoice: "required", // Force the model to call a tool
      temperature: 0, // Deterministic output
    });

    const latencyMs = Date.now() - startTime;

    // Check if tool was called
    const toolCalls = result.toolCalls || [];
    const handoffCall = toolCalls.find((tc) => tc.toolName === "handoff_to_agent");

    if (!handoffCall) {
      return {
        query: testCase.query,
        expectedAgent: testCase.expectedAgent,
        actualAgent: null,
        passed: false,
        toolCalled: false,
        reason: null,
        latencyMs,
        error: "No tool call made despite toolChoice: required",
      };
    }

    // In Vercel AI SDK v6, tool call input is accessed via 'input' property
    const args = (handoffCall as { input?: unknown }).input as {
      agent: AgentName;
      reason: string;
      query_summary: string;
    } | undefined;

    if (!args) {
      return {
        query: testCase.query,
        expectedAgent: testCase.expectedAgent,
        actualAgent: null,
        passed: false,
        toolCalled: true,
        reason: null,
        latencyMs,
        error: "Tool was called but no input was provided",
      };
    }

    return {
      query: testCase.query,
      expectedAgent: testCase.expectedAgent,
      actualAgent: args.agent,
      passed: args.agent === testCase.expectedAgent,
      toolCalled: true,
      reason: args.reason,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      query: testCase.query,
      expectedAgent: testCase.expectedAgent,
      actualAgent: null,
      passed: false,
      toolCalled: false,
      reason: null,
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runAllTests(): Promise<void> {
  console.log("=".repeat(70));
  console.log("Claude Haiku Triage Routing Test");
  console.log(`Model: ${HAIKU_MODEL}`);
  console.log(`Temperature: 0 (deterministic)`);
  console.log(`Tool Choice: required (forced)`);
  console.log("=".repeat(70));
  console.log();

  const results: TestResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`Testing: "${testCase.query}"`);
    console.log(`  Expected: ${testCase.expectedAgent} (${testCase.description})`);

    const result = await runTriageTest(testCase);
    results.push(result);

    if (result.error) {
      console.log(`  ERROR: ${result.error}`);
    } else {
      const status = result.passed ? "PASS" : "FAIL";
      const icon = result.passed ? "✓" : "✗";
      console.log(`  Actual: ${result.actualAgent}`);
      console.log(`  Reason: ${result.reason}`);
      console.log(`  Result: ${icon} ${status} (${result.latencyMs}ms)`);
    }
    console.log();
  }

  // Summary
  console.log("=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));

  const passed = results.filter((r) => r.passed).length;
  const toolCallsMade = results.filter((r) => r.toolCalled).length;
  const avgLatency =
    results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}/${results.length} (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Tool Calls Made: ${toolCallsMade}/${results.length} (forced tool choice respected)`);
  console.log(`Average Latency: ${avgLatency.toFixed(0)}ms`);
  console.log();

  // Detailed failures
  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    console.log("FAILURES:");
    for (const failure of failures) {
      console.log(`  - "${failure.query}"`);
      console.log(`    Expected: ${failure.expectedAgent}, Got: ${failure.actualAgent || "no call"}`);
      if (failure.error) {
        console.log(`    Error: ${failure.error}`);
      }
    }
  }

  // Exit with appropriate code
  process.exit(passed === results.length ? 0 : 1);
}

// ============================================================================
// MAIN
// ============================================================================

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY environment variable not set");
  console.error("Add it to your .env file or export it in your shell");
  process.exit(1);
}

runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
