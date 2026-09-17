import { subscribe, type SlotEvent } from "@/lib/eventBus";

const PING_INTERVAL_MS = 15_000;

export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function formatEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Builds an SSE ReadableStream scoped to a date channel: sends an initial
 * snapshot, then forwards every live SlotEvent for that date, plus a
 * keepalive ping. Cleans up its subscription and timer when `signal` aborts
 * (client disconnects) so tabs closed in tests don't leak listeners.
 */
export function createSseStream(
  date: string,
  signal: AbortSignal,
  getSnapshot: () => Promise<unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const unsubscribe = subscribe(date, (event: SlotEvent) => {
        safeEnqueue(formatEvent(event.type, event));
      });

      const pingTimer = setInterval(() => safeEnqueue(": ping\n\n"), PING_INTERVAL_MS);
      pingTimer.unref?.();

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(pingTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      signal.addEventListener("abort", cleanup);

      const snapshot = await getSnapshot();
      safeEnqueue(formatEvent("snapshot", snapshot));
    },
  });
}
