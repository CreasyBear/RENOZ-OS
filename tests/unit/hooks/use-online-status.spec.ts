/**
 * Tests for useOnlineStatus hook
 *
 * Verifies online/offline status tracking functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "@/hooks/use-online-status";

describe("useOnlineStatus", () => {
  let originalNavigatorOnLine: boolean;
  let onlineListeners: Array<() => void> = [];
  let offlineListeners: Array<() => void> = [];

  beforeEach(() => {
    // Store original value
    originalNavigatorOnLine = navigator.onLine;

    // Reset listener arrays
    onlineListeners = [];
    offlineListeners = [];

    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });

    // Mock window event listeners
    vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
      if (event === "online") {
        onlineListeners.push(handler as () => void);
      } else if (event === "offline") {
        offlineListeners.push(handler as () => void);
      }
    });

    vi.spyOn(window, "removeEventListener").mockImplementation((event, handler) => {
      if (event === "online") {
        onlineListeners = onlineListeners.filter((h) => h !== handler);
      } else if (event === "offline") {
        offlineListeners = offlineListeners.filter((h) => h !== handler);
      }
    });
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, "onLine", {
      value: originalNavigatorOnLine,
      writable: true,
      configurable: true,
    });

    vi.restoreAllMocks();
  });

  it("should return true when navigator.onLine is true", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it("should return false when navigator.onLine is false", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  it("should update to true when online event fires", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);

    // Simulate going online
    act(() => {
      onlineListeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(true);
  });

  it("should update to false when offline event fires", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Simulate going offline
    act(() => {
      offlineListeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(false);
  });

  it("should add event listeners on mount", () => {
    renderHook(() => useOnlineStatus());

    expect(window.addEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function)
    );
  });

  it("should remove event listeners on unmount", () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function)
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function)
    );
  });
});
