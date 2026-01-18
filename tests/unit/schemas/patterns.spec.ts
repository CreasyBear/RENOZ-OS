/**
 * Tests for Zod Schema Patterns
 */

import { describe, it, expect } from "vitest";
import {
  idParamSchema,
  idsParamSchema,
  paginationSchema,
  cursorPaginationSchema,
  filterSchema,
  dateRangeSchema,
  emailSchema,
  phoneSchema,
  currencySchema,
  percentageSchema,
  quantitySchema,
  addressSchema,
  createEnumSchema,
} from "@/lib/schemas/patterns";

describe("ID Parameter Schemas", () => {
  describe("idParamSchema", () => {
    it("accepts valid UUID", () => {
      const result = idParamSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const result = idParamSchema.safeParse({ id: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("rejects missing id", () => {
      const result = idParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("idsParamSchema", () => {
    it("accepts array of valid UUIDs", () => {
      const result = idsParamSchema.safeParse({
        ids: [
          "550e8400-e29b-41d4-a716-446655440000",
          "550e8400-e29b-41d4-a716-446655440001",
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty array", () => {
      const result = idsParamSchema.safeParse({ ids: [] });
      expect(result.success).toBe(false);
    });

    it("rejects array with more than 100 items", () => {
      const ids = Array.from(
        { length: 101 },
        (_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`
      );
      const result = idsParamSchema.safeParse({ ids });
      expect(result.success).toBe(false);
    });
  });
});

describe("Pagination Schemas", () => {
  describe("paginationSchema", () => {
    it("provides defaults", () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sortOrder).toBe("desc");
    });

    it("coerces string to number", () => {
      const result = paginationSchema.parse({ page: "5", pageSize: "10" });
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(10);
    });

    it("rejects page < 1", () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects pageSize > 100", () => {
      const result = paginationSchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it("accepts valid sortOrder", () => {
      const asc = paginationSchema.parse({ sortOrder: "asc" });
      expect(asc.sortOrder).toBe("asc");

      const desc = paginationSchema.parse({ sortOrder: "desc" });
      expect(desc.sortOrder).toBe("desc");
    });
  });

  describe("cursorPaginationSchema", () => {
    it("provides defaults", () => {
      const result = cursorPaginationSchema.parse({});
      expect(result.cursor).toBeUndefined();
      expect(result.pageSize).toBe(20);
    });

    it("accepts cursor string", () => {
      const result = cursorPaginationSchema.parse({ cursor: "abc123" });
      expect(result.cursor).toBe("abc123");
    });
  });
});

describe("Filter Schemas", () => {
  describe("filterSchema", () => {
    it("accepts empty filters", () => {
      const result = filterSchema.parse({});
      expect(result.search).toBeUndefined();
      expect(result.dateFrom).toBeUndefined();
      expect(result.dateTo).toBeUndefined();
    });

    it("accepts search string", () => {
      const result = filterSchema.parse({ search: "test" });
      expect(result.search).toBe("test");
    });

    it("coerces date strings", () => {
      const result = filterSchema.parse({ dateFrom: "2024-01-01" });
      expect(result.dateFrom).toBeInstanceOf(Date);
    });
  });

  describe("dateRangeSchema", () => {
    it("accepts valid date range", () => {
      const result = dateRangeSchema.safeParse({
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      });
      expect(result.success).toBe(true);
    });

    it("rejects dateTo before dateFrom", () => {
      const result = dateRangeSchema.safeParse({
        dateFrom: "2024-12-31",
        dateTo: "2024-01-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("dateTo");
      }
    });
  });
});

describe("Field Validation Schemas", () => {
  describe("emailSchema", () => {
    it("accepts valid email", () => {
      const result = emailSchema.safeParse("test@example.com");
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = emailSchema.safeParse("not-an-email");
      expect(result.success).toBe(false);
    });
  });

  describe("phoneSchema", () => {
    it("accepts valid phone formats", () => {
      expect(phoneSchema.safeParse("+61 2 1234 5678").success).toBe(true);
      expect(phoneSchema.safeParse("(02) 1234-5678").success).toBe(true);
      expect(phoneSchema.safeParse("0412345678").success).toBe(true);
    });

    it("rejects invalid phone", () => {
      expect(phoneSchema.safeParse("abc").success).toBe(false);
    });

    it("allows undefined", () => {
      expect(phoneSchema.safeParse(undefined).success).toBe(true);
    });
  });

  describe("currencySchema", () => {
    it("accepts valid currency amounts", () => {
      expect(currencySchema.parse("99.99")).toBe(99.99);
      expect(currencySchema.parse(100)).toBe(100);
      expect(currencySchema.parse(0)).toBe(0);
    });

    it("rejects negative amounts", () => {
      expect(currencySchema.safeParse(-10).success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
      expect(currencySchema.safeParse(10.999).success).toBe(false);
    });
  });

  describe("percentageSchema", () => {
    it("accepts valid percentages", () => {
      expect(percentageSchema.parse(0)).toBe(0);
      expect(percentageSchema.parse(50)).toBe(50);
      expect(percentageSchema.parse(100)).toBe(100);
      expect(percentageSchema.parse(15.5)).toBe(15.5);
    });

    it("rejects percentages > 100", () => {
      expect(percentageSchema.safeParse(101).success).toBe(false);
    });

    it("rejects negative percentages", () => {
      expect(percentageSchema.safeParse(-1).success).toBe(false);
    });
  });

  describe("quantitySchema", () => {
    it("accepts valid quantities", () => {
      expect(quantitySchema.parse(10)).toBe(10);
      expect(quantitySchema.parse(0.5)).toBe(0.5);
      expect(quantitySchema.parse(1.234)).toBe(1.234);
    });

    it("rejects negative quantities", () => {
      expect(quantitySchema.safeParse(-1).success).toBe(false);
    });
  });
});

describe("Address Schema", () => {
  const validAddress = {
    street1: "123 Main St",
    city: "Sydney",
    state: "NSW",
    postalCode: "2000",
  };

  it("accepts valid address", () => {
    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it("defaults country to AU", () => {
    const result = addressSchema.parse(validAddress);
    expect(result.country).toBe("AU");
  });

  it("accepts optional street2", () => {
    const result = addressSchema.parse({ ...validAddress, street2: "Suite 1" });
    expect(result.street2).toBe("Suite 1");
  });

  it("rejects missing required fields", () => {
    expect(addressSchema.safeParse({}).success).toBe(false);
    expect(addressSchema.safeParse({ street1: "123 Main" }).success).toBe(false);
  });
});

describe("Helper Functions", () => {
  describe("createEnumSchema", () => {
    it("creates enum from values", () => {
      const statusSchema = createEnumSchema(["active", "inactive", "pending"]);
      expect(statusSchema.parse("active")).toBe("active");
      expect(statusSchema.safeParse("invalid").success).toBe(false);
    });
  });
});
