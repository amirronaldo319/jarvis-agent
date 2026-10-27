"use client";
import { useCallback, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, initial: T): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { /* storage blocked */ }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = initial;
  if (raw) { try { value = JSON.parse(raw) as T; } catch { value = initial; } }
  cache.set(key, { raw, value });
  return value;
}

export function useLocalStore<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback((cb: () => void) => {
    const set = listeners.get(key) ?? new Set();
    set.add(cb);
    listeners.set(key, set);
    window.addEventListener("storage", cb);
    return () => { set.delete(cb); window.removeEventListener("storage", cb); };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => read(key, initial), () => initial);
  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const prev = read(key, initial);
    const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
    try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* quota/blocked */ }
    cache.delete(key);
    listeners.get(key)?.forEach((cb) => cb());
  }, [key, initial]);
  return [value, setValue];
}

export const uid = () => crypto.randomUUID();
