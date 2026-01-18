/**
 * Activity Logging Integration Tests
 *
 * Tests the complete activity logging flow including:
 * - ActivityLogger integration with context middleware
 * - Change computation for various scenarios
 * - Permission requirements for activity operations
 *
 * Note: These tests verify the integration of ActivityLogger with
 * ActivityContext middleware and the permission system. Full database
 * integration tests would require a test database setup.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    })),
  },
}));

import {
  ActivityLogger,
  createActivityLogger,
  computeChanges,
  type ActivityContext,
} from "@/lib/activity-logger";
import {
  buildActivityContext,
  getClientIpAddress,
  getUserAgent,
  createActivityLoggerWithContext,
  createSystemActivityLogger,
} from "@/server/middleware/activity-context";
import { hasPermission, PERMISSIONS, type Role } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

// Test fixtures
const mockOrganizationId = "550e8400-e29b-41d4-a716-446655440000";
const mockUserId = "660e8400-e29b-41d4-a716-446655440001";
const mockEntityId = "770e8400-e29b-41d4-a716-446655440002";

describe("Activity Logging Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Context Middleware Integration", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18",
        },
      });

      const ip = getClientIpAddress(request);
      expect(ip).toBe("203.0.113.195");
    });

    it("extracts IP from cf-connecting-ip header (Cloudflare)", () => {
      const request = new Request("http://example.com", {
        headers: {
          "cf-connecting-ip": "203.0.113.100",
        },
      });

      const ip = getClientIpAddress(request);
      expect(ip).toBe("203.0.113.100");
    });

    it("extracts user agent from request", () => {
      const request = new Request("http://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        },
      });

      const userAgent = getUserAgent(request);
      expect(userAgent).toBe("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    });

    it("builds activity context from session", () => {
      const mockSession = {
        user: { id: mockUserId },
        organizationId: mockOrganizationId,
      };

      const mockRequest = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "user-agent": "Test Agent",
        },
      });

      const context = buildActivityContext(mockSession, mockRequest);

      expect(context.organizationId).toBe(mockOrganizationId);
      expect(context.userId).toBe(mockUserId);
      expect(context.ipAddress).toBe("192.168.1.1");
      expect(context.userAgent).toBe("Test Agent");
    });

    it("creates logger with full context from session", () => {
      const mockSession = {
        user: { id: mockUserId },
        organizationId: mockOrganizationId,
      };

      const mockRequest = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "10.0.0.1",
          "user-agent": "Integration Test",
        },
      });

      const logger = createActivityLoggerWithContext(mockSession, mockRequest);
      expect(logger).toBeInstanceOf(ActivityLogger);
    });

    it("creates system logger without user context", () => {
      const logger = createSystemActivityLogger(mockOrganizationId, {
        source: "cron-job",
        requestId: "cron_123",
      });

      expect(logger).toBeInstanceOf(ActivityLogger);
    });
  });

  describe("ActivityLogger with Middleware Context", () => {
    it("logs activity with full context chain", async () => {
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      }));
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      // Simulate full context chain
      const mockSession = {
        user: { id: mockUserId },
        organizationId: mockOrganizationId,
      };

      const mockRequest = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.100",
          "user-agent": "Mozilla/5.0 Test",
        },
      });

      const context = buildActivityContext(mockSession, mockRequest);
      const logger = createActivityLogger(context);

      await logger.log({
        entityType: "customer",
        entityId: mockEntityId,
        action: "created",
        description: "Customer created via integration test",
      });

      expect(mockInsert).toHaveBeenCalled();
    });

    it("handles async logging workflow", async () => {
      const mockValues = vi.fn(() => Promise.resolve());
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const context: ActivityContext = {
        organizationId: mockOrganizationId,
        userId: mockUserId,
      };

      const logger = createActivityLogger(context);

      // Simulate typical async logging workflow
      logger.logAsync({
        entityType: "order",
        entityId: mockEntityId,
        action: "created",
      });

      logger.logAsync({
        entityType: "order",
        entityId: mockEntityId,
        action: "updated",
        changes: computeChanges({
          before: { status: "draft" },
          after: { status: "confirmed" },
        }),
      });

      // Flush at request end
      await logger.flush();

      expect(mockValues).toHaveBeenCalledTimes(2);
    });
  });

  describe("CRUD Operation Logging Patterns", () => {
    let logger: ActivityLogger;
    let mockValues: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockValues = vi.fn(() => Promise.resolve());
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        values: mockValues,
      }));

      logger = createActivityLogger({
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    it("logs create with full entity snapshot", async () => {
      const newCustomer = {
        id: mockEntityId,
        name: "Acme Corp",
        email: "contact@acme.com",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await logger.logCreate("customer", mockEntityId, newCustomer, {
        description: "New customer created",
        excludeFields: ["createdAt", "updatedAt"],
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "customer",
          entityId: mockEntityId,
          action: "created",
          description: "New customer created",
        })
      );

      // Verify excluded fields not in changes
      const callArg = mockValues.mock.calls[0][0];
      expect(callArg.changes.fields).not.toContain("createdAt");
      expect(callArg.changes.fields).not.toContain("updatedAt");
    });

    it("logs update with diff only", async () => {
      const before = {
        id: mockEntityId,
        name: "Acme Corp",
        email: "old@acme.com",
        status: "active",
      };

      const after = {
        id: mockEntityId,
        name: "Acme Corp",
        email: "new@acme.com",
        status: "active",
      };

      await logger.logUpdate("customer", mockEntityId, before, after);

      const callArg = mockValues.mock.calls[0][0];
      expect(callArg.changes.fields).toEqual(["email"]);
      expect(callArg.changes.before).toEqual({ email: "old@acme.com" });
      expect(callArg.changes.after).toEqual({ email: "new@acme.com" });
    });

    it("logs delete with final state snapshot", async () => {
      const deletedCustomer = {
        id: mockEntityId,
        name: "Acme Corp",
        email: "contact@acme.com",
        deletedAt: new Date(),
      };

      await logger.logDelete("customer", mockEntityId, deletedCustomer, {
        description: "Customer deleted by admin",
        excludeFields: ["deletedAt"],
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "deleted",
          description: "Customer deleted by admin",
        })
      );
    });
  });

  describe("Permission Integration", () => {
    describe("Activity read permissions", () => {
      it("owner can read activities", () => {
        expect(hasPermission("owner", PERMISSIONS.activity.read)).toBe(true);
      });

      it("admin can read activities", () => {
        expect(hasPermission("admin", PERMISSIONS.activity.read)).toBe(true);
      });

      it("manager can read activities", () => {
        expect(hasPermission("manager", PERMISSIONS.activity.read)).toBe(true);
      });

      it("sales cannot read activities", () => {
        expect(hasPermission("sales", PERMISSIONS.activity.read)).toBe(false);
      });

      it("operations cannot read activities", () => {
        expect(hasPermission("operations", PERMISSIONS.activity.read)).toBe(false);
      });

      it("viewer cannot read activities", () => {
        expect(hasPermission("viewer", PERMISSIONS.activity.read)).toBe(false);
      });
    });

    describe("Activity export permissions", () => {
      it("owner can export activities", () => {
        expect(hasPermission("owner", PERMISSIONS.activity.export)).toBe(true);
      });

      it("admin can export activities", () => {
        expect(hasPermission("admin", PERMISSIONS.activity.export)).toBe(true);
      });

      it("manager cannot export activities", () => {
        expect(hasPermission("manager", PERMISSIONS.activity.export)).toBe(false);
      });

      it("viewer cannot export activities", () => {
        expect(hasPermission("viewer", PERMISSIONS.activity.export)).toBe(false);
      });
    });

    describe("Permission matrix validation", () => {
      const rolesWithActivityRead: Role[] = ["owner", "admin", "manager"];
      const rolesWithoutActivityRead: Role[] = ["sales", "operations", "support", "viewer"];

      it("correct roles have activity.read permission", () => {
        for (const role of rolesWithActivityRead) {
          expect(hasPermission(role, PERMISSIONS.activity.read)).toBe(true);
        }
      });

      it("other roles do not have activity.read permission", () => {
        for (const role of rolesWithoutActivityRead) {
          expect(hasPermission(role, PERMISSIONS.activity.read)).toBe(false);
        }
      });
    });
  });

  describe("Change Computation Edge Cases", () => {
    it("handles complex nested object changes", () => {
      const before = {
        metadata: {
          preferences: {
            theme: "dark",
            language: "en",
          },
          lastLogin: new Date("2024-01-01"),
        },
      };

      const after = {
        metadata: {
          preferences: {
            theme: "light",
            language: "en",
          },
          lastLogin: new Date("2024-01-01"),
        },
      };

      const changes = computeChanges({ before, after });
      expect(changes.fields).toContain("metadata");
    });

    it("handles array field changes correctly", () => {
      const before = { tags: ["important", "vip"] };
      const after = { tags: ["important", "vip", "enterprise"] };

      const changes = computeChanges({ before, after });
      expect(changes.fields).toContain("tags");
    });

    it("handles null to value transitions", () => {
      const before = { phone: null };
      const after = { phone: "123-456-7890" };

      const changes = computeChanges({ before, after });
      expect(changes.fields).toContain("phone");
    });

    it("handles value to null transitions", () => {
      const before = { phone: "123-456-7890" };
      const after = { phone: null };

      const changes = computeChanges({ before, after });
      expect(changes.fields).toContain("phone");
    });

    it("masks multiple sensitive fields", () => {
      const before = { ssn: "123-45-6789", password: "old", name: "John" };
      const after = { ssn: "123-45-6789", password: "new", name: "John Doe" };

      const changes = computeChanges({
        before,
        after,
        sensitiveFields: ["ssn", "password"],
      });

      // Password changed, SSN did not
      expect(changes.fields).toContain("password");
      expect(changes.fields).toContain("name");
      expect(changes.fields).not.toContain("ssn");

      // Password should be redacted in changes
      expect(changes.before?.password).toBe("[REDACTED]");
      expect(changes.after?.password).toBe("[REDACTED]");

      // Name should be visible
      expect(changes.before?.name).toBe("John");
      expect(changes.after?.name).toBe("John Doe");
    });
  });
});
