import { expect, test } from "@playwright/test";

test("field controls separate clicks, drags, modal input, focus loss, and browser shortcuts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await page.locator(".lobby-actions [data-action='create']").click();
  await page.locator("input[name='characterName']").fill("조작검사");
  await page.locator("button[type='submit']").click();
  await page.locator("[data-action='enter']").click();
  const field = page.locator(".field-shell"), canvas = page.locator(".field-canvas");
  await expect(field).toHaveAttribute("data-animation", "idle");

  // Real mouse capture: a small click must remain an attack, never a camera drag.
  await page.mouse.move(600, 400);
  await page.mouse.down();
  await page.mouse.move(603, 402);
  await expect(canvas).not.toHaveClass(/is-dragging/);
  await page.mouse.up();
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await page.waitForTimeout(1100);

  for (const button of ["left", "right"] as const) {
    await page.mouse.move(600, 400);
    await page.mouse.down({ button });
    await page.mouse.move(730, 440, { steps: 8 });
    await expect(canvas).toHaveClass(/is-dragging/);
    await page.mouse.up({ button });
    await expect(canvas).not.toHaveClass(/is-dragging/);
    await expect(field).toHaveAttribute("data-attack-count", "1");
  }

  await page.mouse.down();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await page.waitForTimeout(150);
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await expect(canvas).not.toHaveClass(/is-dragging/);

  await page.keyboard.down("KeyW");
  await expect(field).toHaveAttribute("data-animation", "run");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(field).toHaveAttribute("data-animation", "idle");
  const stopped = await field.getAttribute("data-player-z");
  await page.waitForTimeout(150);
  await expect(field).toHaveAttribute("data-player-z", stopped ?? "");
  await page.keyboard.up("KeyW");

  await page.mouse.down();
  await page.mouse.move(800, 440, { steps: 5 });
  await expect(canvas).toHaveClass(/is-dragging/);
  await page.keyboard.press("KeyI");
  await expect(page.locator(".inventory-panel")).toBeVisible();
  await expect(canvas).not.toHaveClass(/is-dragging/);
  await page.mouse.up();
  await page.keyboard.down("KeyW");
  await page.keyboard.press("KeyF");
  await page.waitForTimeout(150);
  await page.keyboard.up("KeyW");
  await expect(field).toHaveAttribute("data-player-z", stopped ?? "");
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await page.keyboard.press("Escape");

  const shortcuts = await page.evaluate(() => {
    const result: boolean[] = [];
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) for (const code of ["KeyF", "KeyW", "KeyI"]) {
      const event = new KeyboardEvent("keydown", { code, [modifier]: true, cancelable: true });
      window.dispatchEvent(event);
      result.push(event.defaultPrevented);
    }
    const text = document.createElement("input");
    text.id = "control-edit-test";
    document.body.append(text);
    text.focus();
    return result;
  });
  expect(shortcuts).toEqual(Array(9).fill(false));
  await page.keyboard.type("wasdfi");
  await expect(page.locator("#control-edit-test")).toHaveValue("wasdfi");
  await expect(field).toHaveAttribute("data-inventory-open", "false");
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await expect(field).toHaveAttribute("data-player-z", stopped ?? "");
  await page.locator("#control-edit-test").evaluate(element => element.remove());

  // Controls recover after cancelling a gesture and closing the modal.
  await page.keyboard.down("KeyW");
  await expect(field).toHaveAttribute("data-animation", "run");
  await page.keyboard.up("KeyW");
  await expect(field).toHaveAttribute("data-animation", "idle");
  await page.keyboard.press("KeyF");
  await expect(field).toHaveAttribute("data-attack-count", "2");
  expect(errors).toEqual([]);
});
