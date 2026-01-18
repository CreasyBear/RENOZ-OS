/**
 * Tests for Activity Logger Utility
 *
 * Tests the ActivityLogger class and computeChanges function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the db module before importing activity-logger
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  },
}));

import {
  ActivityLogger,
  createActivityLogger,
  computeChanges,
  type ActivityContext,
} from "@/lib/activity-logger";
import { db } from "@/lib/db";

const mockContext: ActivityContext = {
  organizationId: "550e8400-e29b-41d4-a716-446655440000",
  userId: "660e8400-e29b-41d4-a716-446655440001",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0 Test Agent",
  requestId: "req_test_123",
};

describe("computeChanges", () => {
  describe("create operations (no before state)", () => {
    it("returns after state and all fields for creates", () => {
      const result = computeChanges({
        before: null,
        after: { name: "John", email: "john@example.com" },
      });

      expect(result.before).toBeUndefined();
      expect(result.after).toEqual({ name: "John", email: "john@example.com" });
      expect(result.fields).toContain("name");
      expect(result.fields).toContain("email");
    });

    it("excludes specified fields on create", () => {
      const result = computeChanges({
        before: null,
        after: { name: "John", updatedAt: new Date(), createdAt: new Date() },
        excludeFields: ["updatedAt", "createdAt"],
      });

      expect(result.fields).toContain("name");
      expect(result.fields).not.toContain("updatedAt");
      expect(result.fields).not.toContain("createdAt");
    });

    it("masks sensitive fields on create", () => {
      const result = computeChanges({
        before: null,
        after: { name: "John", password: "secret123", ssn: "123-45-6789" },
        sensitiveFields: ["password", "ssn"],
      });

      expect(result.after?.name).toBe("John");
      expect(result.after?.password).toBe("[REDACTED]");
      expect(result.after?.ssn).toBe("[REDACTED]");
    });
  });

  describe("delete operations (no after state)", () => {
    it("returns before state and all fields for deletes", () => {
      const result = computeChanges({
        before: { name: "John", email: "john@example.com" },
        after: null,
      });

      expect(result.before).toEqual({ name: "John", email: "john@example.com" });
      expect(result.after).toBeUndefined();
      expect(result.fields).toContain("name");
      expect(result.fields).toContain("email");
    });

    it("masks sensitive fields on delete", () => {
      const result = computeChanges({
        before: { name: "John", apiKey: "sk_123" },
        after: null,
        sensitiveFields: ["apiKey"],
      });

      expect(result.before?.name).toBe("John");
      expect(result.before?.apiKey).toBe("[REDACTED]");
    });
  });

  describe("update operations", () => {
    it("detects changed fields", () => {
      const result = computeChanges({
        before: { name: "John", email: "john@example.com" },
        after: { name: "John Doe", email: "john@example.com" },
      });

      expect(result.fields).toEqual(["name"]);
      expect(result.before).toEqual({ name: "John" });
      expect(result.after).toEqual({ name: "John Doe" });
    });

    it("detects multiple changed fields", () => {
      const result = computeChanges({
        before: { name: "John", email: "old@example.com", status: "active" },
        after: { name: "John Doe", email: "new@example.com", status: "active" },
      });

      expect(result.fields).toContain("name");
      expect(result.fields).toContain("email");
      expect(result.fields).not.toContain("status");
    });

    it("returns empty fields array when no changes", () => {
      const result = computeChanges({
        before: { name: "John", email: "john@example.com" },
        after: { name: "John", email: "john@example.com" },
      });

      expect(result.fields).toEqual([]);
      expect(result.before).toBeUndefined();
      expect(result.after).toBeUndefined();
    });

    it("detects added fields", () => {
      const result = computeChanges({
        before: { name: "John" },
        after: { name: "John", phone: "123-456-7890" },
      });

      expect(result.fields).toContain("phone");
      expect(result.after?.phone).toBe("123-456-7890");
    });

    it("detects removed fields", () => {
      const result = computeChanges({
        before: { name: "John", phone: "123-456-7890" },
        after: { name: "John" },
      });

      expect(result.fields).toContain("phone");
      expect(result.before?.phone).toBe("123-456-7890");
      expect(result.after?.phone).toBeUndefined();
    });

    it("masks sensitive fields in updates", () => {
      const result = computeChanges({
        before: { password: "old_secret" },
        after: { password: "new_secret" },
        sensitiveFields: ["password"],
      });

      expect(result.fields).toContain("password");
      expect(result.before?.password).toBe("[REDACTED]");
      expect(result.after?.password).toBe("[REDACTED]");
    });

    it("handles date comparisons", () => {
      const date1 = new Date("2024-01-01T00:00:00Z");
      const date2 = new Date("2024-01-01T00:00:00Z");
      const date3 = new Date("2024-01-02T00:00:00Z");

      // Same dates
      const resultSame = computeChanges({
        before: { date: date1 },
        after: { date: date2 },
      });
      expect(resultSame.fields).toEqual([]);

      // Different dates
      const resultDiff = computeChanges({
        before: { date: date1 },
        after: { date: date3 },
      });
      expect(resultDiff.fields).toContain("date");
    });

    it("handles array comparisons", () => {
      // Same arrays
      const resultSame = computeChanges({
        before: { tags: ["a", "b"] },
        after: { tags: ["a", "b"] },
      });
      expect(resultSame.fields).toEqual([]);

      // Different arrays
      const resultDiff = computeChanges({
        before: { tags: ["a", "b"] },
        after: { tags: ["a", "b", "c"] },
      });
      expect(resultDiff.fields).toContain("tags");
    });

    it("handles nested object comparisons", () => {
      // Same nested objects
      const resultSame = computeChanges({
        before: { address: { city: "NYC", zip: "10001" } },
        after: { address: { city: "NYC", zip: "10001" } },
      });
      expect(resultSame.fields).toEqual([]);

      // Different nested objects
      const resultDiff = computeChanges({
        before: { address: { city: "NYC", zip: "10001" } },
        after: { address: { city: "LA", zip: "90001" } },
      });
      expect(resultDiff.fields).toContain("address");
    });
  });

  describe("edge cases", () => {
    it("handles null values correctly", () => {
      const result = computeChanges({
        before: { name: "John", nickname: null },
        after: { name: "John", nickname: "Johnny" },
      });

      expect(result.fields).toContain("nickname");
    });

    it("handles undefined values correctly", () => {
      const result = computeChanges({
        before: { name: "John" },
        after: { name: "John", nickname: undefined },
      });

      // undefined to undefined should not show as change
      expect(result.fields).not.toContain("nickname");
    });

    it("returns empty changes when both before and after are null", () => {
      const result = computeChanges({
        before: null,
        after: null,
      });

      expect(result.fields).toEqual([]);
    });
  });
});

describe("ActivityLogger", () => {
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockValues = vi.fn(() => Promise.resolve());
    mockInsert = vi.fn(() => ({ values: mockValues }));
    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createActivityLogger", () => {
    it("creates an ActivityLogger instance with context", () => {
      const logger = createActivityLogger(mockContext);
      expect(logger).toBeInstanceOf(ActivityLogger);
    });
  });

  describe("log()", () => {
    it("logs activity with all context fields", async () => {
      const logger = createActivityLogger(mockContext);

      await logger.log({
        entityType: "customer",
        entityId: "770e8400-e29b-41d4-a716-446655440002",
        action: "created",
        description: "Customer created",
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockContext.organizationId,
          userId: mockContext.userId,
          entityType: "customer",
          entityId: "770e8400-e29b-41d4-a716-446655440002",
          action: "created",
          ipAddress: mockContext.ipAddress,
          userAgent: mockContext.userAgent,
          description: "Customer created",
        })
      );
    });

    it("includes requestId in metadata when provided", async () => {
      const logger = createActivityLogger(mockContext);

      await logger.log({
        entityType: "order",
        entityId: "770e8400-e29b-41d4-a716-446655440003",
        action: "updated",
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            requestId: "req_test_123",
          }),
        })
      );
    });

    it("handles null userId for system actions", async () => {
      const systemContext: ActivityContext = {
        organizationId: mockContext.organizationId,
        userId: null,
      };
      const logger = createActivityLogger(systemContext);

      await logger.log({
        entityType: "customer",
        entityId: "770e8400-e29b-41d4-a716-446655440004",
        action: "exported",
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          createdBy: null,
        })
      );
    });

    it("does not throw on database error", async () => {
      const logger = createActivityLogger(mockContext);
      mockValues.mockRejectedValueOnce(new Error("Database error"));

      // Should not throw
      await expect(
        logger.log({
          entityType: "customer",
          entityId: "770e8400-e29b-41d4-a716-446655440005",
          action: "deleted",
        })
      ).resolves.toBeUndefined();
    });

    it("logs error to console on failure", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = createActivityLogger(mockContext);
      mockValues.mockRejectedValueOnce(new Error("Database error"));

      await logger.log({
        entityType: "customer",
        entityId: "770e8400-e29b-41d4-a716-446655440006",
        action: "deleted",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ActivityLogger] Failed to log activity:",
        expect.any(Error),
        expect.objectContaining({
          entityType: "customer",
          action: "deleted",
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("logAsync()", () => {
    it("queues activity for async logging", async () => {
      const logger = createActivityLogger(mockContext);

      logger.logAsync({
        entityType: "product",
        entityId: "770e8400-e29b-41d4-a716-446655440007",
        action: "viewed",
      });

      // Wait for async operation
      await logger.flush();

      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("flush()", () => {
    it("waits for all queued activities to complete", async () => {
      const logger = createActivityLogger(mockContext);
      let callCount = 0;
      mockValues.mockImplementation(() => {
        callCount++;
        return Promise.resolve();
      });

      // Queue multiple activities
      logger.logAsync({
        entityType: "customer",
        entityId: "770e8400-e29b-41d4-a716-446655440008",
        action: "created",
      });
      logger.logAsync({
        entityType: "customer",
        entityId: "770e8400-e29b-41d4-a716-446655440009",
        action: "updated",
      });

      await logger.flush();

      expect(callCount).toBe(2);
    });

    it("handles mixed success and failure in queue", async () => {
      const logger = createActivityLogger(mockContext);
      mockValues
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce(undefined);

      vi.spyOn(console, "error").mockImplementation(() => {});

      logger.logAsync({
        entityType: "customer",
        entityId: "id1",
        action: "created",
      });
      logger.logAsync({
        entityType: "customer",
        entityId: "id2",
        action: "updated",
      });
      logger.logAsync({
        entityType: "customer",
        entityId: "id3",
        action: "deleted",
      });

      // Should not throw even with failures
      await expect(logger.flush()).resolves.toBeUndefined();
    });
  });

  describe("logCreate()", () => {
    it("logs create action with computed changes", async () => {
      const logger = createActivityLogger(mockContext);

      await logger.logCreate(
        "customer",
        "770e8400-e29b-41d4-a716-446655440010",
        { name: "John", email: "john@example.com" },
        { description: "New customer created" }
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "created",
          changes: expect.objectContaining({
            fields: expect.arrayContaining(["name", "email"]),
          }),
          description: "New customer created",
        })
      );
    });

    it("excludes specified fields", async () => {
      const logger = createActivityLogger(mockContext);

      await logger.logCreate(
        "customer",
        "770e8400-e29b-41d4-a716-446655440011",
        { name: "John", updatedAt: new Date() },
        { excludeFields: ["updatedAt"] }
      );

      const callArg = mockValues.mock.calls[0][0];
      expect(callArg.changes.fields).not.toContain("updatedAt");
    });
  });

  describe("logUpdate()", () => {
    it("logs update action with changed fields only", async () => {
      const logger = createActivityLogger(mockContext);

      await logger.logUpdate(
        "customer",
        "770e8400-e29b-41d4-a716-446655440012",
        { name: "John", email: "john@example.com" },
        { name: "John Doe", email: "john@example.com" },
        { description: "Name updated" }
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "updated",
          changes: expect.objectContaining({
            before: { name: "John" },
            after: { name: "John Doe" },
            fields: ["name"],
          }),
        })
      );
    });

    it("does not log when no fields changed", async () => {
      const logger = createActivityLogger(mockContext);

      await logger.logUpdate(
        "customer",
        "770e8400-e29b-41d4-a716-446655440013",
        { name: "John", email: "john@example.com" },
        { name: "John", email: "john@example.com" }
      );

      // Should not insert if no changes
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("logDelete()", () => {
    it("logs delete action with entity snapshot", async () => {
      const logger = createActivityLogger(mockContext);

      await logger.logDelete(
        "customer",
        "770e8400-e29b-41d4-a716-446655440014",
        { name: "John", email: "john@example.com" },
        { description: "Customer deleted" }
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "deleted",
          changes: expect.objectContaining({
            before: expect.objectContaining({ name: "John" }),
          }),
        })
      );
    });
  });
});
