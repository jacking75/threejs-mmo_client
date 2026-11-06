import { expect, test } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { CLASS_CATALOG, getWeaponKind, ITEM_CATALOG, RANGED_WEAPON_IDS } from "../../src/domain/catalog";
import { createDefaultProfile } from "../../src/domain/character";

test.use({ baseURL: process.env.WEAPON_TEST_BASE_URL ?? "http://127.0.0.1:4173" });

for (const classId of ["mage", "ranger"] as const) {
  test(`${classId}: 시작 무기, 20종 착장, 공격, 저장 복원`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    const directory = join(tmpdir(), "threejs-mmo-weapons", classId);
    mkdirSync(directory, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('.lobby-actions [data-action="create"]').click();
    await page.locator(`[data-class-id="${classId}"]`).click();
    if (classId === "mage") await page.locator('[data-body="masculine"]').click();
    const starter = CLASS_CATALOG[classId].starterEquipment.weapon;
    await expect(page.locator(".loadout-list")).toContainText(ITEM_CATALOG[starter].label);
    await page.locator('input[name="characterName"]').fill(classId === "mage" ? "마법검수" : "궁술검수");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".spec-weapon")).toHaveText(ITEM_CATALOG[starter].label);
    await page.locator('[data-action="enter"]').click();
    const field = page.locator(".field-shell");
    await expect(field).toHaveAttribute("data-avatar-status", "ready");
    await expect(page.locator(".attack-toggle strong")).toHaveText(classId === "mage" ? "마법 시전" : "활 발사");
    await page.keyboard.press("KeyF");
    await expect(field).toHaveAttribute("data-animation", "attack_1");
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(directory, "starter-attack.png") });
    await expect(field).toHaveAttribute("data-animation", "idle");
    await page.keyboard.press("KeyI");
    await page.locator('.inventory-filters [data-filter="weapon"]').click();
    const original = await page.evaluate(() => localStorage.getItem("anime-field-rpg.profile.v1"));
    expect(RANGED_WEAPON_IDS.filter(id => getWeaponKind(id) === "staff")).toHaveLength(10);
    expect(RANGED_WEAPON_IDS.filter(id => getWeaponKind(id) === "bow")).toHaveLength(10);
    for (const id of RANGED_WEAPON_IDS) {
      await page.locator(`[data-item-id="${id}"]`).click();
      await expect(page.locator(".inventory-stage")).toHaveAttribute("data-weapon", id);
      await page.locator(".inventory-preview").screenshot({ path: join(directory, `${id}.png`) });
    }
    expect(await page.evaluate(() => localStorage.getItem("anime-field-rpg.profile.v1"))).toBe(original);
    const finalId = classId === "mage" ? "weapon.clockwork-staff" : "weapon.raven-bow";
    await page.locator(`[data-item-id="${finalId}"]`).click();
    await page.locator("[data-apply]").click();
    await expect(page.locator(".inventory-feedback")).toContainText("저장했습니다");
    await page.keyboard.press("Escape");
    await page.keyboard.press("KeyF");
    await expect(field).toHaveAttribute("data-attack-count", "2");
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(directory, "equipped-attack.png") });
    await page.reload();
    await expect(page.locator(".spec-weapon")).toHaveText(ITEM_CATALOG[finalId].label);
    await page.locator('[data-action="enter"]').click();
    await page.keyboard.press("KeyI");
    await expect(page.locator(".inventory-stage")).toHaveAttribute("data-weapon", finalId);
    expect(errors).toEqual([]);
  });
}

test("검·마법·궁술 동작의 준비·타격·회복을 정면과 측면에서 확인한다", async ({ page }) => {
  test.setTimeout(120_000);
  const directory = join(tmpdir(), "threejs-mmo-weapons", "motion");
  mkdirSync(directory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const classId of ["warrior", "mage", "ranger"] as const) {
    await page.goto("/");
    const profile = createDefaultProfile({ name: "동작검수", body: "feminine", classId });
    await page.evaluate(profile => {
      localStorage.clear();
      localStorage.setItem("anime-field-rpg.profile.v1", JSON.stringify(profile));
    }, profile);
    await page.reload();
    await page.locator('[data-action="enter"]').click();
    const field = page.locator(".field-shell");
    await expect(field).toHaveAttribute("data-avatar-status", "ready");
    await expect(field).toHaveAttribute("data-weapon-kind", getWeaponKind(profile.equipped.weapon));
    await page.mouse.move(800, 440);
    await page.mouse.wheel(0, -650);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(130, 400, { steps: 15 });
    await page.mouse.up({ button: "right" });
    for (const view of ["front", "side"]) {
      for (const phase of [0.2, 0.45, 0.7]) {
        await page.waitForTimeout(350);
        await page.keyboard.press("KeyF");
        await page.waitForFunction(threshold => {
          const field = document.querySelector<HTMLElement>(".field-shell");
          return field?.dataset.animation === "attack_1" && Number(field.dataset.attackProgress) >= threshold;
        }, phase);
        await page.screenshot({ path: join(directory, `${classId}-${view}-${phase}.png`) });
        await expect(field).toHaveAttribute("data-animation", "idle");
      }
      await page.mouse.move(800, 400);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(490, 400, { steps: 10 });
      await page.mouse.up({ button: "right" });
    }
  }
});
