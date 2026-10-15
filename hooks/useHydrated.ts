"use client";

import * as React from "react";

function subscribeToNothing() {
  return () => {};
}

const getHydrated = () => true;
const getHydratedOnServer = () => false;

/** False during server render and hydration, true once running in the browser. */
export function useHydrated() {
  return React.useSyncExternalStore(subscribeToNothing, getHydrated, getHydratedOnServer);
}
