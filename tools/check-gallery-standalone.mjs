/* global console */
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";

// Copy only the HTML to a different directory, including spaces and Korean in its path.
const directory = mkdtempSync(join(tmpdir(), "asset-gallery-"));
const htmlPath = join(directory, "에셋 갤러리.html");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  copyFileSync(resolve("docs/gallery.html"), htmlPath);
  const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [], external = [], failed = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  page.on("requestfailed", request => failed.push(request.url()));
  await page.goto(pathToFileURL(htmlPath).href);
  await expect(page.getByRole("heading", { name: "대륙 리소스 도감" })).toBeVisible();
  await expect(page.locator(".viewport-wrap")).toHaveAttribute("data-asset-source", "blender-glb");
  const captures = "docs_working/gallery-standalone-check";
  mkdirSync(captures, { recursive: true });
  await page.screenshot({ path: `${captures}/avatar.png` });

  const counts = { avatar: 6, npc: 72, fauna: 208, creature: 96, equipment: 203, world: 100 };
  for (const [category, count] of Object.entries(counts)) {
    await page.locator(`[data-category="${category}"]`).click();
    await expect(page.locator("#asset-list button")).toHaveCount(count);
    await page.locator("#asset-list button").last().click();
    await expect(page.locator(".viewport-wrap")).toHaveAttribute("data-frame", /\d+\.\d+x\d+\.\d+x\d+\.\d+@\d+\.\d+/);
  }
  await page.locator('[data-category="fauna"]').click();
  const search = page.locator("#asset-search");
  await search.fill("비전 늑대");
  await expect(page.locator("#asset-list button")).toHaveCount(1);
  await expect(page.locator("#asset-name")).toContainText("비전 늑대");
  const viewport = page.locator("canvas.viewport");
  const box = await viewport.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, { steps: 12 });
  await page.mouse.up();
  await page.mouse.wheel(0, -200);
  await page.screenshot({ path: `${captures}/wolf-orbit-zoom.png` });
  await search.fill("no-such-asset-12345");
  await expect(page.locator(".asset-list-empty")).toBeVisible();
  await page.locator('[data-category="equipment"]').click();
  await expect(search).toHaveValue("");
  await search.fill("월광 대검");
  await expect(page.locator("#asset-list button")).toHaveCount(1);
  await expect(page.locator("#asset-kind")).toHaveText("ITEM · WEAPON");
  await page.setViewportSize({ width: 1050, height: 720 });
  await page.screenshot({ path: `${captures}/weapon-resized.png` });
  await page.reload();
  await expect(page.locator("#asset-list button")).toHaveCount(6);
  await expect(page.locator(".viewport-wrap")).toHaveAttribute("data-asset-source", "blender-glb");
  assert.deepEqual(external, [], "Gallery must not request HTTP resources");
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ offline: true, copiedHtml: true, assets: 685, model: "blender-glb", externalRequests: 0, gallery: "passed" }));
} finally {
  await browser.close();
  rmSync(directory, { recursive: true, force: true });
}
