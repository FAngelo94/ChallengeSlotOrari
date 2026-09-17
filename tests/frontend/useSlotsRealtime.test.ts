import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSlotsRealtime } from "@/hooks/useSlotsRealtime";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners: Record<string, Array<(event: MessageEvent) => void>> = {};
  onerror: (() => void) | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (event: MessageEvent) => void) {
    (this.listeners[type] ??= []).push(cb);
  }

  removeEventListener() {
    // not needed for these tests
  }

  close() {
    // not needed for these tests
  }

  emit(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners[type]?.forEach((cb) => cb(event));
  }
}

describe("useSlotsRealtime", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  it("applies the initial snapshot", async () => {
    const { result } = renderHook(() => useSlotsRealtime("2026-01-10"));
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit("snapshot", {
        bookings: [{ id: "1", name: "Mario", date: "2026-01-10", timeSlot: "09:00", note: null, createdAt: "" }],
        locks: [{ date: "2026-01-10", timeSlot: "10:00", clientId: "other", expiresAt: "" }],
      });
    });

    await waitFor(() => expect(result.current.status).toBe("open"));
    expect(result.current.bookings).toHaveLength(1);
    expect(result.current.locks["10:00"].clientId).toBe("other");
  });

  it("merges booking-created events and clears the slot's lock", async () => {
    const { result } = renderHook(() => useSlotsRealtime("2026-01-10"));
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit("snapshot", {
        bookings: [],
        locks: [{ date: "2026-01-10", timeSlot: "09:00", clientId: "other", expiresAt: "" }],
      });
    });
    act(() => {
      source.emit("booking-created", {
        booking: { id: "1", name: "Mario", date: "2026-01-10", timeSlot: "09:00", note: null, createdAt: "" },
      });
    });

    await waitFor(() => expect(result.current.bookings).toHaveLength(1));
    expect(result.current.locks["09:00"]).toBeUndefined();
  });

  it("removes a booking on booking-deleted", async () => {
    const { result } = renderHook(() => useSlotsRealtime("2026-01-10"));
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit("snapshot", {
        bookings: [{ id: "1", name: "Mario", date: "2026-01-10", timeSlot: "09:00", note: null, createdAt: "" }],
        locks: [],
      });
    });
    act(() => {
      source.emit("booking-deleted", { id: "1" });
    });

    await waitFor(() => expect(result.current.bookings).toHaveLength(0));
  });

  it("applies lock-acquired and lock-released events", async () => {
    const { result } = renderHook(() => useSlotsRealtime("2026-01-10"));
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit("snapshot", { bookings: [], locks: [] });
    });
    act(() => {
      source.emit("lock-acquired", { date: "2026-01-10", timeSlot: "09:00", clientId: "other", expiresAt: "" });
    });

    await waitFor(() => expect(result.current.locks["09:00"]).toBeDefined());

    act(() => {
      source.emit("lock-released", { timeSlot: "09:00" });
    });

    await waitFor(() => expect(result.current.locks["09:00"]).toBeUndefined());
  });
});
