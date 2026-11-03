import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function create(page: Page, query = "", body = "masculine"): Promise<void> {
  await page.goto(`/${query}`);
  await page.locator(".lobby-actions [data-action=create]").click();
  await page.locator(`[data-body=${body}]`).click();
  await page.locator("input[name=characterName]").fill("Benchmark");
  await page.locator("button[type=submit]").click();
  await page.locator("[data-action=enter]").click();
  await expect(page.locator(".field-shell")).toBeVisible();
  await page.waitForTimeout(150);
}

test("100 equipment changes and 100 lobby/field transitions release GPU resources", async ({ page }, info) => {
  await create(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.collectGarbage");
  const heapBefore = await cdp.send("Runtime.getHeapUsage");
  const before = await page.evaluate(() => { if (!window.__rpgDiagnostics) throw new Error("missing diagnostics"); return window.__rpgDiagnostics.current; });
  await page.keyboard.press("KeyI");
  for (let i = 0; i < 100; i++) {
    await page.locator(`[data-item-id="weapon.${i % 2 ? "training" : "moon"}-sword"]`).click();
    await page.locator(`[data-item-id="outfit.${i % 2 ? "warrior-starter" : "traveler"}"]`).click();
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const afterEquipment = await page.evaluate(() => { if (!window.__rpgDiagnostics) throw new Error("missing diagnostics"); return window.__rpgDiagnostics.current; });
  expect(afterEquipment.geometries).toBe(before.geometries);
  expect(afterEquipment.materials).toBe(before.materials);
  for (let i = 0; i < 100; i++) {
    await page.locator(".field-shell button").filter({ hasText: "캐릭터 선택" }).click();
    await page.locator("[data-action=enter]").click();
    await page.waitForTimeout(70);
  }
  await cdp.send("HeapProfiler.collectGarbage");
  const heapAfter = await cdp.send("Runtime.getHeapUsage");
  const diagnostics = await page.evaluate(() => { if (!window.__rpgDiagnostics) throw new Error("missing diagnostics"); return window.__rpgDiagnostics; });
  expect(diagnostics.disposed).toHaveLength(100);
  const counts = diagnostics.disposed.map(s => s.geometries);
  expect(Math.max(...counts)).toBeLessThanOrEqual(3);
  expect(diagnostics.current.geometries).toBe(before.geometries);
  await info.attach("lifecycle.json", { body: JSON.stringify({ before, afterEquipment, after: diagnostics.current, disposedGeometryMax: Math.max(...counts), heapBefore, heapAfter }, null, 2), contentType: "application/json" });
});

test("quality settings measure frame cost and resize/GLB failure remain usable", async ({ browser }, info) => {
  const samples = [];
  for (const settings of [{ width: 1280, height: 720, dpr: 1, shadows: "off" }, { width: 1280, height: 720, dpr: 1, shadows: "on" }, { width: 1920, height: 1080, dpr: 2, shadows: "on" }]) {
    const page = await browser.newPage({ viewport: settings });
    await create(page, `?dpr=${settings.dpr}&shadows=${settings.shadows}`);
    const frames = await page.evaluate(async () => {
      const frames: number[] = [];
      let previous = performance.now();
      for (let i = 0; i < 90; i++) await new Promise<void>(resolve => requestAnimationFrame(now => { if (i >= 30) frames.push(now - previous); previous = now; resolve(); }));
      if (!window.__rpgDiagnostics) throw new Error("missing diagnostics");
      return { frames, render: window.__rpgDiagnostics.current };
    });
    samples.push({ settings, ...frames }); await page.close();
  }
  const page = await browser.newPage();
  await page.route("**/female-warrior.glb", route => route.abort());
  await create(page, "", "feminine");
  await page.setViewportSize({ width: 900, height: 650 }); await page.waitForTimeout(200);
  await page.keyboard.down("KeyW"); await page.waitForTimeout(150);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.keyboard.up("KeyW");
  const stopped = await page.locator(".field-shell").getAttribute("data-player-z");
  await page.waitForTimeout(300);
  expect(await page.locator(".field-shell").getAttribute("data-player-z")).toBe(stopped);
  const session = await page.context().newCDPSession(page);
  await session.send("Page.setWebLifecycleState", { state: "frozen" });
  await page.waitForTimeout(400);
  await session.send("Page.setWebLifecycleState", { state: "active" });
  await page.waitForTimeout(200);
  expect(await page.locator(".field-shell").getAttribute("data-player-z")).toBe(stopped);
  await page.keyboard.press("KeyI"); await page.locator('[data-item-id="weapon.moon-sword"]').click();
  await page.screenshot({ path: info.outputPath("fallback-resize.png") });
  await info.attach("quality.json", { body: JSON.stringify(samples, null, 2), contentType: "application/json" }); await page.close();
});

test("network latency and interest experiments measure frame time and receive bytes", async ({ page }, info) => {
  await page.goto("/?mode=network"); await page.locator("#connect").click();
  await expect(page.locator("#app")).toHaveAttribute("data-connected", "true");
  const samples = [];
  for (const bots of ["0", "50", "200"]) for (const radius of ["200", "15"]) for (const hz of ["20", "5"]) {
    await page.locator("#bots").selectOption(bots); await page.locator("#radius").selectOption(radius); await page.locator("#hz").selectOption(hz);
    await page.waitForTimeout(2200);
    await expect(page.locator("#app")).toHaveAttribute("data-connected", "true");
    samples.push({ bots, radius, hz, status: await page.locator("output").textContent() });
  }
  const latencySamples = [];
  for (const latency of ["50", "150", "300"]) for (const predict of [true, false]) {
    await page.locator("#latency").selectOption(latency); await page.locator("#prediction").setChecked(predict);
    await page.waitForTimeout(1200); await page.locator("canvas").click();
    const responseMs = await page.evaluate(async () => {
      const app = document.querySelector<HTMLElement>("#app");
      if (!app) throw new Error("missing app");
      const initial = Number(app.dataset.displayX), start = performance.now();
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      while (Math.abs(Number(app.dataset.displayX) - initial) < .05 && performance.now() - start < 2500) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      const response = performance.now() - start;
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyD" }));
      return response;
    });
    await expect(page.locator("#app")).toHaveAttribute("data-connected", "true");
    expect(responseMs).toBeLessThan(2000);
    latencySamples.push({ latency, predict, responseMs, status: await page.locator("output").textContent() }); await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: info.outputPath("network.png") });
  await info.attach("network.json", { body: JSON.stringify({ samples, latencySamples }, null, 2), contentType: "application/json" });
});
