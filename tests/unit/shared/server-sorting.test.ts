import { describe, expect, it } from "vitest";
import { resolveServerSortState } from "@/components/shared/data-table/server-sorting";

type Field = "name" | "createdAt" | "score";

const isField = (field: string): field is Field =>
  ["name", "createdAt", "score"].includes(field);

const getDefaultDirection = (field: Field) =>
  field === "name" ? "asc" : "desc";

describe("resolveServerSortState", () => {
  it("preserves an explicitly requested direction", () => {
    expect(
      resolveServerSortState({
        currentField: "createdAt",
        currentDirection: "desc",
        nextField: "name",
        nextDirection: "desc",
        isValidField: isField,
        getDefaultDirection,
      })
    ).toEqual({
      field: "name",
      direction: "desc",
    });
  });

  it("toggles when reselecting the same field without an explicit direction", () => {
    expect(
      resolveServerSortState({
        currentField: "name",
        currentDirection: "asc",
        nextField: "name",
        isValidField: isField,
        getDefaultDirection,
      })
    ).toEqual({
      field: "name",
      direction: "desc",
    });
  });

  it("falls back to a domain default when selecting a new field", () => {
    expect(
      resolveServerSortState({
        currentField: "name",
        currentDirection: "asc",
        nextField: "score",
        isValidField: isField,
        getDefaultDirection,
      })
    ).toEqual({
      field: "score",
      direction: "desc",
    });
  });

  it("rejects unsupported fields", () => {
    expect(
      resolveServerSortState({
        currentField: "name",
        currentDirection: "asc",
        nextField: "email",
        isValidField: isField,
        getDefaultDirection,
      })
    ).toBeNull();
  });
});
