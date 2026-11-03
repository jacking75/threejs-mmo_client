import { expect, test } from "@playwright/test";

test("two clients move, disconnect, recover and filter interest without duplicate equipment", async ({ page: a, context, request }) => {
  const b = await context.newPage();
  const errors: string[] = []; a.on("pageerror", e => errors.push(e.message)); b.on("pageerror", e => errors.push(e.message));
    for (const page of [a, b]) { await page.goto("/?mode=network"); await page.locator("#connect").click(); await expect(page.locator("#app")).toHaveAttribute("data-connected", "true"); }
    await expect(a.locator("#app")).toHaveAttribute("data-entities", "2");
    await expect(b.locator("#app")).toHaveAttribute("data-entities", "2");
    const identity = await a.locator("#app").getAttribute("data-self");
    await a.locator("#latency").selectOption("150"); await a.locator("#faults").check();
    await a.locator("canvas").click(); await a.keyboard.down("KeyD"); await a.waitForTimeout(600); await a.keyboard.up("KeyD");
    await expect.poll(async () => Number(await a.locator("#app").getAttribute("data-x"))).toBeGreaterThan(1);
    await a.locator("#disconnect").click(); await expect(b.locator("#app")).toHaveAttribute("data-entities", "1");
    await a.locator("#connect").click(); await expect(a.locator("#app")).toHaveAttribute("data-self", identity ?? "");
    await expect(a.locator("#app")).toHaveAttribute("data-entities", "2");
    await a.locator("#bots").selectOption("200"); await expect(a.locator("#app")).toHaveAttribute("data-entities", "202");
    await a.locator("#radius").selectOption("15");
    await expect.poll(async () => Number(await a.locator("#app").getAttribute("data-entities"))).toBeLessThan(30);
    expect((await request.post("/api/network/join?v=99")).status()).toBe(409);
    expect((await request.post("/api/network/join?v=1", { headers: { Origin: "https://example.org" } })).status()).toBe(403);
    expect(errors).toEqual([]);
});
