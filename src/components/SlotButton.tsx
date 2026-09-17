"use client";

import type { SlotStatus } from "@/types/booking";

interface Props {
  timeSlot: string;
  status: SlotStatus;
  onClick: () => void;
  disabled?: boolean;
}

const STYLES: Record<SlotStatus, string> = {
  free: "bg-white border-emerald-300 text-slate-900 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md active:scale-[0.98] cursor-pointer",
  locked: "bg-amber-100 border-amber-400 text-amber-950 cursor-not-allowed",
  booked: "bg-slate-200 border-slate-300 text-slate-700 cursor-not-allowed",
};

const DOT_STYLES: Record<SlotStatus, string> = {
  free: "bg-emerald-500",
  locked: "bg-amber-500",
  booked: "bg-slate-500",
};

const LABELS: Record<SlotStatus, string> = {
  free: "Libero",
  locked: "In prenotazione",
  booked: "Prenotato",
};

const TITLES: Record<SlotStatus, string> = {
  free: "Slot libero, clicca per prenotare",
  locked: "In prenotazione da un altro utente",
  booked: "Slot già prenotato",
};

export default function SlotButton({ timeSlot, status, onClick, disabled }: Props) {
  const isClickable = status === "free" && !disabled;

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-disabled={!isClickable}
      data-testid={`slot-${timeSlot}`}
      data-status={status}
      title={TITLES[status]}
      className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-all duration-150 ${STYLES[status]}`}
    >
      <span className="text-base font-semibold tabular-nums tracking-tight">{timeSlot}</span>
      <span className="flex items-center gap-1.5 text-xs font-medium">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status]}`} />
        {LABELS[status]}
      </span>
    </button>
  );
}
