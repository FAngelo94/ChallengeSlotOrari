"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "slot-booking-client-id";
const CHANNEL_NAME = "slot-booking-client-id";

type ClaimMessage = { type: "claim" | "taken"; id: string };

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Per-tab identifier persisted in sessionStorage, so two browser tabs get two
 * different ids and can be told apart by the lock/realtime backend.
 * Returns "" until the client-only id is ready (avoids SSR/CSR mismatch).
 *
 * Duplicating a tab copies its sessionStorage, so the copy would start out
 * with the same id as the original and would see the original's locks as its
 * own. To avoid that, every tab claims its id on a BroadcastChannel: whoever
 * already owns it answers "taken" and the newcomer regenerates.
 */
export function useClientId(): string {
  const [clientId, setClientId] = useState("");
  const idRef = useRef("");

  useEffect(() => {
    const assign = (id: string) => {
      idRef.current = id;
      window.sessionStorage.setItem(STORAGE_KEY, id);
      setClientId(id);
    };

    assign(window.sessionStorage.getItem(STORAGE_KEY) ?? generateId());

    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent<ClaimMessage>) => {
      const message = event.data;
      if (message?.id !== idRef.current) return;

      if (message.type === "claim") {
        channel.postMessage({ type: "taken", id: idRef.current } satisfies ClaimMessage);
        return;
      }
      const fresh = generateId();
      assign(fresh);
      channel.postMessage({ type: "claim", id: fresh } satisfies ClaimMessage);
    };

    channel.postMessage({ type: "claim", id: idRef.current } satisfies ClaimMessage);

    return () => channel.close();
  }, []);

  return clientId;
}
