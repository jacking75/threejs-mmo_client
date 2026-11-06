/* global console */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await page.goto(pathToFileURL(resolve("dist-standalone/index.html")).href);
  await page.locator('.lobby-actions [data-action="create"]').click();
  await page.locator('[data-body="feminine"]').click();
  await page.locator('input[name="characterName"]').fill("OfflineAria");
  await page.locator('button[type="submit"]').click();
  await page.locator('[data-action="enter"]').click();
  const field = page.locator(".field-shell");
  await expect(field).toHaveAttribute("data-animation", "idle");
  await expect(field).toHaveAttribute("data-avatar-source", "blender-glb");
  await expect(field).toHaveAttribute("data-avatar-status", "ready");
  mkdirSync("docs_working/standalone-check", { recursive: true });
  await page.screenshot({ path: "docs_working/standalone-check/offline-field.png" });
  const startZ = await field.getAttribute("data-player-z");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(350);
  await page.keyboard.up("KeyW");
  await expect.poll(() => field.getAttribute("data-player-z")).not.toBe(startZ);
  await page.keyboard.press("KeyF");
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await page.keyboard.press("KeyI");
  await page.locator('[data-item-id="weapon.moon-sword"]').click();
  await page.locator('[data-item-id="outfit.traveler"]').click();
  await expect(page.locator('[data-item-id="weapon.moon-sword"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator("[data-apply]").click();
  await page.waitForTimeout(500);
  mkdirSync("docs_working/standalone-check", { recursive: true });
  await page.screenshot({ path: "docs_working/standalone-check/offline-inventory.png" });
  await page.reload();
  await expect(page.locator(".selected-character-name")).toHaveText("OfflineAria");
  await expect(page.locator(".spec-weapon")).toHaveText("달빛 검");
  await page.locator('[data-action="enter"]').click();
  await page.keyboard.press("KeyI");
  await expect(page.locator('[data-item-id="outfit.traveler"]')).toHaveAttribute("aria-pressed", "true");
  assert.deepEqual(external, [], "No HTTP requests are allowed in standalone mode");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ offline: true, model: "blender-glb", externalRequests: external.length, gameplay: "passed", reload: "passed" }));
} finally {
  await browser.close();
}
