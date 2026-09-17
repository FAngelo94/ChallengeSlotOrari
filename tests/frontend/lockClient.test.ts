import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { __resetLockClientForTests, retainLock } from "@/lib/lockClient";

const DATE = "2026-01-10";
const SLOT = "09:00";
const CLIENT = "client-aaaaaaaa";

interface Call {
  method: string;
  settle: () => void;
}

function stubFetch(options: { delayPost?: boolean } = {}) {
  const calls: Call[] = [];

  const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const response = new Response(
      JSON.stringify({ locked: true, expiresAt: new Date(Date.now() + 30_000).toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    if (method === "POST" && options.delayPost) {
      let settle: () => void = () => {};
      const pending = new Promise<Response>((resolve) => {
        settle = () => resolve(response);
      });
      calls.push({ method, settle });
      return pending;
    }

    calls.push({ method, settle: () => {} });
    return Promise.resolve(response);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { calls, methods: () => calls.map((call) => call.method) };
}

describe("lockClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetLockClientForTests();
  });

  it("keeps the lock when the holder is re-created immediately (StrictMode remount)", async () => {
    const { methods } = stubFetch();

    const release = retainLock(DATE, SLOT, CLIENT, vi.fn());
    await waitFor(() => expect(methods()).toContain("POST"));
    release();
    retainLock(DATE, SLOT, CLIENT, vi.fn());

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(methods()).not.toContain("DELETE");
    expect(methods().filter((method) => method === "POST")).toHaveLength(1);
  });

  it("releases the lock once nobody holds it any more", async () => {
    const { methods } = stubFetch();

    const release = retainLock(DATE, SLOT, CLIENT, vi.fn());
    await waitFor(() => expect(methods()).toContain("POST"));
    release();

    await waitFor(() => expect(methods()).toContain("DELETE"), { timeout: 2000 });
  });

  it("never lets the release overtake the acquire request", async () => {
    const { calls, methods } = stubFetch({ delayPost: true });

    const release = retainLock(DATE, SLOT, CLIENT, vi.fn());
    await waitFor(() => expect(methods()).toContain("POST"));
    release();

    // The POST is still in flight: no DELETE may be sent before it resolves.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(methods()).not.toContain("DELETE");

    calls[0].settle();
    await waitFor(() => expect(methods()).toEqual(["POST", "DELETE"]), { timeout: 2000 });
  });

  it("reports the failure when the slot is locked by someone else", async () => {
    const onDenied = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "SLOT_LOCKED", message: "Occupato da altri" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    retainLock(DATE, SLOT, CLIENT, onDenied);

    await waitFor(() => expect(onDenied).toHaveBeenCalledWith("Occupato da altri"));
  });
});
