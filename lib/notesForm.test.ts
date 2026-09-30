import { describe, expect, it } from "vitest";
import { findUnlinkedAttachments, linkedAttachments, resolveLinks, splitKeptDropped, stripAttachmentLink, toNoteDraft, toUrlMap } from "./notesForm";

describe("notesForm", () => {
  it("toNoteDraft parses tags and normalizes empties", () => {
    expect(toNoteDraft({ title: "t", content: "", favorite: undefined, tags: "a, b,,c", courseId: "" })).toEqual({
      title: "t",
      content: null,
      favorite: false,
      tags: ["a", "b", "c"],
      courseId: null,
    });
  });

  it("splitKeptDropped keeps linked pending uploads", () => {
    const pending = [{ path: "u/1-a.pdf", file_name: "a.pdf" }, { path: "u/1-b.pdf", file_name: "b.pdf" }];
    expect(splitKeptDropped("see [PDF: a](attachment:u/1-a.pdf)", pending)).toEqual({
      kept: [pending[0]],
      dropped: ["u/1-b.pdf"],
    });
  });

  it("findUnlinkedAttachments ignores http entries", () => {
    const dialog = [{ name: "x", url: "https://cdn/x.pdf", path: "https://cdn/x.pdf" }, { name: "y", url: "", path: "u/1-y.pdf" }];
    expect(findUnlinkedAttachments("no links", dialog)).toEqual(["u/1-y.pdf"]);
  });

  it("stripAttachmentLink removes the markdown link", () => {
    expect(stripAttachmentLink("a\n[PDF: x](attachment:u/1-x.pdf)\nb", "u/1-x.pdf")).toBe("a\nb");
  });

  it("resolveLinks swaps cache hits and drops misses to label", () => {
    expect(resolveLinks("[a](attachment:p1) [b](attachment:p2)", { p1: "https://s/p1" })).toBe("[a](https://s/p1) b");
  });

  it("toUrlMap skips http paths and linkedAttachments merges", () => {
    expect(toUrlMap([{ url: "s", path: "p" }, { url: "h", path: "https://h" }])).toEqual({ p: "s" });
    const linked = linkedAttachments("[x](attachment:p)", [{ name: "d", url: "u", path: "https://d" }], [{ path: "p", file_name: "x.pdf" }], { p: "s" });
    expect(linked).toEqual([{ name: "d", url: "u", path: "https://d" }, { name: "x.pdf", url: "s", path: "p" }]);
  });
});
