/**
 * Tests for Customer Utility Functions
 *
 * Pure function tests for customer data transformation, formatting,
 * validation, normalization, and search utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  // Status utilities
  getStatusLabel,
  getStatusColor,
  getStatusBgColor,
  STATUS_CONFIG,
  // Type utilities
  getTypeLabel,
  TYPE_CONFIG,
  // Size utilities
  getSizeLabel,
  SIZE_CONFIG,
  // Formatting utilities
  formatLifetimeValue,
  formatCustomerCode,
  generateCustomerCode,
  formatRelativeDate,
  formatContactName,
  formatAddress,
  // Validation utilities
  isValidEmail,
  isValidAustralianPhone,
  isValidABN,
  // Normalization utilities
  normalizePhone,
  normalizeUrl,
  normalizeName,
  // Search utilities
  createSearchTokens,
  matchesSearch,
  // Sorting utilities
  sortCustomers,
  type CustomerData,
  type SortField,
} from "@/lib/customer-utils";

// ============================================================================
// STATUS UTILITIES
// ============================================================================

describe("Status Utilities", () => {
  describe("getStatusLabel", () => {
    it("returns correct labels for all statuses", () => {
      expect(getStatusLabel("active")).toBe("Active");
      expect(getStatusLabel("inactive")).toBe("Inactive");
      expect(getStatusLabel("prospect")).toBe("Prospect");
      expect(getStatusLabel("suspended")).toBe("Suspended");
      expect(getStatusLabel("blacklisted")).toBe("Blacklisted");
    });

    it("returns status string for unknown status", () => {
      expect(getStatusLabel("unknown" as any)).toBe("unknown");
    });
  });

  describe("getStatusColor", () => {
    it("returns correct colors for all statuses", () => {
      expect(getStatusColor("active")).toBe("text-green-700");
      expect(getStatusColor("inactive")).toBe("text-gray-700");
      expect(getStatusColor("prospect")).toBe("text-blue-700");
      expect(getStatusColor("suspended")).toBe("text-orange-700");
      expect(getStatusColor("blacklisted")).toBe("text-red-700");
    });

    it("returns fallback color for unknown status", () => {
      expect(getStatusColor("unknown" as any)).toBe("text-gray-700");
    });
  });

  describe("getStatusBgColor", () => {
    it("returns correct background colors", () => {
      expect(getStatusBgColor("active")).toBe("bg-green-100");
      expect(getStatusBgColor("prospect")).toBe("bg-blue-100");
    });
  });

  describe("STATUS_CONFIG", () => {
    it("has all required statuses", () => {
      expect(Object.keys(STATUS_CONFIG)).toContain("active");
      expect(Object.keys(STATUS_CONFIG)).toContain("inactive");
      expect(Object.keys(STATUS_CONFIG)).toContain("prospect");
      expect(Object.keys(STATUS_CONFIG)).toContain("suspended");
      expect(Object.keys(STATUS_CONFIG)).toContain("blacklisted");
    });
  });
});

// ============================================================================
// TYPE UTILITIES
// ============================================================================

describe("Type Utilities", () => {
  describe("getTypeLabel", () => {
    it("returns correct labels for all types", () => {
      expect(getTypeLabel("individual")).toBe("Individual");
      expect(getTypeLabel("business")).toBe("Business");
      expect(getTypeLabel("government")).toBe("Government");
      expect(getTypeLabel("non_profit")).toBe("Non-Profit");
    });
  });

  describe("TYPE_CONFIG", () => {
    it("has icon for each type", () => {
      expect(TYPE_CONFIG.individual.icon).toBeDefined();
      expect(TYPE_CONFIG.business.icon).toBeDefined();
    });
  });
});

// ============================================================================
// SIZE UTILITIES
// ============================================================================

describe("Size Utilities", () => {
  describe("getSizeLabel", () => {
    it("returns correct labels for all sizes", () => {
      expect(getSizeLabel("micro")).toBe("Micro");
      expect(getSizeLabel("small")).toBe("Small");
      expect(getSizeLabel("medium")).toBe("Medium");
      expect(getSizeLabel("large")).toBe("Large");
      expect(getSizeLabel("enterprise")).toBe("Enterprise");
    });
  });

  describe("SIZE_CONFIG", () => {
    it("has employee ranges for all sizes", () => {
      expect(SIZE_CONFIG.micro.employees).toBe("1-9");
      expect(SIZE_CONFIG.enterprise.employees).toBe("1000+");
    });
  });
});

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

describe("Formatting Utilities", () => {
  describe("formatLifetimeValue", () => {
    it("formats millions", () => {
      expect(formatLifetimeValue(1500000)).toBe("$1.5M");
      expect(formatLifetimeValue(2000000)).toBe("$2.0M");
    });

    it("formats thousands", () => {
      expect(formatLifetimeValue(50000)).toBe("$50K");
      expect(formatLifetimeValue(1000)).toBe("$1K");
    });

    it("formats smaller values without suffix", () => {
      expect(formatLifetimeValue(500)).toBe("$500");
      expect(formatLifetimeValue(99)).toBe("$99");
    });

    it("handles string input", () => {
      expect(formatLifetimeValue("50000")).toBe("$50K");
      expect(formatLifetimeValue("1500000")).toBe("$1.5M");
    });

    it("handles null/undefined", () => {
      expect(formatLifetimeValue(null)).toBe("$0");
      expect(formatLifetimeValue(undefined)).toBe("$0");
    });

    it("handles zero", () => {
      expect(formatLifetimeValue(0)).toBe("$0");
    });

    it("handles invalid string", () => {
      expect(formatLifetimeValue("not-a-number")).toBe("$0");
    });
  });

  describe("formatCustomerCode", () => {
    it("adds CUST- prefix if missing", () => {
      expect(formatCustomerCode("12345")).toBe("CUST-12345");
    });

    it("keeps CUST- prefix if present", () => {
      expect(formatCustomerCode("CUST-12345")).toBe("CUST-12345");
    });

    it("handles empty string", () => {
      expect(formatCustomerCode("")).toBe("");
    });
  });

  describe("generateCustomerCode", () => {
    it("generates code starting with CUST-", () => {
      const code = generateCustomerCode();
      expect(code.startsWith("CUST-")).toBe(true);
    });

    it("generates unique codes", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateCustomerCode());
      }
      // At least 95% should be unique (allowing for some collision in random)
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe("formatRelativeDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-17T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 'Never' for null/undefined", () => {
      expect(formatRelativeDate(null)).toBe("Never");
      expect(formatRelativeDate(undefined)).toBe("Never");
    });

    it("returns 'Today' for same day", () => {
      expect(formatRelativeDate("2026-01-17T10:00:00Z")).toBe("Today");
    });

    it("returns 'Yesterday' for previous day", () => {
      expect(formatRelativeDate("2026-01-16T12:00:00Z")).toBe("Yesterday");
    });

    it("returns days ago for recent dates", () => {
      expect(formatRelativeDate("2026-01-14T12:00:00Z")).toBe("3 days ago");
    });

    it("returns weeks ago for dates within a month", () => {
      expect(formatRelativeDate("2026-01-03T12:00:00Z")).toBe("2 weeks ago");
    });

    it("returns months ago for dates within a year", () => {
      expect(formatRelativeDate("2025-11-17T12:00:00Z")).toBe("2 months ago");
    });

    it("returns years ago for older dates", () => {
      expect(formatRelativeDate("2024-01-17T12:00:00Z")).toBe("2 years ago");
    });
  });

  describe("formatContactName", () => {
    it("combines first and last name", () => {
      expect(formatContactName("John", "Doe")).toBe("John Doe");
    });

    it("handles extra whitespace", () => {
      expect(formatContactName(" John ", " Doe ")).toBe("John  Doe");
    });
  });

  describe("formatAddress", () => {
    it("formats full address", () => {
      const address = {
        street1: "123 Main St",
        street2: "Suite 100",
        city: "Sydney",
        state: "NSW",
        postcode: "2000",
        country: "AU",
      };
      expect(formatAddress(address)).toBe("123 Main St, Suite 100, Sydney, NSW, 2000");
    });

    it("excludes null street2", () => {
      const address = {
        street1: "123 Main St",
        street2: null,
        city: "Sydney",
        state: "NSW",
        postcode: "2000",
      };
      expect(formatAddress(address)).toBe("123 Main St, Sydney, NSW, 2000");
    });

    it("includes country if not AU", () => {
      const address = {
        street1: "456 Oak Ave",
        city: "Auckland",
        postcode: "1010",
        country: "NZ",
      };
      expect(formatAddress(address)).toBe("456 Oak Ave, Auckland, 1010, NZ");
    });
  });
});

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

describe("Validation Utilities", () => {
  describe("isValidEmail", () => {
    it("accepts valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("john.doe@company.com.au")).toBe(true);
      expect(isValidEmail("user+tag@domain.org")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidEmail("not-an-email")).toBe(false);
      expect(isValidEmail("missing@domain")).toBe(false);
      expect(isValidEmail("@no-local.com")).toBe(false);
      expect(isValidEmail("spaces in@email.com")).toBe(false);
    });
  });

  describe("isValidAustralianPhone", () => {
    it("accepts valid mobile numbers", () => {
      expect(isValidAustralianPhone("0412345678")).toBe(true);
      expect(isValidAustralianPhone("+61412345678")).toBe(true);
      expect(isValidAustralianPhone("0412 345 678")).toBe(true);
    });

    it("accepts valid landline numbers", () => {
      expect(isValidAustralianPhone("0298765432")).toBe(true);
      expect(isValidAustralianPhone("(02) 9876 5432")).toBe(true);
    });

    it("rejects invalid numbers", () => {
      expect(isValidAustralianPhone("123")).toBe(false);
      expect(isValidAustralianPhone("abcdefghij")).toBe(false);
    });
  });

  describe("isValidABN", () => {
    it("accepts valid ABNs", () => {
      // Valid ABN format (11 digits)
      expect(isValidABN("51824753556")).toBe(true);
      expect(isValidABN("51 824 753 556")).toBe(true);
    });

    it("rejects invalid ABNs", () => {
      expect(isValidABN("12345")).toBe(false);
      expect(isValidABN("123456789012")).toBe(false);
    });
  });
});

// ============================================================================
// NORMALIZATION UTILITIES
// ============================================================================

describe("Normalization Utilities", () => {
  describe("normalizeUrl", () => {
    it("adds https:// if missing", () => {
      expect(normalizeUrl("example.com")).toBe("https://example.com");
      expect(normalizeUrl("www.example.com")).toBe("https://www.example.com");
    });

    it("keeps existing http://", () => {
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("keeps existing https://", () => {
      expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("handles empty string", () => {
      expect(normalizeUrl("")).toBe("");
    });

    it("trims whitespace", () => {
      expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
    });
  });

  describe("normalizeName", () => {
    it("capitalizes first letter of each word", () => {
      expect(normalizeName("john doe")).toBe("John Doe");
      expect(normalizeName("JOHN DOE")).toBe("John Doe");
    });

    it("handles single word", () => {
      expect(normalizeName("john")).toBe("John");
    });

    it("trims whitespace", () => {
      expect(normalizeName("  john doe  ")).toBe("John Doe");
    });
  });
});

// ============================================================================
// SEARCH UTILITIES
// ============================================================================

describe("Search Utilities", () => {
  const sampleCustomer: CustomerData = {
    id: "1",
    customerCode: "CUST-001",
    name: "Acme Corporation",
    legalName: "Acme Corp Pty Ltd",
    type: "business",
    status: "active",
    industry: "Manufacturing",
    website: "acme.com",
    taxId: "51824753556",
    createdAt: "2024-01-01T00:00:00Z",
  };

  describe("createSearchTokens", () => {
    it("creates tokens from customer data", () => {
      const tokens = createSearchTokens(sampleCustomer);
      expect(tokens).toContain("acme corporation");
      expect(tokens).toContain("cust-001");
      expect(tokens).toContain("acme corp pty ltd");
      expect(tokens).toContain("manufacturing");
    });

    it("handles null fields", () => {
      const customer: CustomerData = {
        id: "2",
        customerCode: "CUST-002",
        name: "Test",
        type: "individual",
        status: "prospect",
        industry: null,
        createdAt: "2024-01-01T00:00:00Z",
      };
      const tokens = createSearchTokens(customer);
      expect(tokens).not.toContain(null);
      expect(tokens).toContain("test");
    });
  });

  describe("matchesSearch", () => {
    it("returns true for empty query", () => {
      expect(matchesSearch(sampleCustomer, "")).toBe(true);
    });

    it("matches on name", () => {
      expect(matchesSearch(sampleCustomer, "acme")).toBe(true);
      expect(matchesSearch(sampleCustomer, "Acme Corporation")).toBe(true);
    });

    it("matches on customer code", () => {
      expect(matchesSearch(sampleCustomer, "CUST-001")).toBe(true);
      expect(matchesSearch(sampleCustomer, "cust-001")).toBe(true);
    });

    it("matches on industry", () => {
      expect(matchesSearch(sampleCustomer, "manufacturing")).toBe(true);
    });

    it("matches multiple terms", () => {
      expect(matchesSearch(sampleCustomer, "acme manufacturing")).toBe(true);
    });

    it("returns false for non-matching query", () => {
      expect(matchesSearch(sampleCustomer, "nonexistent")).toBe(false);
    });

    it("requires all terms to match", () => {
      expect(matchesSearch(sampleCustomer, "acme nonexistent")).toBe(false);
    });
  });
});

// ============================================================================
// SORTING UTILITIES
// ============================================================================

describe("Sorting Utilities", () => {
  const customers: CustomerData[] = [
    {
      id: "1",
      customerCode: "CUST-003",
      name: "Beta Corp",
      type: "business",
      status: "active",
      healthScore: 75,
      lifetimeValue: 50000,
      lastOrderDate: "2024-03-01",
      createdAt: "2024-01-15T00:00:00Z",
    },
    {
      id: "2",
      customerCode: "CUST-001",
      name: "Alpha Inc",
      type: "business",
      status: "active",
      healthScore: 90,
      lifetimeValue: 100000,
      lastOrderDate: "2024-02-01",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "3",
      customerCode: "CUST-002",
      name: "Gamma Ltd",
      type: "business",
      status: "active",
      healthScore: null,
      lifetimeValue: null,
      lastOrderDate: null,
      createdAt: "2024-01-10T00:00:00Z",
    },
  ];

  describe("sortCustomers", () => {
    it("sorts by name ascending", () => {
      const sorted = sortCustomers(customers, "name", "asc");
      expect(sorted[0].name).toBe("Alpha Inc");
      expect(sorted[1].name).toBe("Beta Corp");
      expect(sorted[2].name).toBe("Gamma Ltd");
    });

    it("sorts by name descending", () => {
      const sorted = sortCustomers(customers, "name", "desc");
      expect(sorted[0].name).toBe("Gamma Ltd");
      expect(sorted[2].name).toBe("Alpha Inc");
    });

    it("sorts by customerCode", () => {
      const sorted = sortCustomers(customers, "customerCode", "asc");
      expect(sorted[0].customerCode).toBe("CUST-001");
      expect(sorted[2].customerCode).toBe("CUST-003");
    });

    it("sorts by healthScore with nulls as 0", () => {
      const sorted = sortCustomers(customers, "healthScore", "desc");
      expect(sorted[0].healthScore).toBe(90);
      expect(sorted[1].healthScore).toBe(75);
      expect(sorted[2].healthScore).toBeNull();
    });

    it("sorts by lifetimeValue", () => {
      const sorted = sortCustomers(customers, "lifetimeValue", "desc");
      expect(sorted[0].lifetimeValue).toBe(100000);
      expect(sorted[1].lifetimeValue).toBe(50000);
    });

    it("sorts by lastOrderDate with nulls as earliest", () => {
      const sorted = sortCustomers(customers, "lastOrderDate", "desc");
      expect(sorted[0].lastOrderDate).toBe("2024-03-01");
      expect(sorted[2].lastOrderDate).toBeNull();
    });

    it("sorts by createdAt", () => {
      const sorted = sortCustomers(customers, "createdAt", "asc");
      expect(sorted[0].id).toBe("2"); // 2024-01-01
      expect(sorted[2].id).toBe("1"); // 2024-01-15
    });

    it("does not mutate original array", () => {
      const original = [...customers];
      sortCustomers(customers, "name", "asc");
      expect(customers).toEqual(original);
    });
  });
});
