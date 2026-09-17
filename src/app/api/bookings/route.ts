import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseLockForSlot } from "@/lib/locks";
import { publish } from "@/lib/eventBus";
import { isValidDateString, isValidTimeSlot } from "@/lib/timeSlots";
import {
  invalidDate,
  isPrismaUniqueConstraintError,
  slotAlreadyBooked,
  toErrorResponse,
  validationError,
} from "@/lib/errors";
import type { Booking } from "@/types/booking";

const MAX_NOTE_LENGTH = 500;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!isValidDateString(date)) throw invalidDate();

    const bookings = await prisma.booking.findMany({
      where: { date },
      orderBy: { timeSlot: "asc" },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    return toErrorResponse(error);
  }
}

interface CreateBookingBody {
  name?: unknown;
  date?: unknown;
  timeSlot?: unknown;
  note?: unknown;
}

function validateCreateBody(body: CreateBookingBody) {
  const fields: Record<string, string> = {};

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) fields.name = "Il nome è obbligatorio";

  if (!isValidDateString(body.date)) fields.date = "Data non valida (atteso formato YYYY-MM-DD)";
  if (!isValidTimeSlot(body.timeSlot)) fields.timeSlot = "Slot orario non valido";

  const note = typeof body.note === "string" ? body.note : undefined;
  if (note && note.length > MAX_NOTE_LENGTH) fields.note = `La nota supera i ${MAX_NOTE_LENGTH} caratteri`;

  if (Object.keys(fields).length > 0) {
    throw validationError("Dati della prenotazione non validi", fields);
  }

  return {
    name,
    date: body.date as string,
    timeSlot: body.timeSlot as string,
    note: note ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json().catch(() => ({}))) as CreateBookingBody;
    const data = validateCreateBody(raw);

    let created;
    try {
      created = await prisma.booking.create({ data });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) throw slotAlreadyBooked();
      throw error;
    }

    const booking: Booking = {
      ...created,
      createdAt: created.createdAt.toISOString(),
    };

    releaseLockForSlot(data.date, data.timeSlot);
    publish({ type: "booking-created", date: data.date, booking });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
