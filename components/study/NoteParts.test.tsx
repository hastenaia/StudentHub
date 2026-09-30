import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteCard } from "./NoteCard";
import { NotesFilterBar } from "./NotesFilterBar";
import { NoteViewDialog } from "./NoteViewDialog";
import { notesClientService } from "@/services/notesClient.service";
import { EMPTY_NOTE_FILTERS } from "@/lib/notesForm";
import type { Note } from "@/types/study";

vi.mock("@/services/notesClient.service", () => ({ notesClientService: { getAttachments: vi.fn() } }));

const note = (over: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Cells",
  content: null,
  favorite: false,
  tags: [],
  category: null,
  courseId: null,
  courseName: null,
  courseColor: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-02T00:00:00Z",
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("NoteCard", () => {
  const handlers = () => ({ onView: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onToggleFavorite: vi.fn() });

  it("shows a bare note without optional chips", () => {
    render(<NoteCard note={note()} {...handlers()} />);
    expect(screen.getByRole("heading", { name: "Cells" })).toBeTruthy();
    expect(screen.getByLabelText("Favorite").getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("Biology")).toBeNull();
  });

  it("shows content, category, course and tags, and wires the actions", () => {
    const h = handlers();
    render(<NoteCard note={note({ favorite: true, content: "**Mito**", category: "Exams", courseName: "Biology", tags: ["bio"] })} {...h} />);
    expect(screen.getByLabelText("Favorite").getAttribute("aria-pressed")).toBe("true");
    for (const text of ["Mito", "Exams", "Biology", "bio"]) expect(screen.getByText(text)).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Favorite"));
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.click(screen.getByLabelText("Edit Cells"));
    fireEvent.click(screen.getByLabelText("Delete Cells"));
    expect([h.onToggleFavorite, h.onView, h.onEdit, h.onDelete].map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 1]);
  });
});

describe("NotesFilterBar", () => {
  const setup = (filters = EMPTY_NOTE_FILTERS) => {
    const onChange = vi.fn();
    render(
      <NotesFilterBar
        filters={filters}
        onChange={onChange}
        courses={[{ id: "c1", name: "Biology", color: null }]}
        tags={["bio"]}
        categories={[{ name: "Exams", count: 1 }]}
        uncategorized={0}
        onRenameCategory={vi.fn()}
      />
    );
    return onChange;
  };

  it("patches each filter", () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole("button", { name: /All/ }));
    fireEvent.change(screen.getByLabelText("Filter by course"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Filter by tag"), { target: { value: "bio" } });
    fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "Exams" } });
    expect(onChange.mock.calls.map(([f]) => f)).toEqual([
      { ...EMPTY_NOTE_FILTERS, favorite: true },
      { ...EMPTY_NOTE_FILTERS, course: "c1" },
      { ...EMPTY_NOTE_FILTERS, tag: "bio" },
      { ...EMPTY_NOTE_FILTERS, category: "Exams" },
    ]);
    expect(screen.queryByRole("button", { name: /Clear/ })).toBeNull();
  });

  it("offers Clear only while a filter is active", () => {
    const onChange = setup({ ...EMPTY_NOTE_FILTERS, favorite: true });
    expect(screen.getByRole("button", { name: /Favorites/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_NOTE_FILTERS);
  });
});

describe("NoteViewDialog", () => {
  it("resolves attachment links once they load and lists the files", async () => {
    vi.mocked(notesClientService.getAttachments).mockResolvedValue([{ name: "a.pdf", url: "https://signed/a", path: "u/a.pdf" }]);
    const onClose = vi.fn();
    render(<NoteViewDialog note={note({ content: "[PDF: a.pdf](attachment:u/a.pdf)", category: "Exams", tags: ["bio"] })} onClose={onClose} />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /a\.pdf/ })).toHaveLength(2));
    expect(screen.getByText("Attachments")).toBeTruthy();
    expect(screen.getByText(/^Exams • /)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows no attachment section without files", async () => {
    vi.mocked(notesClientService.getAttachments).mockResolvedValue([]);
    render(<NoteViewDialog note={note({ content: "plain" })} onClose={vi.fn()} />);
    await waitFor(() => expect(notesClientService.getAttachments).toHaveBeenCalledWith("n1"));
    expect(screen.queryByText("Attachments")).toBeNull();
    expect(screen.getByText("plain")).toBeTruthy();
  });
});
