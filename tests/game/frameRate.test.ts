import { expect, it } from "vitest";
import { Vector3 } from "three";
import { getCameraRelativeMovement, getMovementSpeed } from "../../src/game/movement";
import { advanceAttack, createAttackTimeline, startAttack } from "../../src/game/animationState";

it.each([30, 60, 120])("keeps movement and attack duration stable at %i fps", fps => {
  const direction = getCameraRelativeMovement({ forward: 1, right: 1, sprint: false }, new Vector3(0, 0, -1), new Vector3());
  let distance = 0, elapsed = 0;
  let attack = startAttack(createAttackTimeline()).timeline;
  for (let i = 0; i < fps * 2; i++) distance += direction.length() * getMovementSpeed(false) / fps;
  while (attack.active) { attack = advanceAttack(attack, 1 / fps); elapsed += 1 / fps; }
  expect(distance).toBeCloseTo(getMovementSpeed(false) * 2);
  expect(elapsed).toBeGreaterThanOrEqual(.72 - 1e-8); expect(elapsed).toBeLessThanOrEqual(.72 + 1 / fps + 1e-8);
});
