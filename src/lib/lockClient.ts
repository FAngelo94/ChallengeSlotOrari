"use client";

/**
 * Client-side owner of the temporary slot locks.
 *
 * It exists because a React effect alone is not enough: StrictMode mounts,
 * unmounts and remounts an effect back to back (and a user can re-select the
 * same slot just as fast), which fires POST /api/locks, DELETE /api/locks and
 * POST /api/locks nearly simultaneously on different connections. If the
 * DELETE happens to land last, the slot is unlocked while its form is still
 * open and other tabs see it as free again.
 *
 * Two guarantees fix that: requests for the same slot are serialized in a
 * queue, and a release is deferred by a short grace period so a lock that is
 * immediately re-acquired is never dropped.
 */

const RELEASE_GRACE_MS = 200;
const MIN_RENEW_MS = 1000;

interface LockEntry {
  clientId: string;
  holders: number;
  queue: Promise<void>;
  onDenied: (message: string) => void;
  renewTimer?: ReturnType<typeof setTimeout>;
  releaseTimer?: ReturnType<typeof setTimeout>;
}

const entries = new Map<string, LockEntry>();
let pageHideRegistered = false;

function keyOf(date: string, timeSlot: string): string {
  return `${date}|${timeSlot}`;
}

function lockRequest(method: "POST" | "DELETE", date: string, timeSlot: string, clientId: string) {
  return fetch("/api/locks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, timeSlot, clientId }),
    keepalive: method === "DELETE",
  });
}

async function deniedMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? "Slot non disponibile";
}

function enqueue(entry: LockEntry, operation: () => Promise<void>): void {
  entry.queue = entry.queue.then(operation, operation);
}

function acquire(key: string, date: string, timeSlot: string): void {
  const entry = entries.get(key);
  if (!entry) return;

  enqueue(entry, async () => {
    const current = entries.get(key);
    if (!current) return; // released while the previous request was in flight

    const res = await lockRequest("POST", date, timeSlot, current.clientId).catch(() => null);
    if (!res || !entries.has(key)) return;

    if (!res.ok) {
      current.onDenied(await deniedMessage(res));
      return;
    }

    const { expiresAt } = (await res.json()) as { expiresAt: string };
    const ttlMs = new Date(expiresAt).getTime() - Date.now();
    current.renewTimer = setTimeout(
      () => acquire(key, date, timeSlot),
      Math.max(MIN_RENEW_MS, Math.floor(ttlMs / 2))
    );
  });
}

function release(key: string, date: string, timeSlot: string): void {
  const entry = entries.get(key);
  if (!entry) return;

  entries.delete(key);
  clearTimeout(entry.renewTimer);
  enqueue(entry, async () => {
    await lockRequest("DELETE", date, timeSlot, entry.clientId).catch(() => {});
  });
}

/** Releases every held lock synchronously when the tab goes away. */
function registerPageHide(): void {
  if (pageHideRegistered || typeof window === "undefined") return;
  pageHideRegistered = true;

  window.addEventListener("pagehide", () => {
    for (const [key, entry] of entries) {
      const [date, timeSlot] = key.split("|");
      clearTimeout(entry.renewTimer);
      clearTimeout(entry.releaseTimer);
      lockRequest("DELETE", date, timeSlot, entry.clientId).catch(() => {});
    }
    entries.clear();
  });
}

/**
 * Holds a lock on (date, timeSlot) for as long as at least one caller needs
 * it, renewing it at half its TTL. The returned function gives the lock back.
 */
export function retainLock(
  date: string,
  timeSlot: string,
  clientId: string,
  onDenied: (message: string) => void
): () => void {
  registerPageHide();

  const key = keyOf(date, timeSlot);
  const existing = entries.get(key);

  if (existing) {
    clearTimeout(existing.releaseTimer);
    existing.releaseTimer = undefined;
    existing.holders += 1;
    existing.onDenied = onDenied;
  } else {
    entries.set(key, { clientId, holders: 1, queue: Promise.resolve(), onDenied });
    acquire(key, date, timeSlot);
  }

  let done = false;
  return () => {
    if (done) return;
    done = true;

    const current = entries.get(key);
    if (!current) return;

    current.holders -= 1;
    if (current.holders > 0) return;
    current.releaseTimer = setTimeout(() => release(key, date, timeSlot), RELEASE_GRACE_MS);
  };
}

/** Test-only helper: drops every held lock and timer without touching the API. */
export function __resetLockClientForTests(): void {
  for (const entry of entries.values()) {
    clearTimeout(entry.renewTimer);
    clearTimeout(entry.releaseTimer);
  }
  entries.clear();
}
