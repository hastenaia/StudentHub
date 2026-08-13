"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook backed by useSyncExternalStore.
 * The server snapshot (false) is separate from the client snapshot, so the
 * initial server render can't mismatch hydration, and there's no
 * setState-in-effect cascade (react-hooks/set-state-in-effect).
 */
function subscribe(query: string) {
  return (onChange: () => void) => {
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener("change", onChange);
    return () => mediaQueryList.removeEventListener("change", onChange);
  };
}

function getSnapshot(query: string): boolean {
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => getSnapshot(query),
    () => false
  );
}