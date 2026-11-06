import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getWeaponKind, RANGED_WEAPON_IDS } from "../../src/domain/catalog";
import { createDefaultProfile, type BodyPresentation, type CharacterClass } from "../../src/domain/character";
import { getAttackDuration } from "../../src/game/animationState";

const baseURL = process.env.WEAPON_TEST_BASE_URL ?? "http://127.0.0.1:4173";
const captures = join(tmpdir(), "threejs-mmo-effects");
test.use({ baseURL });

async function enterField(page: Page, body: BodyPresentation, classId: CharacterClass, weapon: string): Promise<void> {
  await page.goto("/");
  const profile = createDefaultProfile({ name: "이펙트검수", body, classId });
  await page.evaluate(profile => {
    localStorage.clear();
    localStorage.setItem("anime-field-rpg.profile.v1", JSON.stringify(profile));
  }, { ...profile, equipped: { ...profile.equipped, weapon } });
  await page.reload();
  await page.locator('[data-action="enter"]').click();
  await expect(page.locator(".field-shell")).toHaveAttribute("data-avatar-status", "ready");
  await page.mouse.move(800, 420);
  await page.mouse.wheel(0, -120);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(490, 420, { steps: 10 });
  await page.mouse.up({ button: "right" });
}

function recordErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

async function waitForPhase(page: Page, phase: string): Promise<void> {
  await page.waitForFunction(phase => {
    const field = document.querySelector<HTMLElement>(".field-shell");
    return field?.dataset.effectPhase === phase
      && (phase !== "charge" || Number(field.dataset.attackProgress) >= 0.24);
  }, phase, { polling: "raf", timeout: 5_000 });
}

test("지팡이와 활 20종은 서로 다른 충전·비행·폭발 이펙트를 표시하고 정리한다", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(captures, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = recordErrors(page);
  const first = RANGED_WEAPON_IDS[0];
  await page.clock.install();
  await enterField(page, "feminine", "mage", first);
  await page.clock.pauseAt(new Date(Date.now() + 1_000));
  const field = page.locator(".field-shell");
  const effects = new Set<string>();
  for (const [index, id] of RANGED_WEAPON_IDS.entries()) {
    if (index > 0) {
      await page.keyboard.press("KeyI");
      await page.locator('.inventory-filters [data-filter="weapon"]').click();
      await page.locator(`[data-item-id="${id}"]`).click();
      await page.locator("[data-apply]").click();
      await page.keyboard.press("Escape");
      await page.clock.runFor(32);
    }
    await expect(field).toHaveAttribute("data-weapon-kind", getWeaponKind(id));
    const name = await field.getAttribute("data-attack-effect");
    expect(name).toBeTruthy();
    expect(effects.has(name ?? "")).toBe(false);
    effects.add(name ?? "");
    await page.keyboard.press("KeyF");
    const durationMs = getAttackDuration(getWeaponKind(id)) * 1_000;
    let previous = 0;
    for (const [phase, progress] of [["charge", 0.32], ["flight", 0.76], ["burst", 1.08]] as const) {
      await page.clock.runFor((progress - previous) * durationMs + 16);
      previous = progress;
      await expect(field).toHaveAttribute("data-effect-phase", phase);
      await page.screenshot({ path: join(captures, `${id}-${phase}.png`) });
    }
    await page.clock.runFor(durationMs * 0.5);
    await expect(field).toHaveAttribute("data-effect-phase", "idle");
    await expect(field).toHaveAttribute("data-animation", "idle");
  }
  expect(effects.size).toBe(20);
  expect(errors).toEqual([]);
});

test("수입 아바타와 남성 체형도 무기 교체 후 효과·반복 발사를 유지한다", async ({ page }) => {
  test.setTimeout(60_000);
  mkdirSync(captures, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = recordErrors(page);
  const cases = [
    { body: "feminine", classId: "warrior", weapon: "weapon.ember-cage-staff" },
    { body: "masculine", classId: "mage", weapon: "weapon.astral-staff" },
    { body: "masculine", classId: "ranger", weapon: "weapon.storm-bow" },
  ] as const;
  for (const entry of cases) {
    await enterField(page, entry.body, entry.classId, entry.weapon);
    const field = page.locator(".field-shell");
    for (let shot = 0; shot < 2; shot += 1) {
      await page.keyboard.press("KeyF");
      await waitForPhase(page, "flight");
      if (shot === 0) await page.screenshot({ path: join(captures, `${entry.body}-${entry.classId}-flight.png`) });
      await expect(field).toHaveAttribute("data-effect-phase", "idle");
      await page.waitForTimeout(300);
    }
    await expect(field).toHaveAttribute("data-attack-count", "2");
  }
  expect(errors).toEqual([]);
});
