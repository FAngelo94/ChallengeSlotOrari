"use client";

import type { SlotState } from "@/types/booking";
import SlotButton from "@/components/SlotButton";

interface Props {
  slots: SlotState[];
  onSelectSlot: (timeSlot: string) => void;
  disabled?: boolean;
}

const LEGEND: Array<{ label: string; dot: string }> = [
  { label: "Libero", dot: "bg-emerald-500" },
  { label: "In prenotazione da altro utente", dot: "bg-amber-500" },
  { label: "Prenotato", dot: "bg-slate-500" },
];

export default function SlotGrid({ slots, onSelectSlot, disabled }: Props) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2 w-2 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="slot-grid">
        {slots.map((slot) => (
          <SlotButton
            key={slot.timeSlot}
            timeSlot={slot.timeSlot}
            status={slot.status}
            disabled={disabled}
            onClick={() => onSelectSlot(slot.timeSlot)}
          />
        ))}
      </div>
    </section>
  );
}
