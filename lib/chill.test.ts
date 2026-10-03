import { describe, expect, it } from "vitest";
import { nextActiveId } from "./chill";

describe("nextActiveId", () => {
  it("starts the clicked track when idle", () => {
    expect(nextActiveId(null, "rain")).toBe("rain");
  });

  it("stops the active track when clicked again", () => {
    expect(nextActiveId("rain", "rain")).toBeNull();
  });

  it("switches to the new track (only one playing)", () => {
    expect(nextActiveId("rain", "forest")).toBe("forest");
  });
});
