"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const ARROW_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 active:scale-95";

/** Shifts an ISO date by whole days, working in UTC to avoid DST surprises. */
function shiftIsoDate(iso: string, days: number): string {
  const shifted = new Date(`${iso}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function formatLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function DatePicker({ value, onChange }: Props) {
  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(shiftIsoDate(value, -1))}
          aria-label="Giorno precedente"
          data-testid="prev-day"
          className={ARROW_CLASS}
        >
          ‹
        </button>

        <label className="flex flex-col items-center">
          <span className="sr-only">Data</span>
          <input
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-indigo-500"
            data-testid="date-picker"
          />
        </label>

        <button
          type="button"
          onClick={() => onChange(shiftIsoDate(value, 1))}
          aria-label="Giorno successivo"
          data-testid="next-day"
          className={ARROW_CLASS}
        >
          ›
        </button>
      </div>

      <p className="text-sm font-medium capitalize text-slate-600" data-testid="date-label">
        {formatLabel(value)}
      </p>
    </div>
  );
}
