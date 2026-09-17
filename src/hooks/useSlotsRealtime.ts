"use client";

import { useEffect, useState } from "react";
import type { Booking, LockInfo } from "@/types/booking";

type ConnectionStatus = "connecting" | "open" | "error";

interface Snapshot {
  bookings: Booking[];
  locks: LockInfo[];
}

interface RealtimeState {
  date: string;
  bookings: Booking[];
  locks: Record<string, LockInfo>;
  status: ConnectionStatus;
}

function emptyState(date: string): RealtimeState {
  return { date, bookings: [], locks: {}, status: "connecting" };
}

function parseEventData<T>(event: Event): T {
  return JSON.parse((event as MessageEvent).data) as T;
}

function withoutLock(locks: Record<string, LockInfo>, timeSlot: string): Record<string, LockInfo> {
  if (!(timeSlot in locks)) return locks;
  const next = { ...locks };
  delete next[timeSlot];
  return next;
}

/** Fetches the initial snapshot then keeps bookings/locks in sync via SSE. */
export function useSlotsRealtime(date: string) {
  const [state, setState] = useState<RealtimeState>(() => emptyState(date));

  // Switching date resets the data during render instead of in an effect, so
  // no stale day is ever painted and no cascading render is triggered.
  const current = state.date === date ? state : emptyState(date);

  useEffect(() => {
    const source = new EventSource(`/api/events?date=${encodeURIComponent(date)}`);

    /** Ignores events arriving for a date the user has already navigated away from. */
    const update = (updater: (prev: RealtimeState) => RealtimeState) => {
      setState((prev) => updater(prev.date === date ? prev : emptyState(date)));
    };

    source.addEventListener("snapshot", (event) => {
      const snapshot = parseEventData<Snapshot>(event);
      const locks: Record<string, LockInfo> = {};
      for (const lock of snapshot.locks) locks[lock.timeSlot] = lock;
      update(() => ({ date, bookings: snapshot.bookings, locks, status: "open" }));
    });

    source.addEventListener("booking-created", (event) => {
      const { booking } = parseEventData<{ booking: Booking }>(event);
      update((prev) => ({
        ...prev,
        bookings: [...prev.bookings.filter((b) => b.id !== booking.id), booking],
        locks: withoutLock(prev.locks, booking.timeSlot),
      }));
    });

    source.addEventListener("booking-deleted", (event) => {
      const { id } = parseEventData<{ id: string }>(event);
      update((prev) => ({ ...prev, bookings: prev.bookings.filter((b) => b.id !== id) }));
    });

    source.addEventListener("lock-acquired", (event) => {
      const lock = parseEventData<LockInfo>(event);
      update((prev) => ({ ...prev, locks: { ...prev.locks, [lock.timeSlot]: lock } }));
    });

    source.addEventListener("lock-released", (event) => {
      const { timeSlot } = parseEventData<{ timeSlot: string }>(event);
      update((prev) => ({ ...prev, locks: withoutLock(prev.locks, timeSlot) }));
    });

    source.onerror = () => update((prev) => ({ ...prev, status: "error" }));

    return () => source.close();
  }, [date]);

  return { bookings: current.bookings, locks: current.locks, status: current.status };
}
