import { expect, test } from "@playwright/test";

// LOCK_TTL_MS=3000 in this environment (see playwright.config.ts webServer.env).
const ABANDONED_DATE = "2026-03-04";
const RENEWED_DATE = "2026-03-05";

test("an abandoned lock expires and frees the slot for another tab", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto("/");
  await pageB.goto("/");
  await pageA.getByTestId("date-picker").fill(ABANDONED_DATE);
  await pageB.getByTestId("date-picker").fill(ABANDONED_DATE);

  await pageA.getByTestId("slot-09:00").click();
  const slotB = pageB.getByTestId("slot-09:00");
  await expect(slotB).toBeDisabled();

  // Closing the context abruptly kills Tab A without running its React
  // unmount cleanup, so the lock is never explicitly released: only the
  // server-side TTL sweep can free it.
  await contextA.close();

  await expect(slotB).toBeEnabled({ timeout: 15_000 });

  await contextB.close();
});

test("an active heartbeat keeps the lock alive beyond the nominal TTL", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto("/");
  await pageB.goto("/");
  await pageA.getByTestId("date-picker").fill(RENEWED_DATE);
  await pageB.getByTestId("date-picker").fill(RENEWED_DATE);

  await pageA.getByTestId("slot-10:00").click();
  const slotB = pageB.getByTestId("slot-10:00");
  await expect(slotB).toBeDisabled();

  // Tab A's form stays open (heartbeat renewing every ~1.5s); wait past the
  // nominal 3s TTL and confirm the slot is still locked for Tab B.
  await pageB.waitForTimeout(4000);
  await expect(slotB).toBeDisabled();

  await contextA.close();
  await contextB.close();
});
