/**
 * API Token Integration Tests
 *
 * Tests for API token validation, scope checking, and lifecycle.
 * Tests the integration between token schema validation, scope permissions,
 * and token context utilities.
 */

import { describe, it, expect } from "vitest";
import {
  createApiTokenSchema,
  validateApiTokenSchema,
  API_TOKEN_SCOPES,
  type ApiTokenScope,
} from "@/lib/schemas/api-tokens";
import { scopeIncludesPermission } from "@/lib/server/api-tokens";

describe("API Token Integration Tests", () => {
  describe("Token with read scope cannot perform writes", () => {
    const readOnlyScopes: ApiTokenScope[] = ["read"];

    it("read scope grants read permission", () => {
      expect(scopeIncludesPermission(readOnlyScopes, "read")).toBe(true);
    });

    it("read scope denies write permission", () => {
      expect(scopeIncludesPermission(readOnlyScopes, "write")).toBe(false);
    });

    it("read scope denies admin permission", () => {
      expect(scopeIncludesPermission(readOnlyScopes, "admin")).toBe(false);
    });
  });

  describe("Token with write scope includes read", () => {
    const writeScopes: ApiTokenScope[] = ["write"];

    it("write scope grants read permission (implicit)", () => {
      expect(scopeIncludesPermission(writeScopes, "read")).toBe(true);
    });

    it("write scope grants write permission", () => {
      expect(scopeIncludesPermission(writeScopes, "write")).toBe(true);
    });

    it("write scope denies admin permission", () => {
      expect(scopeIncludesPermission(writeScopes, "admin")).toBe(false);
    });
  });

  describe("Token with admin scope has full access", () => {
    const adminScopes: ApiTokenScope[] = ["admin"];

    it("admin scope grants all permissions", () => {
      expect(scopeIncludesPermission(adminScopes, "read")).toBe(true);
      expect(scopeIncludesPermission(adminScopes, "write")).toBe(true);
      expect(scopeIncludesPermission(adminScopes, "admin")).toBe(true);
    });
  });

  describe("Expired token validation", () => {
    it("accepts token creation with future expiration", () => {
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      const input = {
        name: "Valid Token",
        scopes: ["read"] as ApiTokenScope[],
        expiresAt: futureDate.toISOString(),
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts token creation with past expiration (validation only checks format)", () => {
      // Note: Schema validates format, not business logic (expiration check at runtime)
      const pastDate = new Date(Date.now() - 86400000); // -1 day
      const input = {
        name: "Expired Token",
        scopes: ["read"] as ApiTokenScope[],
        expiresAt: pastDate.toISOString(),
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
      // Runtime validation would reject expired tokens
    });

    it("accepts never-expiring tokens with null expiration", () => {
      const input = {
        name: "Permanent Token",
        scopes: ["admin"] as ApiTokenScope[],
        expiresAt: null,
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("Token format validation", () => {
    it("validates correct token format (renoz_ prefix)", () => {
      const validTokens = [
        "renoz_SGVsbG8gV29ybGQh",
        "renoz_YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=",
        "renoz_MTIzNDU2Nzg5MA==",
      ];

      for (const token of validTokens) {
        const result = validateApiTokenSchema.safeParse({ token });
        expect(result.success).toBe(true);
      }
    });

    it("rejects tokens without renoz_ prefix", () => {
      const invalidTokens = [
        "invalid_SGVsbG8gV29ybGQh",
        "reno_SGVsbG8gV29ybGQh", // missing z
        "RENOZ_SGVsbG8gV29ybGQh", // uppercase
        "SGVsbG8gV29ybGQh", // no prefix
        "",
      ];

      for (const token of invalidTokens) {
        const result = validateApiTokenSchema.safeParse({ token });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("Scope combinations", () => {
    it("multiple scopes can be combined", () => {
      const input = {
        name: "Multi-scope Token",
        scopes: ["read", "write"] as ApiTokenScope[],
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scopes).toContain("read");
        expect(result.data.scopes).toContain("write");
      }
    });

    it("combined scopes grant cumulative permissions", () => {
      const scopes: ApiTokenScope[] = ["read", "write"];

      expect(scopeIncludesPermission(scopes, "read")).toBe(true);
      expect(scopeIncludesPermission(scopes, "write")).toBe(true);
      expect(scopeIncludesPermission(scopes, "admin")).toBe(false);
    });

    it("empty scopes deny all permissions", () => {
      const emptyScopes: ApiTokenScope[] = [];

      expect(scopeIncludesPermission(emptyScopes, "read")).toBe(false);
      expect(scopeIncludesPermission(emptyScopes, "write")).toBe(false);
      expect(scopeIncludesPermission(emptyScopes, "admin")).toBe(false);
    });

    it("schema requires at least one scope", () => {
      const input = {
        name: "No Scope Token",
        scopes: [] as ApiTokenScope[],
      };

      const result = createApiTokenSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("API Token Scope Enum", () => {
    it("defines exactly 3 scopes", () => {
      expect(API_TOKEN_SCOPES).toHaveLength(3);
    });

    it("scopes match canonical enum values", () => {
      // From canonical-enums.json#/enums/apiTokenScope
      expect(API_TOKEN_SCOPES).toContain("read");
      expect(API_TOKEN_SCOPES).toContain("write");
      expect(API_TOKEN_SCOPES).toContain("admin");
    });

    it("scope hierarchy is enforced correctly", () => {
      // read < write < admin
      expect(scopeIncludesPermission(["read"], "read")).toBe(true);
      expect(scopeIncludesPermission(["read"], "write")).toBe(false);
      expect(scopeIncludesPermission(["read"], "admin")).toBe(false);

      expect(scopeIncludesPermission(["write"], "read")).toBe(true);
      expect(scopeIncludesPermission(["write"], "write")).toBe(true);
      expect(scopeIncludesPermission(["write"], "admin")).toBe(false);

      expect(scopeIncludesPermission(["admin"], "read")).toBe(true);
      expect(scopeIncludesPermission(["admin"], "write")).toBe(true);
      expect(scopeIncludesPermission(["admin"], "admin")).toBe(true);
    });
  });
});
