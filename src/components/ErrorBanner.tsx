"use client";

interface Props {
  message: string;
  variant?: "error" | "warning";
  onDismiss?: () => void;
}

const VARIANT_STYLES: Record<"error" | "warning", string> = {
  error: "bg-red-50 border-red-300 text-red-900",
  warning: "bg-amber-50 border-amber-400 text-amber-950",
};

export default function ErrorBanner({ message, variant = "error", onDismiss }: Props) {
  return (
    <div
      role="alert"
      data-testid="error-banner"
      className={`mb-4 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${VARIANT_STYLES[variant]}`}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-1 text-lg leading-none opacity-70 transition hover:opacity-100"
          aria-label="Chiudi messaggio"
        >
          ×
        </button>
      )}
    </div>
  );
}
