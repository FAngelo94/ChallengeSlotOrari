import type { Booking, LockInfo, SlotState } from "@/types/booking";

export function buildSlotStates(
  timeSlots: string[],
  bookings: Booking[],
  locks: Record<string, LockInfo>,
  clientId: string
): SlotState[] {
  return timeSlots.map((timeSlot) => {
    const booking = bookings.find((b) => b.timeSlot === timeSlot);
    if (booking) return { timeSlot, status: "booked", booking };

    const lock = locks[timeSlot];
    if (lock && lock.clientId !== clientId) {
      return {
        timeSlot,
        status: "locked",
        lockedByClientId: lock.clientId,
        lockExpiresAt: lock.expiresAt,
      };
    }

    return { timeSlot, status: "free" };
  });
}
