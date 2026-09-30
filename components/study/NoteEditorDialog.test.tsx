import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteEditorDialog } from "./NoteEditorDialog";
import { notesClientService } from "@/services/notesClient.service";
import type { Note } from "@/types/study";

const toast = vi.fn();
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ toast, notify: vi.fn() }) }));
vi.mock("@/services/notesClient.service", () => ({
  notesClientService: {
    createNote: vi.fn(),
    updateNote: vi.fn(),
    getAttachments: vi.fn(),
    uploadPdf: vi.fn(),
    linkAttachments: vi.fn(),
    removeAttachments: vi.fn(),
    discardPdfUploads: vi.fn(),
  },
}));

const svc = vi.mocked(notesClientService);
const courses = [{ id: "c1", name: "Biology", color: "#0a0" }];
const note = (over: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Cells",
  content: "Mitochondria",
  favorite: false,
  tags: ["bio"],
  category: "Exams",
  courseId: "c1",
  courseName: null,
  courseColor: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  ...over,
});

function setup(props: Partial<React.ComponentProps<typeof NoteEditorDialog>> = {}) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<NoteEditorDialog note={null} defaultCategory={null} categories={["Exams"]} courses={courses} onSaved={onSaved} onClose={onClose} {...props} />);
  return { onSaved, onClose };
}

const content = () => screen.getByPlaceholderText(/Write in Markdown/) as HTMLTextAreaElement;
const submit = async (name: RegExp) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  svc.getAttachments.mockResolvedValue([]);
  svc.linkAttachments.mockResolvedValue({ success: true });
  svc.removeAttachments.mockResolvedValue({ success: true });
  svc.discardPdfUploads.mockResolvedValue();
  svc.uploadPdf.mockResolvedValue({ success: true, data: { path: "u/1-a.pdf", url: "https://signed/a" } });
});

describe("NoteEditorDialog", () => {
  it("creates a note in the default category and fills in the course name", async () => {
    svc.createNote.mockResolvedValue({ success: true, data: note({ id: "new", courseName: null }) });
    const { onSaved } = setup({ defaultCategory: "Exams" });
    expect(screen.getByRole("heading", { name: "New note" })).toBeTruthy();
    expect((screen.getByPlaceholderText(/Week 3/) as HTMLInputElement).value).toBe("Exams");

    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Cells" } });
    await submit(/Create/);

    expect(svc.createNote).toHaveBeenCalledWith(expect.objectContaining({ title: "Cells", category: "Exams" }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "new", courseName: "Biology", courseColor: "#0a0" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Note created" }));
  });

  it("updates an existing note and clears the course for notes without one", async () => {
    svc.updateNote.mockResolvedValue({ success: true, data: note({ courseId: null }) });
    const { onSaved } = setup({ note: note() });
    await waitFor(() => expect(svc.getAttachments).toHaveBeenCalledWith("n1"));
    expect((screen.getByLabelText("Title *") as HTMLInputElement).value).toBe("Cells");
    await submit(/Save/);
    expect(svc.updateNote).toHaveBeenCalledWith("n1", expect.objectContaining({ title: "Cells", tags: ["bio"] }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ courseName: null, courseColor: null }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Note updated" }));
  });

  it("reports a failed save without closing", async () => {
    svc.updateNote.mockResolvedValue({ success: false, message: "offline" });
    const { onSaved } = setup({ note: note() });
    await submit(/Save/);
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Failed", description: "offline", variant: "error" }));
  });

  it("warns when attachments couldn't be saved but still saves the note", async () => {
    svc.updateNote.mockResolvedValue({ success: true, data: note() });
    svc.removeAttachments.mockResolvedValue({ success: false, message: "denied" });
    const { onSaved } = setup({ note: note() });
    await submit(/Save/);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Attachments not fully saved", description: "denied" }));
    expect(onSaved).toHaveBeenCalled();
  });

  it("attaches a PDF as a link, lists it, and removes it again", async () => {
    setup();
    const input = screen.getByLabelText(/Attach PDF/) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(["%PDF"], "a.pdf", { type: "application/pdf" })] } });
    });
    expect(content().value).toContain("[PDF: a.pdf](attachment:u/1-a.pdf)");
    expect(screen.getByRole("link", { name: "a.pdf" }).getAttribute("href")).toBe("https://signed/a");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));

    fireEvent.click(screen.getByLabelText("Remove a.pdf"));
    expect(content().value).not.toContain("attachment:");
    expect(screen.queryByRole("link", { name: "a.pdf" })).toBeNull();
  });

  it("rejects non-PDFs and ignores an empty selection", async () => {
    setup();
    const input = screen.getByLabelText(/Attach PDF/) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
      fireEvent.change(input, { target: { files: [] } });
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Only PDF allowed", variant: "error" }));
    expect(svc.uploadPdf).not.toHaveBeenCalled();
  });

  it("formats content from the toolbar", () => {
    setup();
    fireEvent.change(content(), { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: "H1" }));
    fireEvent.click(screen.getByRole("button", { name: "• List" }));
    fireEvent.click(screen.getByRole("button", { name: "</>" }));
    expect(content().value).toBe("# hi\n- item`code`");
    content().setSelectionRange(2, 4);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(content().value).toBe("# **hi**\n- item`code`");
  });

  it("closes on cancel and on backdrop click, but not on clicks inside", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
