"use client";

import { useCallback, useMemo, useState } from "react";
import { TIME_SLOTS } from "@/lib/timeSlots";
import { buildSlotStates } from "@/lib/slotState";
import { useClientId } from "@/hooks/useClientId";
import { useSlotsRealtime } from "@/hooks/useSlotsRealtime";
import DatePicker from "@/components/DatePicker";
import SlotGrid from "@/components/SlotGrid";
import BookingForm from "@/components/BookingForm";
import BookingList from "@/components/BookingList";
import ErrorBanner from "@/components/ErrorBanner";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [date, setDate] = useState(todayIso);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const clientId = useClientId();
  const { bookings, locks, status } = useSlotsRealtime(date);

  const slots = useMemo(
    () => buildSlotStates(TIME_SLOTS, bookings, locks, clientId),
    [bookings, locks, clientId]
  );

  const handleSelectSlot = useCallback((timeSlot: string) => {
    setBanner(null);
    setSelectedSlot(timeSlot);
  }, []);

  const handleLockDenied = useCallback((message: string) => {
    setBanner(message);
    setSelectedSlot(null);
  }, []);

  const handleBooked = useCallback(() => {
    setSelectedSlot(null);
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Prenotazione slot orari</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Seleziona una data e uno slot libero. Gli slot in uso da altri utenti si aggiornano in tempo reale.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <DatePicker value={date} onChange={setDate} />

        {status === "error" && (
          <ErrorBanner message="Connessione realtime persa, riprova a ricaricare la pagina." variant="error" />
        )}
        {banner && <ErrorBanner message={banner} variant="warning" onDismiss={() => setBanner(null)} />}

        <SlotGrid slots={slots} onSelectSlot={handleSelectSlot} disabled={!clientId} />

        <BookingList bookings={bookings} />
      </div>

      {selectedSlot && clientId && (
        <BookingForm
          date={date}
          timeSlot={selectedSlot}
          clientId={clientId}
          onClose={() => setSelectedSlot(null)}
          onBooked={handleBooked}
          onLockDenied={handleLockDenied}
        />
      )}
    </main>
  );
}
