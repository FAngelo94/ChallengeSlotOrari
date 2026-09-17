import { describe, expect, it } from "vitest";
import { TIME_SLOTS, isValidDateString, isValidTimeSlot } from "@/lib/timeSlots";

describe("timeSlots", () => {
  it("generates a fixed list of 30-minute slots from 09:00 up to (excluding) 18:00", () => {
    expect(TIME_SLOTS[0]).toBe("09:00");
    expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toBe("17:30");
    expect(TIME_SLOTS).toHaveLength(18);
    expect(TIME_SLOTS).not.toContain("18:00");
  });

  it("validates slot membership", () => {
    expect(isValidTimeSlot("09:00")).toBe(true);
    expect(isValidTimeSlot("17:30")).toBe(true);
    expect(isValidTimeSlot("08:00")).toBe(false);
    expect(isValidTimeSlot("18:00")).toBe(false);
    expect(isValidTimeSlot("not-a-slot")).toBe(false);
    expect(isValidTimeSlot(undefined)).toBe(false);
  });

  it("validates YYYY-MM-DD date strings", () => {
    expect(isValidDateString("2026-01-10")).toBe(true);
    expect(isValidDateString("2026-1-10")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString(null)).toBe(false);
    expect(isValidDateString("2026-13-40")).toBe(false);
  });
});
