import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/bookings/route";

function makeGetRequest(url: string) {
  return new NextRequest(url);
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/bookings", () => {
  it("returns 400 when date is missing", async () => {
    const res = await GET(makeGetRequest("http://localhost/api/bookings"));
    expect(res.status).toBe(400);
  });

  it("returns an empty list for a date with no bookings", async () => {
    const res = await GET(makeGetRequest("http://localhost/api/bookings?date=2026-01-10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toEqual([]);
  });
});

describe("POST /api/bookings", () => {
  it("creates a booking and returns 201", async () => {
    const res = await POST(makePostRequest({ name: "Mario", date: "2026-01-10", timeSlot: "09:00" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.booking.name).toBe("Mario");
    expect(body.booking.timeSlot).toBe("09:00");
  });

  it("rejects a second booking on the same date+timeSlot with 409", async () => {
    await POST(makePostRequest({ name: "Mario", date: "2026-01-10", timeSlot: "09:00" }));
    const res = await POST(makePostRequest({ name: "Luigi", date: "2026-01-10", timeSlot: "09:00" }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SLOT_ALREADY_BOOKED");
  });

  it("allows the same timeSlot on a different date", async () => {
    await POST(makePostRequest({ name: "Mario", date: "2026-01-10", timeSlot: "09:00" }));
    const res = await POST(makePostRequest({ name: "Luigi", date: "2026-01-11", timeSlot: "09:00" }));
    expect(res.status).toBe(201);
  });

  it("rejects an empty name with 422", async () => {
    const res = await POST(makePostRequest({ name: "", date: "2026-01-10", timeSlot: "09:00" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.fields.name).toBeDefined();
  });

  it("rejects an invalid timeSlot with 422", async () => {
    const res = await POST(makePostRequest({ name: "Mario", date: "2026-01-10", timeSlot: "99:99" }));
    expect(res.status).toBe(422);
  });

  it("rejects a malformed date with 422", async () => {
    const res = await POST(makePostRequest({ name: "Mario", date: "10-01-2026", timeSlot: "09:00" }));
    expect(res.status).toBe(422);
  });
});
