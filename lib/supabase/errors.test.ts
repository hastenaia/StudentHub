import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./errors";

describe("getAuthErrorMessage", () => {
  it("maps known auth errors to friendly messages", () => {
    expect(getAuthErrorMessage({ message: "Invalid login credentials" } as never)).toBe(
      "The email or password is incorrect."
    );
  });

  it("falls back to the raw message for unknown errors", () => {
    expect(getAuthErrorMessage({ message: "Random failure" } as never)).toBe(
      "Random failure"
    );
  });

  it("returns a generic message when no error is present", () => {
    expect(getAuthErrorMessage(null)).toBe("Something went wrong. Please try again.");
    expect(getAuthErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });
});
