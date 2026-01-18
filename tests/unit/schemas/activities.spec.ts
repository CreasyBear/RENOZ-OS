/**
 * Tests for Activity Zod Schemas
 */

import { describe, it, expect } from "vitest";
import {
  activityActionSchema,
  activityEntityTypeSchema,
  activityChangesSchema,
  activityMetadataSchema,
  createActivitySchema,
  activitySchema,
  activityFilterSchema,
  activityListQuerySchema,
  entityActivitiesQuerySchema,
  userActivitiesQuerySchema,
} from "@/lib/schemas/activities";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("Activity Enum Schemas", () => {
  describe("activityActionSchema", () => {
    it("accepts valid actions", () => {
      const actions = [
        "created",
        "updated",
        "deleted",
        "viewed",
        "exported",
        "shared",
        "assigned",
        "commented",
      ];

      for (const action of actions) {
        const result = activityActionSchema.safeParse(action);
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid action", () => {
      const result = activityActionSchema.safeParse("invalid_action");
      expect(result.success).toBe(false);
    });
  });

  describe("activityEntityTypeSchema", () => {
    it("accepts valid entity types", () => {
      const types = [
        "customer",
        "contact",
        "order",
        "opportunity",
        "product",
        "inventory",
        "supplier",
        "warranty",
        "issue",
        "user",
      ];

      for (const type of types) {
        const result = activityEntityTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid entity type", () => {
      const result = activityEntityTypeSchema.safeParse("invalid_type");
      expect(result.success).toBe(false);
    });
  });
});

describe("Activity Changes Schema", () => {
  it("accepts valid changes object", () => {
    const result = activityChangesSchema.safeParse({
      before: { name: "Old Name" },
      after: { name: "New Name" },
      fields: ["name"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty changes", () => {
    const result = activityChangesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial changes", () => {
    const result = activityChangesSchema.safeParse({
      after: { status: "active" },
    });
    expect(result.success).toBe(true);
  });
});

describe("Activity Metadata Schema", () => {
  it("accepts valid metadata", () => {
    const result = activityMetadataSchema.safeParse({
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      requestId: "req_123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty metadata", () => {
    const result = activityMetadataSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("allows additional properties via passthrough", () => {
    const result = activityMetadataSchema.safeParse({
      customField: "custom value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customField).toBe("custom value");
    }
  });
});

describe("Create Activity Schema", () => {
  it("accepts valid activity data", () => {
    const result = createActivitySchema.safeParse({
      entityType: "customer",
      entityId: validUuid,
      action: "created",
      description: "Customer was created",
    });
    expect(result.success).toBe(true);
  });

  it("requires entityType", () => {
    const result = createActivitySchema.safeParse({
      entityId: validUuid,
      action: "created",
    });
    expect(result.success).toBe(false);
  });

  it("requires entityId", () => {
    const result = createActivitySchema.safeParse({
      entityType: "customer",
      action: "created",
    });
    expect(result.success).toBe(false);
  });

  it("requires action", () => {
    const result = createActivitySchema.safeParse({
      entityType: "customer",
      entityId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("validates entityId as UUID", () => {
    const result = createActivitySchema.safeParse({
      entityType: "customer",
      entityId: "not-a-uuid",
      action: "created",
    });
    expect(result.success).toBe(false);
  });

  it("accepts full activity data with changes and metadata", () => {
    const result = createActivitySchema.safeParse({
      entityType: "order",
      entityId: validUuid,
      action: "updated",
      createdBy: validUuid,
      changes: {
        before: { status: "draft" },
        after: { status: "confirmed" },
        fields: ["status"],
      },
      metadata: {
        ipAddress: "192.168.1.1",
        requestId: "req_abc",
      },
      description: "Order status changed from draft to confirmed",
    });
    expect(result.success).toBe(true);
  });
});

describe("Activity Schema (Output)", () => {
  it("includes all fields with timestamps", () => {
    const result = activitySchema.safeParse({
      id: validUuid,
      organizationId: validUuid,
      userId: null, // Can be null for system actions
      entityType: "customer",
      entityId: validUuid,
      action: "viewed",
      changes: null,
      metadata: null,
      ipAddress: null,
      userAgent: null,
      description: null,
      createdAt: new Date().toISOString(),
      createdBy: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts activity with user context", () => {
    const result = activitySchema.safeParse({
      id: validUuid,
      organizationId: validUuid,
      userId: validUuid,
      entityType: "order",
      entityId: validUuid,
      action: "updated",
      changes: { before: { status: "draft" }, after: { status: "confirmed" }, fields: ["status"] },
      metadata: { requestId: "req_123" },
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      description: "Order confirmed",
      createdAt: new Date().toISOString(),
      createdBy: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

describe("Activity Filter Schema", () => {
  it("accepts all filter options", () => {
    const result = activityFilterSchema.safeParse({
      entityType: "customer",
      entityId: validUuid,
      action: "created",
      createdBy: validUuid,
      search: "test",
      dateFrom: new Date().toISOString(),
      dateTo: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty filters", () => {
    const result = activityFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("Activity List Query Schema", () => {
  it("accepts cursor pagination with filters", () => {
    const result = activityListQuerySchema.safeParse({
      cursor: "base64cursor",
      pageSize: 50,
      entityType: "order",
      action: "updated",
    });
    expect(result.success).toBe(true);
  });

  it("applies default pageSize", () => {
    const result = activityListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSize).toBe(20);
    }
  });
});

describe("Entity Activities Query Schema", () => {
  it("accepts valid entity activities query", () => {
    const result = entityActivitiesQuerySchema.safeParse({
      entityType: "customer",
      entityId: validUuid,
      pageSize: 25,
    });
    expect(result.success).toBe(true);
  });

  it("requires entityType and entityId", () => {
    const result = entityActivitiesQuerySchema.safeParse({
      pageSize: 25,
    });
    expect(result.success).toBe(false);
  });
});

describe("User Activities Query Schema", () => {
  it("accepts valid user activities query", () => {
    const result = userActivitiesQuerySchema.safeParse({
      userId: validUuid,
      cursor: "base64cursor",
      pageSize: 30,
    });
    expect(result.success).toBe(true);
  });

  it("requires userId", () => {
    const result = userActivitiesQuerySchema.safeParse({
      pageSize: 30,
    });
    expect(result.success).toBe(false);
  });
});
