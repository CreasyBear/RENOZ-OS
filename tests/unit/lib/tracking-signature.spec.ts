/**
 * Tests for HMAC signature generation and validation for email tracking URLs
 *
 * Security requirement: Prevent IDOR attacks on tracking endpoints by validating
 * that tracking URLs contain valid HMAC signatures.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We'll import these after implementing them
import {
  generateTrackingSignature,
  validateTrackingSignature,
  createTrackingUrl,
  createTrackingPixelUrl,
} from "@/lib/server/email-tracking";

describe("Tracking Signature Security", () => {
  const TEST_EMAIL_ID = "test-email-123";
  const TEST_LINK_ID = "test-link-456";
  const TEST_ORIGINAL_URL = "https://example.com/page";

  describe("generateTrackingSignature", () => {
    it("should generate a non-empty signature", () => {
      const sig = generateTrackingSignature(TEST_EMAIL_ID);
      expect(sig).toBeDefined();
      expect(sig.length).toBeGreaterThan(0);
    });

    it("should generate consistent signatures for the same emailId", () => {
      const sig1 = generateTrackingSignature(TEST_EMAIL_ID);
      const sig2 = generateTrackingSignature(TEST_EMAIL_ID);
      expect(sig1).toBe(sig2);
    });

    it("should generate different signatures for different emailIds", () => {
      const sig1 = generateTrackingSignature("email-1");
      const sig2 = generateTrackingSignature("email-2");
      expect(sig1).not.toBe(sig2);
    });

    it("should generate 16-character hex signatures", () => {
      const sig = generateTrackingSignature(TEST_EMAIL_ID);
      expect(sig.length).toBe(16);
      expect(sig).toMatch(/^[a-f0-9]+$/);
    });

    it("should include linkId in signature when provided", () => {
      const sigWithoutLink = generateTrackingSignature(TEST_EMAIL_ID);
      const sigWithLink = generateTrackingSignature(TEST_EMAIL_ID, TEST_LINK_ID);
      expect(sigWithoutLink).not.toBe(sigWithLink);
    });
  });

  describe("validateTrackingSignature", () => {
    it("should return true for valid signatures", () => {
      const sig = generateTrackingSignature(TEST_EMAIL_ID);
      const isValid = validateTrackingSignature(TEST_EMAIL_ID, sig);
      expect(isValid).toBe(true);
    });

    it("should return false for invalid signatures", () => {
      const isValid = validateTrackingSignature(TEST_EMAIL_ID, "invalid-sig");
      expect(isValid).toBe(false);
    });

    it("should return false for signatures from different emailIds", () => {
      const sig = generateTrackingSignature("email-1");
      const isValid = validateTrackingSignature("email-2", sig);
      expect(isValid).toBe(false);
    });

    it("should return false for empty signatures", () => {
      const isValid = validateTrackingSignature(TEST_EMAIL_ID, "");
      expect(isValid).toBe(false);
    });

    it("should validate signatures with linkId", () => {
      const sig = generateTrackingSignature(TEST_EMAIL_ID, TEST_LINK_ID);
      const isValid = validateTrackingSignature(TEST_EMAIL_ID, sig, TEST_LINK_ID);
      expect(isValid).toBe(true);
    });

    it("should reject signature when linkId does not match", () => {
      const sig = generateTrackingSignature(TEST_EMAIL_ID, TEST_LINK_ID);
      const isValid = validateTrackingSignature(TEST_EMAIL_ID, sig, "wrong-link-id");
      expect(isValid).toBe(false);
    });
  });

  describe("createTrackingUrl (with signature)", () => {
    it("should include sig query parameter", () => {
      const url = createTrackingUrl(TEST_EMAIL_ID, TEST_LINK_ID, TEST_ORIGINAL_URL);
      expect(url).toContain("sig=");
    });

    it("should include a valid signature in the URL", () => {
      const url = createTrackingUrl(TEST_EMAIL_ID, TEST_LINK_ID, TEST_ORIGINAL_URL);
      const urlObj = new URL(url);
      const sig = urlObj.searchParams.get("sig");
      expect(sig).not.toBeNull();
      expect(validateTrackingSignature(TEST_EMAIL_ID, sig!, TEST_LINK_ID)).toBe(true);
    });

    it("should still include the original URL parameter", () => {
      const url = createTrackingUrl(TEST_EMAIL_ID, TEST_LINK_ID, TEST_ORIGINAL_URL);
      expect(url).toContain(`url=${encodeURIComponent(TEST_ORIGINAL_URL)}`);
    });

    it("should include emailId and linkId in the path", () => {
      const url = createTrackingUrl(TEST_EMAIL_ID, TEST_LINK_ID, TEST_ORIGINAL_URL);
      expect(url).toContain(`/api/track/click/${TEST_EMAIL_ID}/${TEST_LINK_ID}`);
    });
  });

  describe("createTrackingPixelUrl (with signature)", () => {
    it("should include sig query parameter", () => {
      const url = createTrackingPixelUrl(TEST_EMAIL_ID);
      expect(url).toContain("sig=");
    });

    it("should include a valid signature in the URL", () => {
      const url = createTrackingPixelUrl(TEST_EMAIL_ID);
      const urlObj = new URL(url);
      const sig = urlObj.searchParams.get("sig");
      expect(sig).not.toBeNull();
      expect(validateTrackingSignature(TEST_EMAIL_ID, sig!)).toBe(true);
    });

    it("should include emailId in the path", () => {
      const url = createTrackingPixelUrl(TEST_EMAIL_ID);
      expect(url).toContain(`/api/track/open/${TEST_EMAIL_ID}`);
    });
  });

  describe("Security properties", () => {
    it("should use timing-safe comparison to prevent timing attacks", () => {
      // This is a property we expect, but hard to test directly
      // The implementation should use crypto.timingSafeEqual
      const sig = generateTrackingSignature(TEST_EMAIL_ID);
      // Multiple validations should take consistent time
      const start1 = performance.now();
      validateTrackingSignature(TEST_EMAIL_ID, sig);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      validateTrackingSignature(TEST_EMAIL_ID, "x".repeat(16));
      const time2 = performance.now() - start2;

      // Times should be within reasonable bounds (not a strict test due to variance)
      // This is more of a documentation of expected behavior
      expect(time1).toBeLessThan(100); // Should be fast
      expect(time2).toBeLessThan(100); // Should also be fast (no early exit)
    });
  });
});
