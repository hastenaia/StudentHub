import * as React from "react";
import { useForm } from "react-hook-form";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

/** A form with a raw <textarea> and a Select, both flagged invalid on mount. */
function Harness() {
  const form = useForm<{ notes: string; kind: string }>({ defaultValues: { notes: "", kind: "a" } });
  React.useEffect(() => {
    form.setError("notes", { message: "Required" });
    form.setError("kind", { message: "Required" });
  }, [form]);
  return (
    <Form {...form}>
      <FormField
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <textarea {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        name="kind"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Kind</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="a">A</option>
              </Select>
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("FormControl", () => {
  it("marks invalid fields with aria-invalid without leaking `error` onto DOM elements", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Harness />);

    const notes = screen.getByLabelText("Notes");
    const kind = screen.getByLabelText("Kind");
    await waitFor(() => expect(notes).toHaveAttribute("aria-invalid", "true"));
    expect(kind).toHaveAttribute("aria-invalid", "true");

    expect(notes).not.toHaveAttribute("error");
    expect(kind).not.toHaveAttribute("error");
    expect(kind).toHaveClass("border-red-500");
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("non-boolean attribute");
  });
});
