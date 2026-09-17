import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingForm from "@/components/BookingForm";
import { __resetLockClientForTests } from "@/lib/lockClient";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetchByPath(handlers: Record<string, () => Response | Promise<Response>>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const key = Object.keys(handlers).find((candidate) => url.includes(candidate));
    if (!key) throw new Error(`Unhandled fetch call: ${url}`);
    return handlers[key]();
  });
}

const futureLockResponse = () =>
  jsonResponse({ locked: true, expiresAt: new Date(Date.now() + 30_000).toISOString() });

function renderForm(overrides: Partial<React.ComponentProps<typeof BookingForm>> = {}) {
  const props = {
    date: "2026-01-10",
    timeSlot: "09:00",
    clientId: "client-aaaaaaaa",
    onClose: vi.fn(),
    onBooked: vi.fn(),
    onLockDenied: vi.fn(),
    ...overrides,
  };
  render(<BookingForm {...props} />);
  return props;
}

describe("BookingForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetLockClientForTests();
  });

  it("acquires the lock on mount and submits a valid booking", async () => {
    const fetchMock = mockFetchByPath({
      "/api/locks": futureLockResponse,
      "/api/bookings": () => jsonResponse({ booking: { id: "1" } }, 201),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { onBooked } = renderForm();

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/locks"), expect.anything())
    );

    await userEvent.type(screen.getByTestId("booking-name"), "Mario Rossi");
    await userEvent.click(screen.getByTestId("booking-submit"));

    await waitFor(() => expect(onBooked).toHaveBeenCalled());
  });

  it("does not call the API when the name field is left empty", async () => {
    const fetchMock = mockFetchByPath({ "/api/locks": futureLockResponse });
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.click(screen.getByTestId("booking-submit"));

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/bookings"))).toBe(false);
  });

  it("shows a conflict error banner when the API returns 409", async () => {
    const fetchMock = mockFetchByPath({
      "/api/locks": futureLockResponse,
      "/api/bookings": () => jsonResponse({ error: "SLOT_ALREADY_BOOKED", message: "Slot già prenotato" }, 409),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.type(screen.getByTestId("booking-name"), "Mario Rossi");
    await userEvent.click(screen.getByTestId("booking-submit"));

    expect(await screen.findByTestId("error-banner")).toHaveTextContent("Slot già prenotato");
  });

  it("calls onLockDenied when the lock cannot be acquired", async () => {
    const fetchMock = mockFetchByPath({
      "/api/locks": () => jsonResponse({ error: "SLOT_LOCKED", message: "Occupato da altri" }, 409),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { onLockDenied } = renderForm();

    await waitFor(() => expect(onLockDenied).toHaveBeenCalledWith("Occupato da altri"));
  });
});
