import { publish } from "@/lib/eventBus";

interface LockEntry {
  clientId: string;
  expiresAt: number;
}

declare global {
   
  var __slotLocks: Map<string, LockEntry> | undefined;
   
  var __slotLockSweepStarted: boolean | undefined;
}

const locks = globalThis.__slotLocks ?? new Map<string, LockEntry>();
globalThis.__slotLocks = locks;

function key(date: string, timeSlot: string): string {
  return `${date}__${timeSlot}`;
}

export function getLockTtlMs(): number {
  const raw = Number(process.env.LOCK_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
}

export type AcquireResult =
  | { ok: true; expiresAt: number }
  | { ok: false; reason: "locked-by-other" };

/** Acquire a new lock, or renew it if the same clientId already owns it. */
export function acquireLock(date: string, timeSlot: string, clientId: string): AcquireResult {
  const k = key(date, timeSlot);
  const now = Date.now();
  const existing = locks.get(k);

  if (existing && existing.clientId !== clientId && existing.expiresAt > now) {
    return { ok: false, reason: "locked-by-other" };
  }

  const expiresAt = now + getLockTtlMs();
  locks.set(k, { clientId, expiresAt });
  publish({
    type: "lock-acquired",
    date,
    timeSlot,
    clientId,
    expiresAt: new Date(expiresAt).toISOString(),
  });
  return { ok: true, expiresAt };
}

/** Release a lock. Idempotent: releasing a non-existent or already-expired lock is a no-op. */
export function releaseLock(date: string, timeSlot: string, clientId: string): void {
  const k = key(date, timeSlot);
  const existing = locks.get(k);
  if (!existing || existing.clientId !== clientId) return;

  locks.delete(k);
  publish({ type: "lock-released", date, timeSlot });
}

/** Force-release a lock regardless of owner, e.g. once a booking is confirmed for that slot. */
export function releaseLockForSlot(date: string, timeSlot: string): void {
  const k = key(date, timeSlot);
  if (!locks.delete(k)) return;
  publish({ type: "lock-released", date, timeSlot });
}

export function getActiveLock(date: string, timeSlot: string): LockEntry | undefined {
  const k = key(date, timeSlot);
  const existing = locks.get(k);
  if (!existing) return undefined;
  if (existing.expiresAt <= Date.now()) {
    locks.delete(k);
    return undefined;
  }
  return existing;
}

export function getActiveLocksForDate(date: string): Array<{ timeSlot: string; clientId: string; expiresAt: number }> {
  const prefix = `${date}__`;
  const now = Date.now();
  const result: Array<{ timeSlot: string; clientId: string; expiresAt: number }> = [];

  for (const [k, entry] of locks.entries()) {
    if (!k.startsWith(prefix)) continue;
    if (entry.expiresAt <= now) continue;
    result.push({ timeSlot: k.slice(prefix.length), clientId: entry.clientId, expiresAt: entry.expiresAt });
  }

  return result;
}

function sweepExpiredLocks(): void {
  const now = Date.now();
  for (const [k, entry] of locks.entries()) {
    if (entry.expiresAt > now) continue;
    const [date, timeSlot] = k.split("__");
    locks.delete(k);
    publish({ type: "lock-released", date, timeSlot });
  }
}

export function startLockSweeper(intervalMs = 5000): void {
  if (globalThis.__slotLockSweepStarted) return;
  globalThis.__slotLockSweepStarted = true;
  const timer = setInterval(sweepExpiredLocks, intervalMs);
  timer.unref?.();
}

/** Test-only helper to reset in-memory lock state between test cases. */
export function __resetLocksForTests(): void {
  locks.clear();
}
