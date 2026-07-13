import { describe, it, expect } from "vitest";
import { hashCode, isValidUnlockCode, isUnlocked, setUnlocked } from "@/lib/unlock";
import { isOverFreeLimit, incrementUsageCount, type StorageLike } from "@/lib/usage";

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

describe("hashCode", () => {
  it("is deterministic", async () => {
    const a = await hashCode("some-code");
    const b = await hashCode("some-code");
    expect(a).toBe(b);
  });

  it("produces a 64-character hex digest (SHA-256)", async () => {
    const hash = await hashCode("some-code");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normalizes case and whitespace before hashing", async () => {
    const a = await hashCode("SYLLABUS2CAL-DEMO");
    const b = await hashCode("  syllabus2cal-demo  ");
    expect(a).toBe(b);
  });

  it("different codes produce different hashes", async () => {
    const a = await hashCode("code-one");
    const b = await hashCode("code-two");
    expect(a).not.toBe(b);
  });
});

describe("isValidUnlockCode", () => {
  it("accepts the seeded demo code", async () => {
    expect(await isValidUnlockCode("SYLLABUS2CAL-DEMO")).toBe(true);
  });

  it("is case-insensitive and whitespace-tolerant", async () => {
    expect(await isValidUnlockCode("  syllabus2cal-demo  ")).toBe(true);
    expect(await isValidUnlockCode("Syllabus2Cal-Demo")).toBe(true);
  });

  it("rejects an incorrect code", async () => {
    expect(await isValidUnlockCode("wrong-code")).toBe(false);
  });

  it("rejects an empty or whitespace-only code", async () => {
    expect(await isValidUnlockCode("")).toBe(false);
    expect(await isValidUnlockCode("   ")).toBe(false);
  });
});

describe("isUnlocked / setUnlocked", () => {
  it("starts locked on fresh storage", () => {
    expect(isUnlocked(new FakeStorage())).toBe(false);
  });

  it("becomes unlocked after setUnlocked", () => {
    const storage = new FakeStorage();
    setUnlocked(storage);
    expect(isUnlocked(storage)).toBe(true);
  });

  it("safely reports locked when storage is unavailable", () => {
    expect(isUnlocked(null)).toBe(false);
  });

  it("setUnlocked does not throw when storage is unavailable", () => {
    expect(() => setUnlocked(null)).not.toThrow();
  });
});

describe("isOverFreeLimit respects the unlocked state (13b integration)", () => {
  it("an unlocked user is never over the limit, regardless of usage count", () => {
    const storage = new FakeStorage();
    incrementUsageCount(storage);
    incrementUsageCount(storage);
    incrementUsageCount(storage);
    expect(isOverFreeLimit(storage)).toBe(true); // locked + over limit
    setUnlocked(storage);
    expect(isOverFreeLimit(storage)).toBe(false); // unlocked overrides usage count
  });

  it("a locked user with 0 uses is not over the limit", () => {
    expect(isOverFreeLimit(new FakeStorage())).toBe(false);
  });
});
