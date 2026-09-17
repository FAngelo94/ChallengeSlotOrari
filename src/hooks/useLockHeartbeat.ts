"use client";

import { useEffect, useRef } from "react";
import { retainLock } from "@/lib/lockClient";

/**
 * Keeps a temporary lock on (date, timeSlot) alive for as long as the
 * component using it stays mounted, and releases it on unmount. The actual
 * acquire/renew/release sequencing lives in `lockClient`, which serializes the
 * requests so a remount can never release a lock it is re-acquiring.
 * Calls onDenied if the lock cannot be taken (held by another client, or the
 * slot is already booked).
 */
export function useLockHeartbeat(
  date: string,
  timeSlot: string,
  clientId: string,
  onDenied: (message: string) => void
) {
  const onDeniedRef = useRef(onDenied);
  useEffect(() => {
    onDeniedRef.current = onDenied;
  }, [onDenied]);

  useEffect(() => {
    if (!clientId) return;
    return retainLock(date, timeSlot, clientId, (message) => onDeniedRef.current(message));
  }, [date, timeSlot, clientId]);
}
