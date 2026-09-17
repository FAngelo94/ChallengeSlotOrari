import { expect, test } from "@playwright/test";

const DATE = "2026-03-03";
const DUPLICATED_TAB_DATE = "2026-03-06";
const NO_FLICKER_DATE = "2026-03-07";
const CLIENT_ID_KEY = "slot-booking-client-id";

test("a lock in one tab is visible as unavailable in another tab in real time", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto("/");
  await pageB.goto("/");
  await pageA.getByTestId("date-picker").fill(DATE);
  await pageB.getByTestId("date-picker").fill(DATE);

  const slotA = pageA.getByTestId("slot-09:00");
  const slotB = pageB.getByTestId("slot-09:00");

  await expect(slotB).toBeEnabled();

  // Tab A selects the slot: the lock must be visible in Tab B before any submit.
  await slotA.click();

  await expect(slotB).toBeDisabled();
  await expect(slotB).toHaveAttribute("data-status", "locked");

  await pageA.getByTestId("booking-name").fill("Mario Rossi");
  await pageA.getByTestId("booking-submit").click();

  await expect(slotB).toHaveAttribute("data-status", "booked");
  await expect(slotB).toBeDisabled();

  await contextA.close();
  await contextB.close();
});

test("the lock never flickers back to free while the form stays open", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto("/");
  await pageB.goto("/");
  await pageA.getByTestId("date-picker").fill(NO_FLICKER_DATE);
  await pageB.getByTestId("date-picker").fill(NO_FLICKER_DATE);

  // Selecting a slot used to fire POST + DELETE + POST concurrently, because
  // React StrictMode mounts, unmounts and remounts the form's effect: whenever
  // the DELETE was served last the slot went back to free in the other tabs
  // until the next heartbeat. Selecting must now send a single POST.
  const lockRequests: string[] = [];
  pageA.on("request", (request) => {
    if (request.url().includes("/api/locks")) lockRequests.push(request.method());
  });

  await pageA.getByTestId("slot-12:00").click();
  const slotB = pageB.getByTestId("slot-12:00");
  await expect(slotB).toHaveAttribute("data-status", "locked");

  await pageB.waitForTimeout(1000);
  expect(lockRequests).toEqual(["POST"]);

  // Stays locked across several heartbeat cycles (TTL is 3s here).
  for (let i = 0; i < 8; i += 1) {
    expect(await slotB.getAttribute("data-status")).toBe("locked");
    await pageB.waitForTimeout(400);
  }

  await contextA.close();
  await contextB.close();
});

test("a duplicated tab gets its own client id and still sees the original's lock", async ({ context }) => {
  const pageA = await context.newPage();
  await pageA.goto("/");
  await pageA.getByTestId("date-picker").fill(DUPLICATED_TAB_DATE);
  const idA = await pageA.evaluate((key) => window.sessionStorage.getItem(key), CLIENT_ID_KEY);
  expect(idA).toBeTruthy();

  // Duplicating a tab copies its sessionStorage, so the copy starts with the
  // same client id as the original: it must claim a fresh one, otherwise it
  // would mistake the original's lock for its own and show the slot as free.
  const pageB = await context.newPage();
  await pageB.addInitScript(
    ([key, id]) => window.sessionStorage.setItem(key, id),
    [CLIENT_ID_KEY, idA as string] as const
  );
  await pageB.goto("/");
  await pageB.getByTestId("date-picker").fill(DUPLICATED_TAB_DATE);

  await pageA.getByTestId("slot-11:00").click();

  const slotB = pageB.getByTestId("slot-11:00");
  await expect(slotB).toHaveAttribute("data-status", "locked");
  await expect(slotB).toBeDisabled();

  await expect
    .poll(() => pageB.evaluate((key) => window.sessionStorage.getItem(key), CLIENT_ID_KEY))
    .not.toBe(idA);
});
