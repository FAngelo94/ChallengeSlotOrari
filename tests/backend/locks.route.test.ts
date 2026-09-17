import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { DELETE, POST } from "@/app/api/locks/route";

function makeRequest(method: "POST" | "DELETE", body: unknown) {
  return new NextRequest("http://localhost/api/locks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/locks", () => {
  it("acquires a lock on a free, unbooked slot", async () => {
    const res = await POST(
      makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locked).toBe(true);
  });

  it("rejects a second client while the lock is active", async () => {
    await POST(makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" }));
    const res = await POST(
      makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-bbbbbbbb" })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SLOT_LOCKED");
  });

  it("allows the same client to renew its own lock", async () => {
    await POST(makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" }));
    const res = await POST(
      makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" })
    );
    expect(res.status).toBe(200);
  });

  it("rejects locking a slot that is already booked in the DB", async () => {
    await prisma.booking.create({ data: { name: "Mario", date: "2026-01-10", timeSlot: "09:00" } });
    const res = await POST(
      makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SLOT_ALREADY_BOOKED");
  });

  it("rejects an invalid clientId with 422", async () => {
    const res = await POST(makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "x" }));
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/locks", () => {
  it("is idempotent: releasing a non-existent lock still returns 204", async () => {
    const res = await DELETE(
      makeRequest("DELETE", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" })
    );
    expect(res.status).toBe(204);
  });

  it("frees the slot for another client after release", async () => {
    await POST(makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" }));
    await DELETE(makeRequest("DELETE", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-aaaaaaaa" }));

    const res = await POST(
      makeRequest("POST", { date: "2026-01-10", timeSlot: "09:00", clientId: "client-bbbbbbbb" })
    );
    expect(res.status).toBe(200);
  });
});
