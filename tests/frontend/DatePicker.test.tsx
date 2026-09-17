import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatePicker from "@/components/DatePicker";

describe("DatePicker", () => {
  it("moves to the previous and next day", async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-03-10" onChange={onChange} />);

    await userEvent.click(screen.getByTestId("prev-day"));
    expect(onChange).toHaveBeenLastCalledWith("2026-03-09");

    await userEvent.click(screen.getByTestId("next-day"));
    expect(onChange).toHaveBeenLastCalledWith("2026-03-11");
  });

  it("crosses month and year boundaries correctly", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<DatePicker value="2026-03-01" onChange={onChange} />);

    await userEvent.click(screen.getByTestId("prev-day"));
    expect(onChange).toHaveBeenLastCalledWith("2026-02-28");

    rerender(<DatePicker value="2026-12-31" onChange={onChange} />);
    await userEvent.click(screen.getByTestId("next-day"));
    expect(onChange).toHaveBeenLastCalledWith("2027-01-01");
  });

  it("shows the selected day in a readable label", () => {
    render(<DatePicker value="2026-03-10" onChange={vi.fn()} />);
    expect(screen.getByTestId("date-label")).toHaveTextContent("10 marzo 2026");
  });
});
