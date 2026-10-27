"use client";
import { useSyncExternalStore } from "react";
import { todayISO } from "./tasks";

const noop = () => () => {};

/** Today's date as YYYY-MM-DD on the client; empty string during prerender. */
export function useToday(): string {
  return useSyncExternalStore(noop, () => todayISO(), () => "");
}
