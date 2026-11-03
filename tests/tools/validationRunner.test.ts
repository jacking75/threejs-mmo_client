import { expect, it } from "vitest";
import { ValidationRunner } from "../../tools/resource-editor/validation/ValidationRunner";
import { WorkspacePolicy } from "../../tools/resource-editor/policy/WorkspacePolicy";

it("runs a real focused validation through Node argv without an OS shell", async () => {
  const runner = new ValidationRunner(new WorkspacePolicy(process.cwd()), () => undefined);
  const passed = await runner.run("portable-check", [{ id: "focused", label: "GLB contract" }], ["tests/assets/femaleWarriorGlb.test.ts"], new AbortController().signal);
  expect(passed).toBe(true);
}, 20_000);
