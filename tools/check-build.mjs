/* global process, console, setTimeout, fetch, window */
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";

mkdirSync("docs_working/build-check", { recursive: true });
execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"], { stdio: "inherit", windowsHide: true });
for (const base of ["/threejs-mmo_client/", "/"]) {
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], { env: { ...process.env, BASE_PATH: base }, stdio: "inherit", windowsHide: true });
  if (readdirSync("dist/assets").some(file => /ResourceEditor|NetworkLab|AssetGallery|AssetViewport/.test(file))) throw new Error("Development chunks leaked into production");
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", "4180", "--strictPort"], { env: { ...process.env, BASE_PATH: base }, windowsHide: true, stdio: "ignore" });
  let browser;
  try {
    const url = `http://127.0.0.1:4180${base}`;
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { ready = (await fetch(url)).ok; } catch { /* server startup */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error("Preview did not start");
    browser = await chromium.launch({ channel: "chrome", headless: true,
      args: process.env.CI ? ["--use-gl=angle", "--use-angle=swiftshader", "--disable-dev-shm-usage"] : [],
    });
    const page = await browser.newPage({ viewport: process.env.CI ? { width: 960, height: 640 } : { width: 1440, height: 900 } });
    const errors = [], glbs = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("requestfailed", request => errors.push(request.url()));
    page.on("response", response => { if (response.url().endsWith("female-warrior.glb")) glbs.push({ url: response.url(), status: response.status() }); });
    await page.goto(url);
    await page.locator('.lobby-actions [data-action="create"]').click();
    await page.locator('[data-body="feminine"]').click();
    await page.locator('input[name="characterName"]').fill("ReleaseCheck");
    await page.locator('button[type="submit"]').click();
    await page.locator('[data-action="enter"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `docs_working/build-check/${base === "/" ? "root" : "subpath"}.png` });
    await page.reload();
    if (await page.locator(".selected-character-name").textContent() !== "ReleaseCheck") throw new Error("Reload did not restore profile");
    await page.goto(`${url}?mode=editor`);
    if (await page.locator(".re-shell").count()) throw new Error("Editor exposed in production");
    if (await page.evaluate(() => Boolean(window.__rpgDiagnostics))) throw new Error("Diagnostics exposed in production");
    if (!glbs.length || glbs.some(r => r.status !== 200 || !r.url.includes(`${base}assets/`)) || errors.length) throw new Error(JSON.stringify({ glbs, errors }));
    console.log(JSON.stringify({ base, glbs: glbs.length, errors, reload: "passed", devChunks: "absent" }));
  } finally {
    await browser?.close();
    if (server.exitCode === null) { const stopped = once(server, "exit"); server.kill(); await stopped; }
  }
}
