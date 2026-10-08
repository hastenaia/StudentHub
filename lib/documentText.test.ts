import { describe, expect, it } from "vitest";
import {
  clampFlashcardCount,
  defaultTitleFromFilename,
  detectDocumentKind,
  prepareSource,
  validateDocumentFile,
} from "./documentText";

describe("detectDocumentKind", () => {
  it("detects by extension", () => {
    expect(detectDocumentKind("slides.PDF", "")).toBe("pdf");
    expect(detectDocumentKind("notes.txt", "")).toBe("txt");
    expect(detectDocumentKind("readme.markdown", "")).toBe("md");
    expect(detectDocumentKind("essay.docx", "")).toBe("docx");
  });

  it("falls back to MIME type", () => {
    expect(detectDocumentKind("noext", "application/pdf")).toBe("pdf");
    expect(
      detectDocumentKind(
        "noext",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("docx");
  });

  it("rejects unknown types", () => {
    expect(detectDocumentKind("photo.png", "image/png")).toBeNull();
    expect(detectDocumentKind("noext", "")).toBeNull();
  });
});

describe("validateDocumentFile", () => {
  it("accepts supported files under the cap", () => {
    expect(validateDocumentFile({ name: "a.pdf", type: "application/pdf", size: 100 })).toBeNull();
    expect(validateDocumentFile({ name: "a.docx", type: "", size: 100 })).toBeNull();
  });

  it("rejects unsupported types, empty and oversized files", () => {
    expect(validateDocumentFile({ name: "a.png", type: "image/png", size: 100 })).toContain(
      "Unsupported file type"
    );
    expect(validateDocumentFile({ name: "a.txt", type: "text/plain", size: 0 })).toContain("empty");
    expect(
      validateDocumentFile({ name: "a.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 })
    ).toContain("10MB");
  });
});

describe("clampFlashcardCount", () => {
  it("clamps to 1–10 with default 5", () => {
    expect(clampFlashcardCount("7")).toBe(7);
    expect(clampFlashcardCount(0)).toBe(1);
    expect(clampFlashcardCount(99)).toBe(10);
    expect(clampFlashcardCount("nope")).toBe(5);
  });
});

describe("prepareSource", () => {
  it("trims and truncates to the model slice", () => {
    expect(prepareSource("   hello   ")).toBe("hello");
    expect(prepareSource("x".repeat(7000))).toHaveLength(6000);
  });
});

describe("defaultTitleFromFilename", () => {
  it("strips the extension and prettifies separators", () => {
    expect(defaultTitleFromFilename("bio_chapter-1.pdf")).toBe("bio chapter 1");
    expect(defaultTitleFromFilename("notes.txt")).toBe("notes");
    expect(defaultTitleFromFilename("")).toBe("Imported document");
  });
});
