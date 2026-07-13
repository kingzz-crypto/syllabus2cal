/**
 * lib/usage.ts — localStorage free-tier usage counter (Step 12a). No UI here.
 *
 * Split per PROJECT_PLAN's own phrasing ("pure helpers + storage wrapper"):
 *   - parseUsageCount / hasExceededFreeLimit: pure, no I/O.
 *   - getUsageCount / incrementUsageCount / resetUsageCount: thin wrapper
 *     around storage, with the storage object injectable (same pattern as
 *     lib/gemini.ts's `callGemini` dependency) so this is fully testable
 *     without a DOM/jsdom environment, which this project doesn't have set up.
 * Defaults to the real `window.localStorage` in production; falls back to a
 * safe no-op (treats the user as having 0 uses) if storage is unavailable —
 * SSR, older browsers, or private-browsing modes that block it.
 */

import { isUnlocked } from "./unlock";

export const FREE_SYLLABUS_LIMIT = 1;
const USAGE_KEY = "syllabus2cal:usageCount";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  return window.localStorage;
}

/** Pure: turns a raw stored value into a safe non-negative integer count. */
export function parseUsageCount(raw: string | null): number {
  if (raw === null) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Pure: has this many uses reached/exceeded the free limit? */
export function hasExceededFreeLimit(count: number, limit: number = FREE_SYLLABUS_LIMIT): boolean {
  return count >= limit;
}

/** Current usage count. Returns 0 if storage is unavailable. */
export function getUsageCount(storage: StorageLike | null = defaultStorage()): number {
  if (!storage) return 0;
  return parseUsageCount(storage.getItem(USAGE_KEY));
}

/** Increments and persists the usage count. Returns the new count (0 if storage is unavailable — a no-op, not a silent failure to track). */
export function incrementUsageCount(storage: StorageLike | null = defaultStorage()): number {
  if (!storage) return 0;
  const next = getUsageCount(storage) + 1;
  storage.setItem(USAGE_KEY, String(next));
  return next;
}

/** Resets usage to 0. Exposed for tests/debugging. */
export function resetUsageCount(storage: StorageLike | null = defaultStorage()): void {
  storage?.removeItem(USAGE_KEY);
}

/**
 * Should the paywall trigger right now? Step 13b: an unlocked user never
 * hits the limit, regardless of usage count. isUnlocked lives in
 * lib/unlock.ts to keep "how many times used" and "is this user paid" as
 * separate concerns; combined only here, at the point of decision.
 * (No circular-import issue: unlock.ts's import of this file is type-only
 * and is erased at compile time.)
 */
export function isOverFreeLimit(storage: StorageLike | null = defaultStorage()): boolean {
  if (isUnlocked(storage)) return false;
  return hasExceededFreeLimit(getUsageCount(storage));
}
