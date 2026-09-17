"use client";

import { FormEvent, useState } from "react";
import { useLockHeartbeat } from "@/hooks/useLockHeartbeat";
import ErrorBanner from "@/components/ErrorBanner";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500";

interface Props {
  date: string;
  timeSlot: string;
  clientId: string;
  onClose: () => void;
  onBooked: () => void;
  onLockDenied: (message: string) => void;
}

export default function BookingForm({ date, timeSlot, clientId, onClose, onBooked, onLockDenied }: Props) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useLockHeartbeat(date, timeSlot, clientId, onLockDenied);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, timeSlot, note: note || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Impossibile creare la prenotazione");
        return;
      }

      onBooked();
    } catch {
      setError("Errore di rete, riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl"
        data-testid="booking-form"
      >
        <h2 className="text-lg font-semibold text-slate-900">Prenota {timeSlot}</h2>
        <p className="mb-5 text-sm text-slate-600">{date}</p>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Nome</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
            placeholder="Es. Mario Rossi"
            data-testid="booking-name"
            className={INPUT_CLASS}
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Note (opzionale)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Informazioni aggiuntive"
            className={`${INPUT_CLASS} resize-y`}
            rows={3}
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={submitting}
            data-testid="booking-submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Invio…" : "Conferma"}
          </button>
        </div>
      </form>
    </div>
  );
}
