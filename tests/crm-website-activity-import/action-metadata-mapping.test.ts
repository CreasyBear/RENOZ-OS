import { describe, expect, it } from "vitest";
import {
  buildDescriptionLine,
  buildFullNotes,
  mapCrmTypeToLogType,
  mapCrmTypeToWebsiteAction,
} from "../../scripts/crm-website-activity-import/action-metadata-mapping";

describe("mapCrmTypeToWebsiteAction", () => {
  it("maps CALL to call_logged", () => {
    expect(mapCrmTypeToWebsiteAction("CALL")).toBe("call_logged");
    expect(mapCrmTypeToWebsiteAction("call")).toBe("call_logged");
  });

  it("maps NOTE, MEETING, EMAIL to note_added", () => {
    expect(mapCrmTypeToWebsiteAction("NOTE")).toBe("note_added");
    expect(mapCrmTypeToWebsiteAction("MEETING")).toBe("note_added");
    expect(mapCrmTypeToWebsiteAction("EMAIL")).toBe("note_added");
  });
});

describe("mapCrmTypeToLogType", () => {
  it("derives logType", () => {
    expect(mapCrmTypeToLogType("CALL")).toBe("call");
    expect(mapCrmTypeToLogType("MEETING")).toBe("meeting");
    expect(mapCrmTypeToLogType("EMAIL")).toBe("email");
    expect(mapCrmTypeToLogType("NOTE")).toBe("note");
  });
});

describe("buildFullNotes", () => {
  it("joins subject and details", () => {
    expect(buildFullNotes("Hi", "Body")).toBe("Hi\nBody");
    expect(buildFullNotes(null, "Only body")).toBe("Only body");
  });
});

describe("buildDescriptionLine", () => {
  it("prefixes by log type", () => {
    expect(buildDescriptionLine("CALL", "Outbound", "Left vm", 200)).toMatch(/^Call:/);
    expect(buildDescriptionLine("EMAIL", "Re:", "Thanks", 200)).toMatch(/^Email:/);
  });
});
