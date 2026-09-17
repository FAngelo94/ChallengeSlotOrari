import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/eventBus";
import { notFound, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) throw notFound("Prenotazione non trovata");

    await prisma.booking.delete({ where: { id } });

    publish({
      type: "booking-deleted",
      date: existing.date,
      id: existing.id,
      timeSlot: existing.timeSlot,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
