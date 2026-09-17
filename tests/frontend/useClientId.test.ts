import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useClientId } from "@/hooks/useClientId";

describe("useClientId", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("generates an id and persists it for the tab", async () => {
    const { result } = renderHook(() => useClientId());

    await waitFor(() => expect(result.current).not.toBe(""));
    expect(window.sessionStorage.getItem("slot-booking-client-id")).toBe(result.current);
  });

  it("gives a duplicated tab a different id than the tab it was copied from", async () => {
    // Duplicating a tab copies its sessionStorage, so both tabs would start
    // with the same id and would see each other's locks as their own.
    const original = renderHook(() => useClientId());
    await waitFor(() => expect(original.result.current).not.toBe(""));

    const copy = renderHook(() => useClientId());
    await waitFor(() => expect(copy.result.current).not.toBe(""));

    await waitFor(() => expect(copy.result.current).not.toBe(original.result.current));
  });
});
