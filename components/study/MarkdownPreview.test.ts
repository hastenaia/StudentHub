import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./MarkdownPreview";

describe("renderMarkdown links", () => {
  it("renders http(s) and mailto links", () => {
    expect(renderMarkdown("[a](https://x.test/p?q=1)")).toContain('<a href="https://x.test/p?q=1"');
    expect(renderMarkdown("[m](mailto:a@b.test)")).toContain('href="mailto:a@b.test"');
  });

  it.each(["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "data:text/html,x", "vbscript:x"])(
    "drops unsafe scheme %s to plain text",
    (url) => {
      const html = renderMarkdown(`[click](${url})`);
      expect(html).not.toContain("<a ");
      expect(html).toContain("click");
    }
  );

  it("cannot break out of the href attribute", () => {
    const html = renderMarkdown('[x](https://a.test/" onmouseover="alert(1))');
    expect(html).not.toMatch(/"\s*onmouseover=/);
    expect(html).toContain("&quot;");
  });

  it("keeps underscores/asterisks in URLs intact (signed-URL tokens)", () => {
    const url = "https://x.supabase.co/storage/v1/object/sign/notes-pdfs/u/1-a_b_c.pdf?token=eyJ_ab_cd*e*f";
    expect(renderMarkdown(`[PDF: a.pdf](${url})`)).toContain(`href="${url}"`);
  });

  it("formatting markers in a URL cannot inject tags into the href", () => {
    const html = renderMarkdown("[x](https://a.test/_ onmouseover=alert`1` _)");
    expect(html).not.toMatch(/href="[^"]*</);
  });

  it("still escapes raw HTML", () => {
    expect(renderMarkdown("<img src=x onerror=alert(1)>")).not.toContain("<img");
  });
});
