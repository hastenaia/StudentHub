// @vitest-environment node
import { describe, expect, it } from "vitest";
import { tryParseAIJson } from "./route";

const asArray = (v: unknown) => (Array.isArray(v) ? v : null);

describe("tryParseAIJson", () => {
  it("parses plain and ```json-fenced output", () => {
    expect(tryParseAIJson('[{"a":1}]', asArray)).toEqual([{ a: 1 }]);
    expect(tryParseAIJson('```json\n[{"a":1}]\n```', asArray)).toEqual([{ a: 1 }]);
  });

  it("returns null for invalid JSON or a rejected shape", () => {
    expect(tryParseAIJson("Sure! Here are your cards:", asArray)).toBeNull();
    expect(tryParseAIJson('{"not":"an array"}', asArray)).toBeNull();
  });
});
