"use client";

interface Props {
  bookingName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteDialog({ bookingName, onConfirm, onCancel }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
        <p className="mb-6 text-sm text-slate-700">
          Eliminare la prenotazione di <strong className="font-semibold text-slate-900">{bookingName}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-delete"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}
