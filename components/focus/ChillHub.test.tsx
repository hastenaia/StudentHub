import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChillHub } from "./ChillHub";

function mockAudioContext() {
  const makeParam = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
  });
  const makeGain = () => ({ gain: makeParam(), connect: vi.fn(), disconnect: vi.fn() });
  class MockAudioContext {
    sampleRate = 44100;
    currentTime = 0;
    state = "running";
    destination = {};
    resume = vi.fn();
    close = vi.fn();
    createGain = () => makeGain();
    createOscillator = () => ({
      type: "sine",
      frequency: makeParam(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    });
    createBiquadFilter = () => ({ type: "lowpass", frequency: makeParam(), Q: makeParam(), connect: vi.fn(), disconnect: vi.fn() });
    createBuffer = () => ({ getChannelData: () => new Float32Array(8) });
    createBufferSource = () => ({ buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() });
  }
  vi.stubGlobal("AudioContext", MockAudioContext);
}

beforeEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  mockAudioContext();
  vi.useFakeTimers();
});

describe("ChillHub single-track playback", () => {
  it("switches tracks so only one Stop button exists", () => {
    render(<ChillHub />);
    fireEvent.click(screen.getByRole("button", { name: "Play Rain" }));
    expect(screen.getByRole("button", { name: "Stop Rain" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Play Forest" }));
    expect(screen.queryByRole("button", { name: "Stop Rain" })).toBeNull();
    expect(screen.getByRole("button", { name: "Stop Forest" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Stop / })).toHaveLength(1);
  });

  it("toggles the active track off", () => {
    render(<ChillHub />);
    fireEvent.click(screen.getByRole("button", { name: "Play Lo-fi" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop Lo-fi" }));
    expect(screen.queryByRole("button", { name: /^Stop / })).toBeNull();
    expect(screen.getByRole("button", { name: "Play Lo-fi" })).toBeTruthy();
  });

  it("handles rapid switching without leaving two tracks active", () => {
    render(<ChillHub />);
    fireEvent.click(screen.getByRole("button", { name: "Play Rain" }));
    fireEvent.click(screen.getByRole("button", { name: "Play Café" }));
    fireEvent.click(screen.getByRole("button", { name: "Play White Noise" }));
    expect(screen.getAllByRole("button", { name: /^Stop / })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Stop White Noise" })).toBeTruthy();
  });
});
