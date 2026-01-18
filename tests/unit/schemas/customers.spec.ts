/**
 * Tests for Customer Zod Schemas
 *
 * Validates customer domain input/output schemas for proper validation,
 * defaults, and error handling.
 */

import { describe, it, expect } from "vitest";
import {
  customerStatusSchema,
  customerTypeSchema,
  customerSizeSchema,
  addressTypeSchema,
  customerActivityTypeSchema,
  activityDirectionSchema,
  customerPriorityLevelSchema,
  serviceLevelSchema,
  createCustomerSchema,
  updateCustomerSchema,
  customerFilterSchema,
  customerListQuerySchema,
  createContactSchema,
  updateContactSchema,
  createAddressSchema,
  createCustomerActivitySchema,
} from "@/lib/schemas/customers";

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

describe("Customer Enum Schemas", () => {
  describe("customerStatusSchema", () => {
    it("accepts valid statuses", () => {
      expect(customerStatusSchema.parse("active")).toBe("active");
      expect(customerStatusSchema.parse("prospect")).toBe("prospect");
      expect(customerStatusSchema.parse("inactive")).toBe("inactive");
      expect(customerStatusSchema.parse("suspended")).toBe("suspended");
      expect(customerStatusSchema.parse("blacklisted")).toBe("blacklisted");
    });

    it("rejects invalid status", () => {
      expect(customerStatusSchema.safeParse("invalid").success).toBe(false);
      expect(customerStatusSchema.safeParse("").success).toBe(false);
      expect(customerStatusSchema.safeParse(null).success).toBe(false);
    });
  });

  describe("customerTypeSchema", () => {
    it("accepts valid types", () => {
      expect(customerTypeSchema.parse("individual")).toBe("individual");
      expect(customerTypeSchema.parse("business")).toBe("business");
      expect(customerTypeSchema.parse("government")).toBe("government");
      expect(customerTypeSchema.parse("non_profit")).toBe("non_profit");
    });

    it("rejects invalid type", () => {
      expect(customerTypeSchema.safeParse("company").success).toBe(false);
    });
  });

  describe("customerSizeSchema", () => {
    it("accepts valid sizes", () => {
      expect(customerSizeSchema.parse("micro")).toBe("micro");
      expect(customerSizeSchema.parse("small")).toBe("small");
      expect(customerSizeSchema.parse("medium")).toBe("medium");
      expect(customerSizeSchema.parse("large")).toBe("large");
      expect(customerSizeSchema.parse("enterprise")).toBe("enterprise");
    });
  });

  describe("addressTypeSchema", () => {
    it("accepts valid address types", () => {
      expect(addressTypeSchema.parse("billing")).toBe("billing");
      expect(addressTypeSchema.parse("shipping")).toBe("shipping");
      expect(addressTypeSchema.parse("service")).toBe("service");
      expect(addressTypeSchema.parse("headquarters")).toBe("headquarters");
    });
  });

  describe("customerActivityTypeSchema", () => {
    it("accepts valid activity types", () => {
      expect(customerActivityTypeSchema.parse("call")).toBe("call");
      expect(customerActivityTypeSchema.parse("email")).toBe("email");
      expect(customerActivityTypeSchema.parse("meeting")).toBe("meeting");
      expect(customerActivityTypeSchema.parse("note")).toBe("note");
      expect(customerActivityTypeSchema.parse("order")).toBe("order");
    });
  });

  describe("activityDirectionSchema", () => {
    it("accepts valid directions", () => {
      expect(activityDirectionSchema.parse("inbound")).toBe("inbound");
      expect(activityDirectionSchema.parse("outbound")).toBe("outbound");
      expect(activityDirectionSchema.parse("internal")).toBe("internal");
    });
  });

  describe("customerPriorityLevelSchema", () => {
    it("accepts valid priority levels", () => {
      expect(customerPriorityLevelSchema.parse("low")).toBe("low");
      expect(customerPriorityLevelSchema.parse("medium")).toBe("medium");
      expect(customerPriorityLevelSchema.parse("high")).toBe("high");
      expect(customerPriorityLevelSchema.parse("vip")).toBe("vip");
    });
  });

  describe("serviceLevelSchema", () => {
    it("accepts valid service levels", () => {
      expect(serviceLevelSchema.parse("standard")).toBe("standard");
      expect(serviceLevelSchema.parse("premium")).toBe("premium");
      expect(serviceLevelSchema.parse("platinum")).toBe("platinum");
    });
  });
});

