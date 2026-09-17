import { expect, test } from "@playwright/test";

const DATE = "2026-03-02";

test("creates and deletes a booking end-to-end in a single tab", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("date-picker").fill(DATE);

  const slot = page.getByTestId("slot-09:00");
  await expect(slot).toBeEnabled();

  await slot.click();
  await page.getByTestId("booking-name").fill("Mario Rossi");
  await page.getByTestId("booking-submit").click();

  await expect(slot).toHaveAttribute("data-status", "booked");
  await expect(page.getByTestId("booking-list")).toContainText("Mario Rossi");

  await page.getByTestId("delete-09:00").click();
  await page.getByTestId("confirm-delete").click();

  await expect(slot).toHaveAttribute("data-status", "free");
  await expect(slot).toBeEnabled();
});
