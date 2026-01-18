/**
 * Permission Integration Tests
 *
 * Tests for role-based access control and permission enforcement.
 * These tests verify that the permission matrix is correctly enforced
 * by the withAuth helper and related utilities.
 *
 * Note: These are "integration" tests in the sense that they test
 * multiple units working together (permissions + roles + hasPermission).
 * Full server function integration would require mocking TanStack Start context.
 */

import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermittedActions,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type Role,
} from "@/lib/auth/permissions";

describe("Permission Integration Tests", () => {
  describe("Viewer role restrictions", () => {
    const viewerRole: Role = "viewer";

    it("viewer cannot perform customer mutations", () => {
      expect(hasPermission(viewerRole, PERMISSIONS.customer.create)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.customer.update)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.customer.delete)).toBe(false);
    });

    it("viewer can read customers", () => {
      expect(hasPermission(viewerRole, PERMISSIONS.customer.read)).toBe(true);
    });

    it("viewer cannot perform order mutations", () => {
      expect(hasPermission(viewerRole, PERMISSIONS.order.create)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.order.update)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.order.fulfill)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.order.cancel)).toBe(false);
    });

    it("viewer cannot manage users", () => {
      expect(hasPermission(viewerRole, PERMISSIONS.user.invite)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.user.deactivate)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.user.changeRole)).toBe(false);
    });

    it("viewer cannot access financial reports", () => {
      expect(hasPermission(viewerRole, PERMISSIONS.report.viewFinancial)).toBe(
        false
      );
    });

    it("viewer cannot manage API tokens", () => {
      expect(hasPermission(viewerRole, PERMISSIONS.apiToken.create)).toBe(false);
      expect(hasPermission(viewerRole, PERMISSIONS.apiToken.revoke)).toBe(false);
    });
  });

  describe("Operations role restrictions (similar to warehouse)", () => {
    const operationsRole: Role = "operations";

    it("operations can manage inventory", () => {
      expect(hasPermission(operationsRole, PERMISSIONS.inventory.read)).toBe(true);
      expect(hasPermission(operationsRole, PERMISSIONS.inventory.adjust)).toBe(
        true
      );
      expect(hasPermission(operationsRole, PERMISSIONS.inventory.transfer)).toBe(
        true
      );
      expect(hasPermission(operationsRole, PERMISSIONS.inventory.receive)).toBe(
        true
      );
    });

    it("operations cannot access financial reports", () => {
      expect(hasPermission(operationsRole, PERMISSIONS.report.viewFinancial)).toBe(
        false
      );
    });

    it("operations cannot manage organization settings", () => {
      expect(hasPermission(operationsRole, PERMISSIONS.organization.update)).toBe(
        false
      );
      expect(
        hasPermission(operationsRole, PERMISSIONS.organization.manageBilling)
      ).toBe(false);
    });

    it("operations cannot manage users", () => {
      expect(hasPermission(operationsRole, PERMISSIONS.user.invite)).toBe(false);
      expect(hasPermission(operationsRole, PERMISSIONS.user.changeRole)).toBe(
        false
      );
    });
  });

  describe("Admin role full access", () => {
    const adminRole: Role = "admin";

    it("admin has full customer access", () => {
      expect(hasPermission(adminRole, PERMISSIONS.customer.create)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.customer.read)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.customer.update)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.customer.delete)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.customer.export)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.customer.import)).toBe(true);
    });

    it("admin has full order access", () => {
      expect(hasPermission(adminRole, PERMISSIONS.order.create)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.order.read)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.order.update)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.order.delete)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.order.fulfill)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.order.cancel)).toBe(true);
    });

    it("admin can manage users", () => {
      expect(hasPermission(adminRole, PERMISSIONS.user.read)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.user.invite)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.user.update)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.user.deactivate)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.user.changeRole)).toBe(true);
    });

    it("admin can view all reports", () => {
      expect(hasPermission(adminRole, PERMISSIONS.report.viewSales)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.report.viewFinancial)).toBe(
        true
      );
      expect(hasPermission(adminRole, PERMISSIONS.report.viewOperations)).toBe(
        true
      );
      expect(hasPermission(adminRole, PERMISSIONS.report.export)).toBe(true);
    });

    it("admin can manage API tokens", () => {
      expect(hasPermission(adminRole, PERMISSIONS.apiToken.create)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.apiToken.read)).toBe(true);
      expect(hasPermission(adminRole, PERMISSIONS.apiToken.revoke)).toBe(true);
    });

    it("admin cannot manage billing (owner only)", () => {
      expect(hasPermission(adminRole, PERMISSIONS.organization.manageBilling)).toBe(
        false
      );
    });
  });

  describe("Owner role supremacy", () => {
    const ownerRole: Role = "owner";

    it("owner has every permission", () => {
      // Check that owner has all defined permissions
      const allPermissions = Object.values(PERMISSIONS).flatMap((domain) =>
        Object.values(domain)
      );

      for (const permission of allPermissions) {
        expect(hasPermission(ownerRole, permission)).toBe(true);
      }
    });

    it("owner can manage billing", () => {
      expect(hasPermission(ownerRole, PERMISSIONS.organization.manageBilling)).toBe(
        true
      );
    });
  });

  describe("Sales role capabilities", () => {
    const salesRole: Role = "sales";

    it("sales can manage customers", () => {
      expect(hasPermission(salesRole, PERMISSIONS.customer.create)).toBe(true);
      expect(hasPermission(salesRole, PERMISSIONS.customer.read)).toBe(true);
      expect(hasPermission(salesRole, PERMISSIONS.customer.update)).toBe(true);
    });

    it("sales can manage opportunities", () => {
      expect(hasPermission(salesRole, PERMISSIONS.opportunity.create)).toBe(true);
      expect(hasPermission(salesRole, PERMISSIONS.opportunity.read)).toBe(true);
      expect(hasPermission(salesRole, PERMISSIONS.opportunity.update)).toBe(true);
    });

    it("sales can manage quotes", () => {
      expect(hasPermission(salesRole, PERMISSIONS.quote.create)).toBe(true);
      expect(hasPermission(salesRole, PERMISSIONS.quote.read)).toBe(true);
      expect(hasPermission(salesRole, PERMISSIONS.quote.send)).toBe(true);
    });

    it("sales can view sales reports", () => {
      expect(hasPermission(salesRole, PERMISSIONS.report.viewSales)).toBe(true);
    });

    it("sales cannot manage organization", () => {
      expect(hasPermission(salesRole, PERMISSIONS.organization.update)).toBe(false);
      expect(hasPermission(salesRole, PERMISSIONS.organization.manageBilling)).toBe(
        false
      );
    });
  });

  describe("Multiple permission checks", () => {
    it("hasAnyPermission returns true if any permission matches", () => {
      const viewerRole: Role = "viewer";
      expect(
        hasAnyPermission(viewerRole, [
          PERMISSIONS.customer.create, // false
          PERMISSIONS.customer.read, // true
          PERMISSIONS.customer.delete, // false
        ])
      ).toBe(true);
    });

    it("hasAnyPermission returns false if no permission matches", () => {
      const viewerRole: Role = "viewer";
      expect(
        hasAnyPermission(viewerRole, [
          PERMISSIONS.customer.create,
          PERMISSIONS.customer.update,
          PERMISSIONS.customer.delete,
        ])
      ).toBe(false);
    });

    it("hasAllPermissions returns true if all permissions match", () => {
      const adminRole: Role = "admin";
      expect(
        hasAllPermissions(adminRole, [
          PERMISSIONS.customer.create,
          PERMISSIONS.customer.read,
          PERMISSIONS.customer.update,
        ])
      ).toBe(true);
    });

    it("hasAllPermissions returns false if any permission is missing", () => {
      const salesRole: Role = "sales";
      expect(
        hasAllPermissions(salesRole, [
          PERMISSIONS.customer.create, // true
          PERMISSIONS.user.changeRole, // false for sales
        ])
      ).toBe(false);
    });
  });

  describe("getPermittedActions", () => {
    it("returns all actions for owner role", () => {
      const ownerActions = getPermittedActions("owner");
      expect(ownerActions.length).toBeGreaterThan(40); // We defined 40+ permissions
    });

    it("returns limited actions for viewer role", () => {
      const viewerActions = getPermittedActions("viewer");
      // Viewer should only have read permissions
      expect(viewerActions.every((action) => action.includes(".read"))).toBe(true);
    });

    it("admin has more permissions than manager", () => {
      const adminActions = getPermittedActions("admin");
      const managerActions = getPermittedActions("manager");
      expect(adminActions.length).toBeGreaterThan(managerActions.length);
    });
  });

  describe("Role hierarchy consistency", () => {
    const roles: Role[] = [
      "owner",
      "admin",
      "manager",
      "sales",
      "operations",
      "support",
      "viewer",
    ];

    it("all roles are defined in ROLE_PERMISSIONS", () => {
      for (const role of roles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      }
    });

    it("owner has equal or more permissions than any other role", () => {
      const ownerPermCount = ROLE_PERMISSIONS.owner.length;
      for (const role of roles) {
        expect(ownerPermCount).toBeGreaterThanOrEqual(ROLE_PERMISSIONS[role].length);
      }
    });
  });
});
