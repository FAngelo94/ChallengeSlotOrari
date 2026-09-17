import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlotGrid from "@/components/SlotGrid";
import type { SlotState } from "@/types/booking";

const SLOTS: SlotState[] = [
  { timeSlot: "09:00", status: "free" },
  { timeSlot: "09:30", status: "locked", lockedByClientId: "other-client" },
  {
    timeSlot: "10:00",
    status: "booked",
    booking: { id: "1", name: "Mario", date: "2026-01-10", timeSlot: "10:00", note: null, createdAt: "" },
  },
];

describe("SlotGrid", () => {
  it("renders the three slot statuses with the correct clickability", async () => {
    const onSelectSlot = vi.fn();
    render(<SlotGrid slots={SLOTS} onSelectSlot={onSelectSlot} />);

    const free = screen.getByTestId("slot-09:00");
    const locked = screen.getByTestId("slot-09:30");
    const booked = screen.getByTestId("slot-10:00");

    expect(free).not.toBeDisabled();
    expect(locked).toBeDisabled();
    expect(booked).toBeDisabled();

    await userEvent.click(free);
    expect(onSelectSlot).toHaveBeenCalledWith("09:00");

    await userEvent.click(locked);
    await userEvent.click(booked);
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
  });

  it("disables every slot when the grid itself is disabled", () => {
    render(<SlotGrid slots={SLOTS} onSelectSlot={vi.fn()} disabled />);
    expect(screen.getByTestId("slot-09:00")).toBeDisabled();
  });
});
