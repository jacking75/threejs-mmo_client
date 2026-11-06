import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ITEM_CATALOG, NEW_ITEM_IDS } from "../../src/domain/catalog";

for (const body of ["feminine", "masculine"] as const) {
  test(`새 아이템 30종 착장·적용·복원 (${body})`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    // A previous-version save must receive new items without changing the character.
    await page.evaluate(({ body }) => localStorage.setItem("anime-field-rpg.profile.v1", JSON.stringify({
      version: 1, name: "장비검수", body, classId: "warrior",
      ownedItemIds: ["weapon.training-sword", "weapon.moon-sword", "outfit.warrior-starter", "outfit.traveler", "head.none", "head.starter-cap"],
      equipped: { weapon: "weapon.training-sword", outfit: "outfit.warrior-starter", head: "head.none" },
    })), { body });
    await page.reload();
    await expect(page.locator(".selected-character-name")).toHaveText("장비검수");
    await page.locator('[data-action="enter"]').click();
    await expect(page.locator(".field-shell")).toHaveAttribute("data-avatar-status", "ready");
    const saved = () => page.evaluate(() => localStorage.getItem("anime-field-rpg.profile.v1"));
    const original = await saved();
    await page.keyboard.press("KeyI");
    await expect(page.locator(".inventory-preview")).toHaveAttribute("data-avatar-status", "ready");
    const directory = `docs_working/item-expansion/${body}`;
    mkdirSync(directory, { recursive: true });
    const finalEquipment: Record<string, string> = {};
    for (const slot of ["outfit", "head", "weapon", "accessory"] as const) {
      await page.locator(`.inventory-filters [data-filter="${slot}"]`).click();
      const ids = NEW_ITEM_IDS.filter(id => ITEM_CATALOG[id].slot === slot);
      expect(ids).toHaveLength(slot === "outfit" || slot === "head" ? 10 : 5);
      for (const id of ids) {
        await page.locator(`[data-item-id="${id}"]`).click();
        await expect(page.locator(".inventory-stage")).toHaveAttribute(`data-${slot}`, id);
        await page.waitForTimeout(100);
        await page.locator(".inventory-preview").screenshot({ path: `${directory}/${id}.png` });
        if (slot === "outfit" || slot === "accessory") {
          for (let turn = 0; turn < 4; turn++) await page.getByRole("button", { name: "캐릭터 오른쪽 회전" }).click();
          await page.waitForTimeout(100);
          await page.locator(".inventory-preview").screenshot({ path: `${directory}/${id}.back.png` });
          for (let turn = 0; turn < 4; turn++) await page.getByRole("button", { name: "캐릭터 왼쪽 회전" }).click();
        }
        finalEquipment[slot] = id;
      }
    }
    expect(await saved()).toBe(original);
    await page.locator("[data-apply]").click();
    await expect(page.locator(".inventory-feedback")).toContainText("저장했습니다");
    expect(JSON.parse((await saved()) ?? "{}").equipped).toEqual(finalEquipment);
    await page.screenshot({ path: `${directory}/inventory.png` });
    await page.keyboard.press("Escape");
    await page.keyboard.press("KeyF");
    await expect(page.locator(".field-shell")).toHaveAttribute("data-attack-count", "1");
    await page.reload();
    await page.locator('[data-action="enter"]').click();
    await page.keyboard.press("KeyI");
    await expect(page.locator(".inventory-preview")).toHaveAttribute("data-avatar-status", "ready");
    for (const [slot, id] of Object.entries(finalEquipment)) {
      await expect(page.locator(".inventory-stage")).toHaveAttribute(`data-${slot}`, id);
    }
    await page.locator('.inventory-filters [data-filter="accessory"]').click();
    await page.locator('[data-item-id="accessory.none"]').click();
    await page.locator("[data-apply]").click();
    expect(JSON.parse((await saved()) ?? "{}").equipped.accessory).toBeNull();
    await page.setViewportSize({ width: 900, height: 650 });
    await expect(page.locator("[data-apply]")).toBeInViewport();
    await expect(page.locator(".inventory-preview")).toBeInViewport();
    expect(errors).toEqual([]);
  });
}
