/**
 * Tests for usePersistedState hook
 *
 * Verifies localStorage persistence for offline queue data
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedState } from "@/hooks/use-persisted-state";

describe("usePersistedState", () => {
  const STORAGE_KEY = "test-key";
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    // Mock localStorage
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key) => mockStorage[key] ?? null
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key, value) => {
        mockStorage[key] = value;
      }
    );
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(
      (key) => {
        delete mockStorage[key];
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial value when localStorage is empty", () => {
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, [])
    );

    expect(result.current[0]).toEqual([]);
  });

  it("should load existing value from localStorage", () => {
    const existingData = [{ id: "1", name: "Test" }];
    mockStorage[STORAGE_KEY] = JSON.stringify(existingData);

    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, [])
    );

    expect(result.current[0]).toEqual(existingData);
  });

  it("should persist state changes to localStorage", () => {
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, [])
    );

    const newData = [{ id: "2", name: "New Item" }];

    act(() => {
      result.current[1](newData);
    });

    expect(result.current[0]).toEqual(newData);
    expect(mockStorage[STORAGE_KEY]).toEqual(JSON.stringify(newData));
  });

  it("should handle functional updates", () => {
    const initialData = [{ id: "1", name: "First" }];
    mockStorage[STORAGE_KEY] = JSON.stringify(initialData);

    const { result } = renderHook(() =>
      usePersistedState<Array<{ id: string; name: string }>>(STORAGE_KEY, [])
    );

    act(() => {
      result.current[1]((prev) => [...prev, { id: "2", name: "Second" }]);
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0][1]).toEqual({ id: "2", name: "Second" });
    expect(JSON.parse(mockStorage[STORAGE_KEY])).toHaveLength(2);
  });

  it("should handle invalid JSON in localStorage gracefully", () => {
    mockStorage[STORAGE_KEY] = "invalid json {{{";

    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, ["default"])
    );

    // Should fall back to initial value
    expect(result.current[0]).toEqual(["default"]);
  });

  it("should work with complex objects", () => {
    interface ReceiveEntry {
      product: { productId: string; productName: string };
      quantity: number;
      locationId: string;
    }

    const { result } = renderHook(() =>
      usePersistedState<ReceiveEntry[]>(STORAGE_KEY, [])
    );

    const entry: ReceiveEntry = {
      product: { productId: "prod-1", productName: "Test Product" },
      quantity: 10,
      locationId: "loc-1",
    };

    act(() => {
      result.current[1]([entry]);
    });

    expect(result.current[0][0].product.productName).toBe("Test Product");
    expect(JSON.parse(mockStorage[STORAGE_KEY])[0].quantity).toBe(10);
  });

  it("should update localStorage on every state change", () => {
    const { result } = renderHook(() =>
      usePersistedState<string[]>(STORAGE_KEY, [])
    );

    act(() => {
      result.current[1](["a"]);
    });
    expect(JSON.parse(mockStorage[STORAGE_KEY])).toEqual(["a"]);

    act(() => {
      result.current[1]((prev) => [...prev, "b"]);
    });
    expect(JSON.parse(mockStorage[STORAGE_KEY])).toEqual(["a", "b"]);

    act(() => {
      result.current[1]([]);
    });
    expect(JSON.parse(mockStorage[STORAGE_KEY])).toEqual([]);
  });

  it("should handle SSR where window is undefined", () => {
    // Simulate SSR by mocking typeof window check
    const originalWindow = global.window;
    // @ts-expect-error - simulating SSR
    delete global.window;

    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, ["ssr-default"])
    );

    expect(result.current[0]).toEqual(["ssr-default"]);

    // Restore window
    global.window = originalWindow;
  });
});
