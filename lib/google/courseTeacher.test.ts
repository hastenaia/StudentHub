import { describe, expect, it } from "vitest";
import { teacherNameFor } from "./courseTeacher";

const t = (userId: string, fullName?: string) => ({ userId, profile: { name: { fullName } } });

describe("teacherNameFor", () => {
  it("prefers the owner", () => {
    expect(teacherNameFor("2", [t("1", "A"), t("2", "B")])).toBe("B");
  });
  it("falls back to the first named teacher", () => {
    expect(teacherNameFor("9", [t("1"), t("2", "B")])).toBe("B");
  });
  it("returns null when no names", () => {
    expect(teacherNameFor("1", [])).toBeNull();
    expect(teacherNameFor("1", [{ userId: "1" }])).toBeNull();
  });
});