// ============================================================================
// CREATE CUSTOMER SCHEMA
// ============================================================================

describe("createCustomerSchema", () => {
  const validCustomer = {
    name: "Acme Corporation",
  };

  it("accepts minimal valid customer", () => {
    const result = createCustomerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it("provides default values", () => {
    const result = createCustomerSchema.parse(validCustomer);
    expect(result.status).toBe("prospect");
    expect(result.type).toBe("business");
    expect(result.creditHold).toBe(false);
    expect(result.tags).toEqual([]);
  });

  it("accepts full valid customer", () => {
    const result = createCustomerSchema.safeParse({
      name: "Acme Corporation",
      legalName: "Acme Corporation Pty Ltd",
      email: "contact@acme.com",
      phone: "+61 2 9000 1234",
      website: "https://acme.com",
      status: "active",
      type: "business",
      size: "medium",
      industry: "Manufacturing",
      taxId: "12345678901",
      parentId: "550e8400-e29b-41d4-a716-446655440000",
      creditLimit: 50000,
      creditHold: false,
      tags: ["vip", "priority"],
      customFields: { customerId: "ABC123", notes: "Important customer" },
    });
    expect(result.success).toBe(true);
  });

  describe("name field", () => {
    it("rejects empty name", () => {
      const result = createCustomerSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("name");
      }
    });

    it("rejects name over 255 characters", () => {
      const result = createCustomerSchema.safeParse({ name: "x".repeat(256) });
      expect(result.success).toBe(false);
    });

    it("rejects missing name", () => {
      const result = createCustomerSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("email field", () => {
    it("accepts valid email", () => {
      const result = createCustomerSchema.parse({
        name: "Test",
        email: "test@example.com",
      });
      expect(result.email).toBe("test@example.com");
    });

    it("rejects invalid email", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("accepts undefined email", () => {
      const result = createCustomerSchema.parse({ name: "Test" });
      expect(result.email).toBeUndefined();
    });
  });

  describe("phone field", () => {
    it("accepts valid phone formats", () => {
      expect(
        createCustomerSchema.safeParse({ name: "Test", phone: "+61 2 9000 1234" }).success
      ).toBe(true);
      expect(
        createCustomerSchema.safeParse({ name: "Test", phone: "0412345678" }).success
      ).toBe(true);
      expect(
        createCustomerSchema.safeParse({ name: "Test", phone: "(02) 9000-1234" }).success
      ).toBe(true);
    });
  });

  describe("creditLimit field", () => {
    it("accepts positive credit limit", () => {
      const result = createCustomerSchema.parse({
        name: "Test",
        creditLimit: 10000,
      });
      expect(result.creditLimit).toBe(10000);
    });

    it("accepts zero credit limit", () => {
      const result = createCustomerSchema.parse({
        name: "Test",
        creditLimit: 0,
      });
      expect(result.creditLimit).toBe(0);
    });

    it("rejects negative credit limit", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        creditLimit: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("parentId field", () => {
    it("accepts valid UUID", () => {
      const result = createCustomerSchema.parse({
        name: "Test",
        parentId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.parentId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("rejects invalid UUID", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        parentId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("tags field", () => {
    it("accepts array of tags", () => {
      const result = createCustomerSchema.parse({
        name: "Test",
        tags: ["vip", "priority", "retail"],
      });
      expect(result.tags).toHaveLength(3);
    });

    it("rejects tags longer than 50 characters", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        tags: ["x".repeat(51)],
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 50 tags", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        tags: Array.from({ length: 51 }, (_, i) => `tag${i}`),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("customFields field", () => {
    it("accepts valid custom fields", () => {
      const result = createCustomerSchema.parse({
        name: "Test",
        customFields: {
          legacyId: "ABC123",
          priority: 1,
          isVip: true,
          notes: null,
        },
      });
      expect(result.customFields?.legacyId).toBe("ABC123");
      expect(result.customFields?.priority).toBe(1);
      expect(result.customFields?.isVip).toBe(true);
    });

    it("accepts undefined custom fields", () => {
      const result = createCustomerSchema.parse({ name: "Test" });
      expect(result.customFields).toBeUndefined();
    });
  });
});

// ============================================================================
// UPDATE CUSTOMER SCHEMA
// ============================================================================

describe("updateCustomerSchema", () => {
  it("accepts partial updates", () => {
    const result = updateCustomerSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty update (all fields optional)", () => {
    const result = updateCustomerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates fields when provided", () => {
    const result = updateCustomerSchema.safeParse({ email: "not-valid" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// CUSTOMER FILTER SCHEMA
// ============================================================================

describe("customerFilterSchema", () => {
  it("accepts empty filters", () => {
    const result = customerFilterSchema.parse({});
    expect(result.search).toBeUndefined();
    expect(result.status).toBeUndefined();
  });

  it("accepts search string", () => {
    const result = customerFilterSchema.parse({ search: "acme" });
    expect(result.search).toBe("acme");
  });

  it("accepts status filter", () => {
    const result = customerFilterSchema.parse({ status: "active" });
    expect(result.status).toBe("active");
  });

  it("accepts type filter", () => {
    const result = customerFilterSchema.parse({ type: "business" });
    expect(result.type).toBe("business");
  });

  it("accepts health score range", () => {
    const result = customerFilterSchema.parse({
      healthScoreMin: 50,
      healthScoreMax: 80,
    });
    expect(result.healthScoreMin).toBe(50);
    expect(result.healthScoreMax).toBe(80);
  });

  it("rejects health score outside 0-100", () => {
    expect(customerFilterSchema.safeParse({ healthScoreMin: -1 }).success).toBe(false);
    expect(customerFilterSchema.safeParse({ healthScoreMax: 101 }).success).toBe(false);
  });

  it("accepts tags array filter", () => {
    const result = customerFilterSchema.parse({ tags: ["vip", "priority"] });
    expect(result.tags).toHaveLength(2);
  });

  it("accepts parentId filter", () => {
    const result = customerFilterSchema.parse({
      parentId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.parentId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("accepts hasParent boolean filter", () => {
    const result = customerFilterSchema.parse({ hasParent: true });
    expect(result.hasParent).toBe(true);
  });
});

// ============================================================================
// CUSTOMER LIST QUERY SCHEMA
// ============================================================================

describe("customerListQuerySchema", () => {
  it("provides pagination defaults", () => {
    const result = customerListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortOrder).toBe("desc");
  });

  it("accepts combined filters and pagination", () => {
    const result = customerListQuerySchema.parse({
      page: 2,
      pageSize: 50,
      status: "active",
      search: "acme",
    });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
    expect(result.status).toBe("active");
    expect(result.search).toBe("acme");
  });
});

// ============================================================================
// CONTACT SCHEMA
// ============================================================================

describe("createContactSchema", () => {
  const validContact = {
    customerId: "550e8400-e29b-41d4-a716-446655440000",
    firstName: "John",
    lastName: "Doe",
  };

  it("accepts minimal valid contact", () => {
    const result = createContactSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it("provides default values", () => {
    const result = createContactSchema.parse(validContact);
    expect(result.isPrimary).toBe(false);
    expect(result.decisionMaker).toBe(false);
    expect(result.influencer).toBe(false);
  });

  it("accepts full valid contact", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      title: "CEO",
      email: "john@acme.com",
      phone: "+61 2 9000 1234",
      mobile: "0412345678",
      department: "Executive",
      isPrimary: true,
      decisionMaker: true,
      influencer: true,
      notes: "Key contact for major decisions",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(createContactSchema.safeParse({}).success).toBe(false);
    expect(
      createContactSchema.safeParse({ customerId: "550e8400-e29b-41d4-a716-446655440000" }).success
    ).toBe(false);
    expect(
      createContactSchema.safeParse({
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        firstName: "John",
      }).success
    ).toBe(false);
  });

  it("rejects empty first name", () => {
    const result = createContactSchema.safeParse({
      customerId: "550e8400-e29b-41d4-a716-446655440000",
      firstName: "",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid customerId", () => {
    const result = createContactSchema.safeParse({
      customerId: "not-a-uuid",
      firstName: "John",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateContactSchema", () => {
  it("accepts partial updates", () => {
    const result = updateContactSchema.safeParse({ firstName: "Jane" });
    expect(result.success).toBe(true);
  });

  it("excludes customerId from updates", () => {
    const result = updateContactSchema.safeParse({
      customerId: "550e8400-e29b-41d4-a716-446655440000",
    });
    // customerId should be stripped/ignored, not fail validation
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("customerId");
    }
  });
});
