/**
 * lib/unlock.ts — unlock code validation + unlocked-state storage.
 * Step 13a: hashCode / isValidUnlockCode (pure-ish: deterministic, no
 * mutation, only I/O is the crypto computation itself — no wiring yet).
 * Step 13b: isUnlocked / setUnlocked (storage wrapper, same injectable
 * pattern as lib/usage.ts) + PaywallModal wiring.
 *
 * SECURITY NOTE, per PROJECT_PLAN §13's own "v1" framing: this is a
 * deliberately lightweight, client-side-only check. Hashing the code
 * instead of shipping it in plaintext raises the bar above trivial
 * view-source discovery, but it is NOT robust access control — the hash
 * and the comparison logic both ship in the client bundle, so nothing here
 * can detect a code being shared between users or revoke a leaked one.
 * DOCUMENTED UPGRADE PATH: move validation to a server route backed by a
 * real database of issued/redeemed codes (mark codes used, tie to a
 * purchase record) before this needs to resist real abuse.
 */

import type { StorageLike } from "./usage";

const UNLOCK_STORAGE_KEY = "syllabus2cal:unlocked";

/**
 * Hashes of currently-valid unlock codes (of the lowercased, trimmed code
 * string). PLACEHOLDER: seeded with one demo code, "SYLLABUS2CAL-DEMO", so
 * the flow is testable end to end today.
 *
 * TODO(owner): replace with real codes before launch. To add one: hash the
 * lowercased, trimmed code with SHA-256 and add the hex digest below. Quick
 * way to generate one — paste into a browser console or `node`:
 *   crypto.subtle.digest("SHA-256", new TextEncoder().encode("your-code"))
 *     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")))
 */
const VALID_CODE_HASHES = new Set<string>([
  "e3b0710265ff5a7acd652dcf7df63c3cb58dbba0e2685826dae279d514b2aa38", // "syllabus2cal-demo"
]);

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

/** SHA-256 hex digest of a (normalized) code, via the standard Web Crypto API — works identically in the browser and in Node's test environment. */
export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeCode(code));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Case-insensitive, whitespace-tolerant check against the valid code set. */
export async function isValidUnlockCode(code: string): Promise<boolean> {
  if (!normalizeCode(code)) return false;
  const hash = await hashCode(code);
  return VALID_CODE_HASHES.has(hash);
}

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  return window.localStorage;
}

/** Has this browser already been unlocked? Storage injectable for testing, same pattern as lib/usage.ts. */
export function isUnlocked(storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  return storage.getItem(UNLOCK_STORAGE_KEY) === "true";
}

/** Persists the unlocked state. Call only after isValidUnlockCode() succeeds. */
export function setUnlocked(storage: StorageLike | null = defaultStorage()): void {
  storage?.setItem(UNLOCK_STORAGE_KEY, "true");
}
