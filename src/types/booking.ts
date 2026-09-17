export interface Booking {
  id: string;
  name: string;
  date: string;
  timeSlot: string;
  note: string | null;
  createdAt: string;
}

export interface LockInfo {
  date: string;
  timeSlot: string;
  clientId: string;
  expiresAt: string;
}

export type SlotStatus = "free" | "locked" | "booked";

export interface SlotState {
  timeSlot: string;
  status: SlotStatus;
  booking?: Booking;
  lockedByClientId?: string;
  lockExpiresAt?: string;
}
