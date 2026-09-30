import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoteCategoryFilter } from "./NoteCategoryFilter";
import { UNCATEGORIZED_FILTER } from "@/lib/noteCategories";

const categories = [
  { name: "Exams", count: 2 },
  { name: "Labs", count: 1 },
];

function setup(value: string, onRename = vi.fn().mockResolvedValue(true)) {
  const onChange = vi.fn();
  const utils = render(
    <NoteCategoryFilter categories={categories} uncategorized={3} value={value} onChange={onChange} onRename={onRename} />
  );
  return { ...utils, onChange, onRename };
}

afterEach(() => vi.restoreAllMocks());

describe("NoteCategoryFilter", () => {
  it("lists categories with counts and reports the selection", () => {
    const { onChange } = setup("all");
    expect(screen.getByRole("option", { name: "Exams (2)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Uncategorized (3)" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "Labs" } });
    expect(onChange).toHaveBeenCalledWith("Labs");
  });

  it.each(["all", UNCATEGORIZED_FILTER])("hides rename/remove when %s is selected", (value) => {
    setup(value);
    expect(screen.queryByLabelText(/Rename category/)).toBeNull();
    expect(screen.queryByLabelText(/Remove category/)).toBeNull();
  });

  it("renames the selected category and closes the form on success", async () => {
    const { onRename } = setup("Exams");
    fireEvent.click(screen.getByLabelText("Rename category Exams"));
    fireEvent.change(screen.getByLabelText("Rename Exams"), { target: { value: "Finals" } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Save category name"));
    });
    expect(onRename).toHaveBeenCalledWith("Exams", "Finals");
    expect(screen.queryByLabelText("Rename Exams")).toBeNull();
  });

  it("normalizes the new name and skips unchanged names", async () => {
    const { onRename } = setup("Exams");
    fireEvent.click(screen.getByLabelText("Rename category Exams"));
    fireEvent.change(screen.getByLabelText("Rename Exams"), { target: { value: "  Exams " } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Save category name"));
    });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Rename Exams")).toBeNull();

    fireEvent.click(screen.getByLabelText("Rename category Exams"));
    fireEvent.change(screen.getByLabelText("Rename Exams"), { target: { value: "   " } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Save category name"));
    });
    expect(onRename).toHaveBeenCalledWith("Exams", null);
  });

  it("keeps the rename form open when the rename fails", async () => {
    setup("Exams", vi.fn().mockResolvedValue(false));
    fireEvent.click(screen.getByLabelText("Rename category Exams"));
    fireEvent.change(screen.getByLabelText("Rename Exams"), { target: { value: "Finals" } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Save category name"));
    });
    expect(screen.getByLabelText("Rename Exams")).toBeTruthy();
  });

  it("cancels a rename without calling onRename", () => {
    const { onRename } = setup("Exams");
    fireEvent.click(screen.getByLabelText("Rename category Exams"));
    fireEvent.click(screen.getByLabelText("Cancel rename"));
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Rename category Exams")).toBeTruthy();
  });

  it("drops a stale rename when the selected category changes", () => {
    const { rerender, onChange, onRename } = setup("Exams");
    fireEvent.click(screen.getByLabelText("Rename category Exams"));
    rerender(<NoteCategoryFilter categories={categories} uncategorized={3} value="Labs" onChange={onChange} onRename={onRename} />);
    expect(screen.queryByLabelText("Rename Exams")).toBeNull();
    expect(screen.getByLabelText("Rename category Labs")).toBeTruthy();
  });

  it("removes a category only after confirmation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { onRename } = setup("Labs");
    fireEvent.click(screen.getByLabelText("Remove category Labs"));
    expect(onRename).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Remove category Labs"));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("Its 1 note will be kept"));
    expect(onRename).toHaveBeenCalledWith("Labs", null);
  });
});
