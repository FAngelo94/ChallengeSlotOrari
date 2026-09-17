import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { DELETE } from "@/app/api/bookings/[id]/route";

describe("DELETE /api/bookings/:id", () => {
  it("deletes an existing booking and returns 204", async () => {
    const booking = await prisma.booking.create({
      data: { name: "Mario", date: "2026-01-10", timeSlot: "09:00" },
    });

    const res = await DELETE(new Request(`http://localhost/api/bookings/${booking.id}`), {
      params: Promise.resolve({ id: booking.id }),
    });

    expect(res.status).toBe(204);
    const found = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(found).toBeNull();
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await DELETE(new Request("http://localhost/api/bookings/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("NOT_FOUND");
  });
});
