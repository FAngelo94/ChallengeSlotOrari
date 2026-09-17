import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acquireLock, releaseLock } from "@/lib/locks";
import { isValidClientId } from "@/lib/clientId";
import { isValidDateString, isValidTimeSlot } from "@/lib/timeSlots";
import { slotAlreadyBooked, slotLocked, toErrorResponse, validationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface LockBody {
  date?: unknown;
  timeSlot?: unknown;
  clientId?: unknown;
}

function parseLockBody(body: LockBody) {
  if (!isValidDateString(body.date) || !isValidTimeSlot(body.timeSlot) || !isValidClientId(body.clientId)) {
    throw validationError("Parametri di lock non validi");
  }
  return { date: body.date, timeSlot: body.timeSlot, clientId: body.clientId };
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json().catch(() => ({}))) as LockBody;
    const { date, timeSlot, clientId } = parseLockBody(raw);

    const existingBooking = await prisma.booking.findUnique({
      where: { date_timeSlot: { date, timeSlot } },
    });
    if (existingBooking) throw slotAlreadyBooked();

    const result = acquireLock(date, timeSlot, clientId);
    if (!result.ok) throw slotLocked();

    return NextResponse.json({ locked: true, expiresAt: new Date(result.expiresAt).toISOString() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const raw = (await request.json().catch(() => ({}))) as LockBody;
    const { date, timeSlot, clientId } = parseLockBody(raw);

    releaseLock(date, timeSlot, clientId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
