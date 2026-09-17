import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetLocksForTests,
  acquireLock,
  getActiveLock,
  releaseLock,
  releaseLockForSlot,
} from "@/lib/locks";

const DATE = "2026-01-10";
const SLOT = "09:00";

describe("locks (pure, no HTTP)", () => {
  beforeEach(() => {
    __resetLocksForTests();
    process.env.LOCK_TTL_MS = "1000";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("acquires a lock on a free slot", () => {
    const result = acquireLock(DATE, SLOT, "client-a");
    expect(result.ok).toBe(true);
    expect(getActiveLock(DATE, SLOT)?.clientId).toBe("client-a");
  });

  it("allows the same client to renew its own lock", () => {
    acquireLock(DATE, SLOT, "client-a");
    const renewed = acquireLock(DATE, SLOT, "client-a");
    expect(renewed.ok).toBe(true);
  });

  it("rejects acquisition by a different client while the lock is active", () => {
    acquireLock(DATE, SLOT, "client-a");
    const result = acquireLock(DATE, SLOT, "client-b");
    expect(result.ok).toBe(false);
  });

  it("allows another client to acquire once the lock has expired", () => {
    vi.useFakeTimers();
    acquireLock(DATE, SLOT, "client-a");
    vi.advanceTimersByTime(1500);
    const result = acquireLock(DATE, SLOT, "client-b");
    expect(result.ok).toBe(true);
  });

  it("releases explicitly and immediately frees the slot for others", () => {
    acquireLock(DATE, SLOT, "client-a");
    releaseLock(DATE, SLOT, "client-a");
    expect(getActiveLock(DATE, SLOT)).toBeUndefined();
    expect(acquireLock(DATE, SLOT, "client-b").ok).toBe(true);
  });

  it("release is a no-op when called by a client that does not own the lock", () => {
    acquireLock(DATE, SLOT, "client-a");
    releaseLock(DATE, SLOT, "client-b");
    expect(getActiveLock(DATE, SLOT)?.clientId).toBe("client-a");
  });

  it("releaseLockForSlot force-releases regardless of owner", () => {
    acquireLock(DATE, SLOT, "client-a");
    releaseLockForSlot(DATE, SLOT);
    expect(getActiveLock(DATE, SLOT)).toBeUndefined();
  });
});
