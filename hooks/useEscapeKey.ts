"use client";

import * as React from "react";

/** Calls `onEscape` when Escape is pressed while `active` (e.g. to close an open dialog). */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  React.useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}
