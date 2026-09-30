import { describe, expect, it } from "vitest";
import { parseTags, upsertById } from "./text";

describe("parseTags", () => {
  it("trims, drops blanks and caps at 10", () => {
    expect(parseTags(" a, b,,c ,")).toEqual(["a", "b", "c"]);
    expect(parseTags(Array.from({ length: 12 }, (_, i) => `t${i}`).join(","))).toHaveLength(10);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("upsertById", () => {
  it("replaces in place or prepends", () => {
    const list = [{ id: "1", v: "a" }, { id: "2", v: "b" }];
    expect(upsertById(list, { id: "2", v: "x" })).toEqual([{ id: "1", v: "a" }, { id: "2", v: "x" }]);
    expect(upsertById(list, { id: "3", v: "c" }).map((i) => i.id)).toEqual(["3", "1", "2"]);
  });
});
