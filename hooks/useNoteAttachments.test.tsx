import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNoteAttachments } from "./useNoteAttachments";
import { notesClientService } from "@/services/notesClient.service";
import { MAX_PDF_BYTES } from "@/lib/notesForm";

vi.mock("@/services/notesClient.service", () => ({
  notesClientService: {
    getAttachments: vi.fn(),
    uploadPdf: vi.fn(),
    linkAttachments: vi.fn(),
    removeAttachments: vi.fn(),
    discardPdfUploads: vi.fn(),
  },
}));

const svc = vi.mocked(notesClientService);
const pdf = (name = "a.pdf", size = 10) => new File(["x".repeat(size)], name, { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  svc.getAttachments.mockResolvedValue([]);
  svc.uploadPdf.mockResolvedValue({ success: true, data: { path: "u/1-a.pdf", url: "https://signed/a" } });
  svc.linkAttachments.mockResolvedValue({ success: true });
  svc.removeAttachments.mockResolvedValue({ success: true });
  svc.discardPdfUploads.mockResolvedValue();
});

describe("useNoteAttachments", () => {
  it("loads a saved note's attachments and resolves their links", async () => {
    svc.getAttachments.mockResolvedValue([{ name: "old.pdf", url: "https://signed/old", path: "u/old.pdf" }]);
    const { result } = renderHook(() => useNoteAttachments("n1"));
    await waitFor(() => expect(result.current.linked("[o](attachment:u/old.pdf)")).toHaveLength(1));
    expect(svc.getAttachments).toHaveBeenCalledWith("n1");
    expect(result.current.resolve("[o](attachment:u/old.pdf)")).toBe("[o](https://signed/old)");
  });

  it("skips loading for a new note", () => {
    renderHook(() => useNoteAttachments(null));
    expect(svc.getAttachments).not.toHaveBeenCalled();
  });

  it("rejects invalid files without uploading", async () => {
    const { result } = renderHook(() => useNoteAttachments(null));
    const bad = await result.current.attach(new File(["x"], "a.png", { type: "image/png" }));
    expect(bad).toMatchObject({ success: false, message: "Only PDF allowed" });
    const big = new File([], "b.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: MAX_PDF_BYTES + 1 });
    expect((await result.current.attach(big)).message).toBe("PDF exceeds 10MB limit");
    expect(svc.uploadPdf).not.toHaveBeenCalled();
  });

  it("surfaces upload failures", async () => {
    svc.uploadPdf.mockResolvedValueOnce({ success: false, message: "quota" }).mockResolvedValueOnce({ success: false });
    const { result } = renderHook(() => useNoteAttachments(null));
    expect((await result.current.attach(pdf())).message).toBe("quota");
    expect((await result.current.attach(pdf())).message).toBe("Upload failed");
  });

  it("tracks uploads as pending, links kept ones on commit and discards the rest", async () => {
    svc.uploadPdf
      .mockResolvedValueOnce({ success: true, data: { path: "u/1-a.pdf", url: "https://signed/a" } })
      .mockResolvedValueOnce({ success: true, data: { path: "u/2-b.pdf" } });
    const { result } = renderHook(() => useNoteAttachments(null));
    await act(async () => {
      expect(await result.current.attach(pdf("a.pdf"))).toMatchObject({ success: true, data: { path: "u/1-a.pdf" } });
      await result.current.attach(pdf("b.pdf"));
    });
    const content = "[PDF: a.pdf](attachment:u/1-a.pdf)";
    expect(result.current.linked(content)).toEqual([{ name: "a.pdf", url: "https://signed/a", path: "u/1-a.pdf" }]);

    let res: Awaited<ReturnType<typeof result.current.commit>> | undefined;
    await act(async () => {
      res = await result.current.commit("n9", content);
    });
    expect(res?.success).toBe(true);
    expect(svc.linkAttachments).toHaveBeenCalledWith("n9", [{ path: "u/1-a.pdf", file_name: "a.pdf" }]);
    expect(svc.discardPdfUploads).toHaveBeenCalledWith(["u/2-b.pdf"]);
    expect(svc.removeAttachments).toHaveBeenCalledWith("n9", []);
  });

  it("drops saved attachments whose link was removed and reports the first failure", async () => {
    svc.getAttachments.mockResolvedValue([{ name: "old.pdf", url: "https://signed/old", path: "u/old.pdf" }]);
    svc.removeAttachments.mockResolvedValue({ success: false, message: "denied" });
    const { result } = renderHook(() => useNoteAttachments("n1"));
    await waitFor(() => expect(result.current.linked("[o](attachment:u/old.pdf)")).toHaveLength(1));
    let res: Awaited<ReturnType<typeof result.current.commit>> | undefined;
    await act(async () => {
      res = await result.current.commit("n1", "no links left");
    });
    expect(svc.removeAttachments).toHaveBeenCalledWith("n1", ["u/old.pdf"]);
    expect(res).toMatchObject({ success: false, message: "denied" });
  });

  it("discards uploads still pending on unmount, but not committed ones", async () => {
    const { result, unmount } = renderHook(() => useNoteAttachments(null));
    await act(async () => {
      await result.current.attach(pdf());
    });
    unmount();
    expect(svc.discardPdfUploads).toHaveBeenLastCalledWith(["u/1-a.pdf"]);

    const second = renderHook(() => useNoteAttachments(null));
    await act(async () => {
      await second.result.current.attach(pdf());
      await second.result.current.commit("n1", "[PDF: a.pdf](attachment:u/1-a.pdf)");
    });
    second.unmount();
    expect(svc.discardPdfUploads).toHaveBeenLastCalledWith([]);
  });
});
