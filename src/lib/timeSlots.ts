const DAY_START_HOUR = 9;
const DAY_END_HOUR = 18;
const STEP_MINUTES = 30;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Fixed list of bookable time slots for a day, e.g. "09:00", "09:30", ... "17:30". */
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const startMinutes = DAY_START_HOUR * 60;
  const endMinutes = DAY_END_HOUR * 60;

  for (let m = startMinutes; m < endMinutes; m += STEP_MINUTES) {
    slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }

  return slots;
}

export const TIME_SLOTS = generateTimeSlots();

export function isValidTimeSlot(value: unknown): value is string {
  return typeof value === "string" && TIME_SLOTS.includes(value);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}
