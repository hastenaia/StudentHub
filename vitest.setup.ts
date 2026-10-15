import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

/** In-memory Storage; newer Node versions ship an experimental global localStorage that shadows jsdom's and is undefined without a flag. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

// defineProperty rather than vi.stubGlobal so a test's own vi.unstubAllGlobals() doesn't remove it.
beforeEach(() => {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(globalThis, name, { value: memoryStorage(), configurable: true, writable: true });
  }
});
