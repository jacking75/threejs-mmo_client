import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("착장 미리보기는 확정 전 저장하지 않고 취소·실패·재시도를 지원한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator('.lobby-actions [data-action="create"]').click();
  await page.locator('[data-body="feminine"]').click();
  await page.locator('input[name="characterName"]').fill("별빛기사");
  await page.locator('button[type="submit"]').click();
  await page.locator('[data-action="enter"]').click();
  const field = page.locator(".field-shell");
  await expect(field).toHaveAttribute("data-avatar-status", "ready");
  const saved = () => page.evaluate(() => localStorage.getItem("anime-field-rpg.profile.v1"));
  const original = await saved();
  mkdirSync("docs_working/ui-review", { recursive: true });
  await page.screenshot({ path: "docs_working/ui-review/field.png" });
  await page.getByRole("button", { name: "F 검 공격" }).click();
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await page.locator(".inventory-toggle").click();
  await expect(page.locator("[data-apply]")).toBeDisabled();
  await expect(page.locator(".inventory-preview")).toHaveAttribute("data-avatar-status", "ready");
  await expect(page.locator(".inventory-preview")).toHaveAttribute("data-avatar-source", "blender-glb");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "docs_working/ui-review/inventory-before.png" });
  await page.locator('[data-item-id="weapon.moon-sword"]').click();
  await page.locator('[data-item-id="outfit.traveler"]').click();
  await page.locator('[data-item-id="head.starter-cap"]').click();
  await expect(page.locator(".inventory-change-count")).toHaveText("3개 부위 변경 예정");
  expect(await saved()).toBe(original);
  await expect(page.locator(".field-weapon-label")).toContainText("연습용 검");
  await expect(page.locator(".inventory-stage")).toHaveAttribute("data-weapon", "weapon.moon-sword");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "docs_working/ui-review/inventory-preview.png" });
  await page.getByRole("button", { name: "캐릭터 오른쪽 회전" }).click();
  await page.getByRole("button", { name: "캐릭터 왼쪽 회전" }).click();
  const position = await field.getAttribute("data-player-z");
  await page.keyboard.down("KeyW");
  await page.keyboard.press("KeyF");
  await page.waitForTimeout(200);
  await page.keyboard.up("KeyW");
  await expect(field).toHaveAttribute("data-player-z", position ?? "");
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyI");
  await expect(page.locator(".inventory-stage")).toHaveAttribute("data-weapon", "weapon.training-sword");
  await expect(page.locator("[data-apply]")).toBeDisabled();
  expect(await saved()).toBe(original);

  await page.locator('[data-item-id="weapon.moon-sword"]').click();
  await page.locator('[data-item-id="outfit.traveler"]').click();
  await page.locator('[data-item-id="head.starter-cap"]').click();
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      Storage.prototype.setItem = originalSet;
      if (key === "anime-field-rpg.profile.v1") throw new DOMException("Test storage failure", "QuotaExceededError");
      originalSet.call(this, key, value);
    };
  });
  await page.locator("[data-apply]").click();
  await expect(page.locator(".inventory-feedback")).toContainText("저장하지 못했습니다");
  expect(await saved()).toBe(original);
  await expect(page.locator(".field-weapon-label")).toContainText("연습용 검");
  await page.locator("[data-apply]").click();
  await expect(page.locator(".inventory-feedback")).toContainText("저장했습니다");
  await expect(page.locator(".field-weapon-label")).toContainText("달빛 검");
  expect(JSON.parse((await saved()) ?? "{}").equipped).toEqual({
    weapon: "weapon.moon-sword", outfit: "outfit.traveler", head: "head.starter-cap", accessory: null,
  });
  await page.locator('.inventory-filters [data-filter="head"]').click();
  await page.locator('[data-item-id="head.none"]').click();
  await page.locator("[data-reset]").click();
  await expect(page.locator(".inventory-stage")).toHaveAttribute("data-head", "head.starter-cap");
  await page.locator('.inventory-filters [data-filter="all"]').click();
  for (const viewport of [{ width: 1280, height: 720 }, { width: 900, height: 650 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    await expect(page.locator("[data-apply]")).toBeInViewport();
    await expect(page.locator(".inventory-preview")).toBeInViewport();
    await page.screenshot({ path: `docs_working/ui-review/inventory-${viewport.width}.png` });
  }
  await page.reload();
  await expect(page.locator(".spec-weapon")).toHaveText("달빛 검");
  await page.locator('[data-action="enter"]').click();
  await page.keyboard.press("KeyI");
  await expect(page.locator(".inventory-stage")).toHaveAttribute("data-outfit", "outfit.traveler");
  await page.locator('[data-item-id="weapon.training-sword"]').click();
  await page.getByRole("button", { name: "취소 · 닫기" }).click();
  await page.keyboard.press("KeyI");
  await expect(page.locator(".inventory-stage")).toHaveAttribute("data-weapon", "weapon.moon-sword");
  await page.keyboard.press("KeyI");
  expect(errors).toEqual([]);
});
