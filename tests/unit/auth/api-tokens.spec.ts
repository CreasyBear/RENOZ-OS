/**
 * API Token Unit Tests
 *
 * Tests for API token schema validation and helper functions.
 * Note: Full integration tests require database and auth mocking.
 */

import { describe, it, expect } from "vitest";
import {
  createApiTokenSchema,
  revokeApiTokenSchema,
  validateApiTokenSchema,
  API_TOKEN_SCOPES,
  type ApiTokenScope,
} from "@/lib/schemas/api-tokens";
import { scopeIncludesPermission } from "@/lib/server/api-tokens";

describe("API Token Schemas", () => {
  describe("createApiTokenSchema", () => {
    it("should validate valid token creation input", () => {
      const input = {
        name: "CI/CD Pipeline",
        scopes: ["read", "write"] as ApiTokenScope[],
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("CI/CD Pipeline");
        expect(result.data.scopes).toEqual(["read", "write"]);
      }
    });

    it("should use default scope of read if not provided", () => {
      const input = {
        name: "My Token",
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scopes).toEqual(["read"]);
      }
    });

    it("should reject empty name", () => {
      const input = {
        name: "",
        scopes: ["read"] as ApiTokenScope[],
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject name over 100 characters", () => {
      const input = {
        name: "a".repeat(101),
        scopes: ["read"] as ApiTokenScope[],
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid scope", () => {
      const input = {
        name: "Test Token",
        scopes: ["invalid_scope"],
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept optional expiration date", () => {
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      const input = {
        name: "Expiring Token",
        scopes: ["read"] as ApiTokenScope[],
        expiresAt: futureDate.toISOString(),
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresAt).toBeInstanceOf(Date);
      }
    });

    it("should accept null expiration for never-expiring tokens", () => {
      const input = {
        name: "Permanent Token",
        scopes: ["admin"] as ApiTokenScope[],
        expiresAt: null,
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresAt).toBeNull();
      }
    });
  });

  describe("revokeApiTokenSchema", () => {
    it("should validate valid revoke input", () => {
      const input = {
        tokenId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "Security concern",
      };

      const result = revokeApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept revoke without reason", () => {
      const input = {
        tokenId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = revokeApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const input = {
        tokenId: "not-a-uuid",
      };

      const result = revokeApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject reason over 500 characters", () => {
      const input = {
        tokenId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "a".repeat(501),
      };

      const result = revokeApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("validateApiTokenSchema", () => {
    it("should validate correct token format", () => {
      const input = {
        token: "renoz_SGVsbG8gV29ybGQh",
      };

      const result = validateApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject token without renoz_ prefix", () => {
      const input = {
        token: "invalid_SGVsbG8gV29ybGQh",
      };

      const result = validateApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty token", () => {
      const input = {
        token: "",
      };

      const result = validateApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("API_TOKEN_SCOPES", () => {
    it("should contain all valid scopes", () => {
      expect(API_TOKEN_SCOPES).toContain("read");
      expect(API_TOKEN_SCOPES).toContain("write");
      expect(API_TOKEN_SCOPES).toContain("admin");
      expect(API_TOKEN_SCOPES).toHaveLength(3);
    });
  });
});

describe("Scope Permission Helpers", () => {
  describe("scopeIncludesPermission", () => {
    it("should grant read when scopes include read", () => {
      expect(scopeIncludesPermission(["read"], "read")).toBe(true);
    });

    it("should deny write when scopes only include read", () => {
      expect(scopeIncludesPermission(["read"], "write")).toBe(false);
    });

    it("should grant read when scopes include write", () => {
      expect(scopeIncludesPermission(["write"], "read")).toBe(true);
    });

    it("should grant write when scopes include write", () => {
      expect(scopeIncludesPermission(["write"], "write")).toBe(true);
    });

    it("should deny admin when scopes only include write", () => {
      expect(scopeIncludesPermission(["write"], "admin")).toBe(false);
    });

    it("should grant all permissions when scopes include admin", () => {
      expect(scopeIncludesPermission(["admin"], "read")).toBe(true);
      expect(scopeIncludesPermission(["admin"], "write")).toBe(true);
      expect(scopeIncludesPermission(["admin"], "admin")).toBe(true);
    });

    it("should work with multiple scopes", () => {
      expect(scopeIncludesPermission(["read", "write"], "read")).toBe(true);
      expect(scopeIncludesPermission(["read", "write"], "write")).toBe(true);
      expect(scopeIncludesPermission(["read", "write"], "admin")).toBe(false);
    });

    it("should deny when no matching scope", () => {
      expect(scopeIncludesPermission([], "read")).toBe(false);
    });
  });
});
