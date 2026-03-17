import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMutation } from "@/hooks/_shared/useMutation";

describe("useMutation", () => {
  it("rejects the mutate promise and preserves error state", async () => {
    const expectedError = new Error("Mutation failed");
    const { result } = renderHook(() =>
      useMutation({
        fn: vi.fn(async () => {
          throw expectedError;
        }),
      })
    );

    await act(async () => {
      await expect(result.current.mutate("input")).rejects.toThrow("Mutation failed");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.error).toBe(expectedError);
    });
  });
});
