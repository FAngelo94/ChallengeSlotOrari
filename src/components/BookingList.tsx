"use client";

import { useState } from "react";
import type { Booking } from "@/types/booking";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import ErrorBanner from "@/components/ErrorBanner";

interface Props {
  bookings: Booking[];
}

export default function BookingList({ bookings }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);

    const res = await fetch(`/api/bookings/${target.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Impossibile eliminare la prenotazione");
    }
  }

  const sorted = [...bookings].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Prenotazioni del giorno</h2>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-600">
          Nessuna prenotazione per questa data.
        </p>
      ) : (
        <ul
          className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          data-testid="booking-list"
        >
          {sorted.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-900">
                  <span className="font-semibold tabular-nums">{booking.timeSlot}</span>
                  <span className="text-slate-400"> · </span>
                  {booking.name}
                </p>
                {booking.note && <p className="mt-0.5 truncate text-sm text-slate-600">{booking.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(booking)}
                data-testid={`delete-${booking.timeSlot}`}
                className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmDeleteDialog
          bookingName={pendingDelete.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
