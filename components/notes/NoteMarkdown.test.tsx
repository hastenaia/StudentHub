import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { NoteMarkdown } from "./NoteMarkdown";

describe("NoteMarkdown", () => {
  it("renders common markdown and GFM", () => {
    const { container } = render(
      <NoteMarkdown content={"# Title\n\n**bold** *it* `code`\n\n- a\n- b\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n- [x] done"} />
    );
    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("it");
    expect(container.querySelector("code")?.textContent).toBe("code");
    expect(container.querySelectorAll("ul li").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector("table td")?.textContent).toBe("1");
    expect(container.querySelector('input[type="checkbox"]')).toBeChecked();
  });

  it("does not render raw HTML or javascript: links", () => {
    const { container } = render(<NoteMarkdown content={'<script>alert(1)</script>\n\n[x](javascript:alert(1))'} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a")?.getAttribute("href") ?? "").not.toMatch(/javascript:/i);
  });

  it("shows a placeholder for empty content", () => {
    const { getByText } = render(<NoteMarkdown content="  " />);
    expect(getByText("Nothing to preview yet.")).toBeInTheDocument();
  });
});
