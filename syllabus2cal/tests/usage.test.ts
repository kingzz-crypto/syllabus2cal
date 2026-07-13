import { describe, it, expect, beforeEach } from "vitest";
import {
  FREE_SYLLABUS_LIMIT,
  getUsageCount,
  hasExceededFreeLimit,
  incrementUsageCount,
  isOverFreeLimit,
  parseUsageCount,
  resetUsageCount,
  type StorageLike,
} from "@/lib/usage";

class FakeStorage implements StorageLike {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe("parseUsageCount", () => {
  it("returns 0 for null (never used before)", () => {
    expect(parseUsageCount(null)).toBe(0);
  });

  it.each([
    ["0", 0],
    ["1", 1],
    ["42", 42],
  ])("parses %s as %d", (raw, expected) => {
    expect(parseUsageCount(raw)).toBe(expected);
  });

  it.each(["abc", "-5", "", "NaN"])("falls back to 0 for corrupt/invalid value %s", (raw) => {
    expect(parseUsageCount(raw)).toBe(0);
  });

  it("truncates a non-integer value", () => {
    expect(parseUsageCount("3.7")).toBe(3);
  });
});

describe("hasExceededFreeLimit", () => {
  it("is false below the limit", () => {
    expect(hasExceededFreeLimit(0, 1)).toBe(false);
  });

  it("is true at exactly the limit", () => {
    expect(hasExceededFreeLimit(1, 1)).toBe(true);
  });

  it("is true above the limit", () => {
    expect(hasExceededFreeLimit(5, 1)).toBe(true);
  });

  it("defaults to FREE_SYLLABUS_LIMIT when no limit is given", () => {
    expect(hasExceededFreeLimit(FREE_SYLLABUS_LIMIT)).toBe(true);
    expect(hasExceededFreeLimit(FREE_SYLLABUS_LIMIT - 1)).toBe(false);
  });
});

describe("storage-backed counter (via injected FakeStorage)", () => {
  let storage: FakeStorage;

  beforeEach(() => {
    storage = new FakeStorage();
  });

  it("starts at 0 for a fresh storage", () => {
    expect(getUsageCount(storage)).toBe(0);
  });

  it("increments and persists across calls", () => {
    expect(incrementUsageCount(storage)).toBe(1);
    expect(incrementUsageCount(storage)).toBe(2);
    expect(getUsageCount(storage)).toBe(2);
  });

  it("resets back to 0", () => {
    incrementUsageCount(storage);
    incrementUsageCount(storage);
    resetUsageCount(storage);
    expect(getUsageCount(storage)).toBe(0);
  });

  it("isOverFreeLimit reflects real usage against the real limit", () => {
    expect(isOverFreeLimit(storage)).toBe(false);
    incrementUsageCount(storage);
    expect(isOverFreeLimit(storage)).toBe(true);
  });
});

describe("storage-unavailable fallback (storage = null, e.g. SSR/private browsing)", () => {
  it("getUsageCount safely returns 0", () => {
    expect(getUsageCount(null)).toBe(0);
  });

  it("incrementUsageCount safely no-ops, returning 0", () => {
    expect(incrementUsageCount(null)).toBe(0);
  });

  it("resetUsageCount does not throw", () => {
    expect(() => resetUsageCount(null)).not.toThrow();
  });

  it("isOverFreeLimit safely returns false rather than blocking the user", () => {
    expect(isOverFreeLimit(null)).toBe(false);
  });
});
