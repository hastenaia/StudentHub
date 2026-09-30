import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardCard } from "./FlashcardCard";
import { FlashcardDialog } from "./FlashcardDialog";
import { FlashcardStudy } from "./FlashcardStudy";
import { flashcardsClientService } from "@/services/flashcardsClient.service";
import type { Flashcard } from "@/types/study";

const toast = vi.fn();
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ toast, notify: vi.fn() }) }));
vi.mock("@/services/flashcardsClient.service", () => ({
  flashcardsClientService: { createFlashcard: vi.fn(), updateFlashcard: vi.fn() },
}));

const svc = vi.mocked(flashcardsClientService);
const courses = [{ id: "c1", name: "Biology", color: null }];
const card = (id: string, over: Partial<Flashcard> = {}): Flashcard => ({
  id,
  courseId: null,
  courseName: null,
  noteId: null,
  front: `Q${id}`,
  back: `A${id}`,
  tags: ["t"],
  isKnown: false,
  correctCount: 0,
  incorrectCount: 0,
  lastReviewed: null,
  createdAt: "2026-09-01T00:00:00Z",
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("FlashcardCard", () => {
  it("labels known and unknown cards and wires the actions", () => {
    const h = { onEdit: vi.fn(), onDelete: vi.fn(), onStudy: vi.fn() };
    const { rerender } = render(<FlashcardCard card={card("1")} {...h} />);
    expect(screen.getByText("Unknown")).toBeTruthy();
    rerender(<FlashcardCard card={card("1", { isKnown: true })} {...h} />);
    expect(screen.getByText("Known")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Edit Q1"));
    fireEvent.click(screen.getByLabelText("Delete Q1"));
    fireEvent.click(screen.getByLabelText("Study"));
    expect([h.onEdit, h.onDelete, h.onStudy].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });
});

describe("FlashcardStudy", () => {
  it("flips, advances on a saved mark and wraps around", async () => {
    const onMark = vi.fn().mockResolvedValue(true);
    render(<FlashcardStudy deck={[card("1"), card("2")]} progress={50} onMark={onMark} onExit={vi.fn()} />);
    expect(screen.getByText("1 / 2 • 50% known")).toBeTruthy();
    fireEvent.click(screen.getByText("Q1"));
    expect(screen.getByText("A1")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Known/ })));
    expect(onMark).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), true);
    expect(screen.getByText("Q2")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Unknown/ })));
    expect(onMark).toHaveBeenLastCalledWith(expect.objectContaining({ id: "2" }), false);
    expect(screen.getByText("Q1")).toBeTruthy();
  });

  it("stays on the card when the mark fails", async () => {
    render(<FlashcardStudy deck={[card("1"), card("2")]} progress={0} onMark={vi.fn().mockResolvedValue(false)} onExit={vi.fn()} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Known/ })));
    expect(screen.getByText("Q1")).toBeTruthy();
  });

  it("shows an empty state and exits", () => {
    const onExit = vi.fn();
    render(<FlashcardStudy deck={[]} progress={0} onMark={vi.fn()} onExit={onExit} />);
    expect(screen.getByText("No cards to study")).toBeTruthy();
    expect(screen.getByText("No cards • 0% known")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Exit Study/ }));
    expect(onExit).toHaveBeenCalled();
  });
});

describe("FlashcardDialog", () => {
  const setup = (editing: Flashcard | null) => {
    const onSaved = vi.fn();
    render(<FlashcardDialog editing={editing} courses={courses} notes={[{ id: "n1", title: "Cells" }]} onClose={vi.fn()} onSaved={onSaved} />);
    return onSaved;
  };

  it("creates a card and fills in its course name", async () => {
    svc.createFlashcard.mockResolvedValue({ success: true, data: card("new", { courseId: "c1" }) });
    const onSaved = setup(null);
    fireEvent.change(screen.getByLabelText("Front *"), { target: { value: "Q" } });
    fireEvent.change(screen.getByLabelText("Back *"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Tags (comma)"), { target: { value: "x, y" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create" })));
    expect(svc.createFlashcard).toHaveBeenCalledWith({ front: "Q", back: "A", tags: ["x", "y"], courseId: null, noteId: null });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "new", courseName: "Biology" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Flashcard created" }));
  });

  it("updates an existing card", async () => {
    svc.updateFlashcard.mockResolvedValue({ success: true, data: card("1") });
    const onSaved = setup(card("1"));
    expect((screen.getByLabelText("Front *") as HTMLInputElement).value).toBe("Q1");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(svc.updateFlashcard).toHaveBeenCalledWith("1", expect.objectContaining({ front: "Q1" }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ courseName: null }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Flashcard updated" }));
  });

  it("reports a failed save", async () => {
    svc.updateFlashcard.mockResolvedValue({ success: false, message: "nope" });
    const onSaved = setup(card("1"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Failed", description: "nope" }));
  });
});
