import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveLocksForDate, startLockSweeper } from "@/lib/locks";
import { createSseStream, SSE_HEADERS } from "@/lib/sse";
import { isValidDateString } from "@/lib/timeSlots";
import { toErrorResponse, invalidDate } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function buildSnapshot(date: string) {
  const bookings = await prisma.booking.findMany({ where: { date }, orderBy: { timeSlot: "asc" } });
  const locks = getActiveLocksForDate(date).map((lock) => ({
    date,
    timeSlot: lock.timeSlot,
    clientId: lock.clientId,
    expiresAt: new Date(lock.expiresAt).toISOString(),
  }));

  return {
    bookings: bookings.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
    locks,
  };
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!isValidDateString(date)) return toErrorResponse(invalidDate());

  startLockSweeper();

  const stream = createSseStream(date, request.signal, () => buildSnapshot(date));

  return new Response(stream, { headers: SSE_HEADERS });
}
