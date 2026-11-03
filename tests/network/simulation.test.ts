import { describe, expect, it } from "vitest";
import { World } from "../../src/network/World";
import { FaultLink } from "../../src/network/FaultLink";
import { interpolate, move, reconcile } from "../../src/network/protocol";
import type { InputCommand } from "../../src/network/protocol";

describe("authoritative network simulation", () => {
  it.each([50, 150, 300])("converges with %ims latency, loss, duplicates and reordered input", latency => {
    const world = new World(); world.join("session", "player", 0);
    const link = new FaultLink<InputCommand[]>();
    let pending: InputCommand[] = [], next = 0, maxError = 0;
    for (let now = 0; now < 6000; now += 50) {
      if (now < 2000) pending.push({ seq: ++next, x: 1, z: 0 });
      link.send([...pending], now, latency, true);
      for (const commands of link.drain(now)) world.input("session", commands, now);
      world.step(now);
      const entity = world.snapshot("session", now).entities[0];
      pending = pending.filter(input => input.seq > entity.ack);
      const prediction = reconcile(entity, pending);
      maxError = Math.max(maxError, Math.abs(prediction.x - next * .3));
    }
    const final = world.snapshot("session", 6000).entities[0];
    expect(final.x).toBeCloseTo(12); expect(final.ack).toBe(40); expect(maxError).toBeLessThan(1e-8);
  });
  it("limits speed to one input per tick, rejects malformed values and resumes server state", () => {
    const world = new World(); world.join("a", "id", 0);
    expect(() => world.input("a", [{ seq: 1, x: NaN, z: 0 }], 0)).toThrow();
    world.input("a", Array.from({ length: 100 }, (_, i) => ({ seq: i + 1, x: 1, z: 1 })), 0);
    world.step(50);
    const before = world.snapshot("a", 50).entities[0];
    expect(Math.hypot(before.x, before.z)).toBeCloseTo(.3);
    world.leave("a");
    expect(() => world.snapshot("a", 100)).toThrow();
    expect(world.join("a", "ignored", 100)).toEqual(before);
    world.step(200); expect(world.snapshot("a", 200).entities[0]).toEqual(before);
    world.step(31000); expect(world.has("a")).toBe(false);
  });
  it("filters interest regions, cleans disconnected peers, and clamps interpolation", () => {
    const world = new World(); world.join("a", "a", 0); world.join("b", "b", 0);
    const full = world.snapshot("a", 0, 200, 200), near = world.snapshot("a", 0, 15, 200);
    expect(near.entities.length).toBeLessThan(full.entities.length / 4);
    expect(new Set(full.entities.map(e => e.id)).size).toBe(full.entities.length);
    world.leave("b"); expect(world.snapshot("a", 1).entities).toHaveLength(1);
    expect(interpolate({ x: 0, z: 0 }, { x: 10, z: 20 }, .5)).toEqual({ x: 5, z: 10 });
    expect(interpolate({ x: 0, z: 0 }, { x: 10, z: 20 }, 2)).toEqual({ x: 10, z: 20 });
    expect(move({ x: 100, z: 100 }, { seq: 1, x: 1, z: 0 }).x).toBe(100);
  });
});
