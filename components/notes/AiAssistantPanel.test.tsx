import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiAssistantPanel } from "./AiAssistantPanel";
import { mockQuiz } from "@/lib/mocks/notes";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Picks an option for the current question and lets the 600ms advance run. */
function answer(optionText: string) {
  fireEvent.click(screen.getByRole("button", { name: optionText }));
  act(() => vi.advanceTimersByTime(600));
}

describe("AiAssistantPanel quiz", () => {
  it("reaches 'Quiz complete' after the last question, with the right score, and can retry", () => {
    render(<AiAssistantPanel />);
    fireEvent.click(screen.getByRole("button", { name: /quiz/i }));

    // Answer every question correctly except the first.
    mockQuiz.forEach((q, i) => {
      expect(screen.getByText(new RegExp(`^Q${i + 1}\\.`))).toBeInTheDocument();
      const option = i === 0 ? q.options[(q.answer + 1) % q.options.length] : q.options[q.answer];
      answer(option);
    });

    // Regression: the last answer used to leave the quiz stuck on the final question.
    expect(screen.getByText("Quiz complete!")).toBeInTheDocument();
    expect(screen.getByText(`You scored ${mockQuiz.length - 1}/${mockQuiz.length}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText(/^Q1\./)).toBeInTheDocument();
    expect(screen.getByText(`Score: 0/${mockQuiz.length}`)).toBeInTheDocument();
  });

  it("locks the options after a pick until the question advances", () => {
    render(<AiAssistantPanel />);
    fireEvent.click(screen.getByRole("button", { name: /quiz/i }));
    const [first, second] = mockQuiz[0].options;
    fireEvent.click(screen.getByRole("button", { name: first }));
    expect(screen.getByRole("button", { name: second })).toBeDisabled();
  });
});
