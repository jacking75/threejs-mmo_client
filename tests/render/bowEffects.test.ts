import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { BowEffects, BOW_EFFECT_IDS } from "../../src/render/effects/BowEffects";

describe("bow attack effects", () => {
  it("gives all ten bows structurally different projectiles and themed trails", () => {
    const signatures = new Set<string>();
    const names = new Set(Object.values(BOW_EFFECT_IDS));
    expect(names.size).toBe(10);
    for (const id of Object.keys(BOW_EFFECT_IDS)) {
      const effect = new BowEffects(id);
      const structure: string[] = [];
      effect.group.traverse(node => { if (node instanceof THREE.Mesh) structure.push(`${node.name}:${node.geometry.type}`); });
      signatures.add(structure.join("|"));
      effect.update(0.76, new THREE.Vector3(0.2, 3.2, 1));
      expect(effect.group.visible).toBe(true);
      expect(effect.group.getObjectByName("bow.flight")?.visible).toBe(true);
      effect.dispose();
    }
    expect(signatures.size).toBe(10);
  });

  it("separates charging, arrow travel and lingering impact while reusing GPU resources", () => {
    const effect = new BowEffects("weapon.storm-bow");
    const muzzle = new THREE.Vector3(1, 3, 2);
    const geometry: THREE.BufferGeometry[] = [];
    effect.group.traverse(node => { if (node instanceof THREE.Mesh) geometry.push(node.geometry); });
    effect.update(0.4, muzzle);
    expect(effect.group.getObjectByName("bow.charge")?.visible).toBe(true);
    expect(effect.group.getObjectByName("bow.flight")?.visible).toBe(false);
    effect.update(0.77, muzzle);
    const projectile = effect.group.getObjectByName("bow.projectile.storm.0");
    expect(projectile?.position.z).toBeGreaterThan(5);
    effect.update(1.12, muzzle);
    expect(effect.group.getObjectByName("bow.flight")?.visible).toBe(false);
    expect(effect.group.getObjectByName("bow.burst")?.visible).toBe(true);
    const after: THREE.BufferGeometry[] = [];
    effect.group.traverse(node => { if (node instanceof THREE.Mesh) after.push(node.geometry); });
    expect(after).toEqual(geometry);
    effect.update(1.35, muzzle);
    expect(effect.group.visible).toBe(false);
    effect.update(-1, muzzle);
    expect(effect.group.visible).toBe(false);
    effect.dispose();
  });

  it("disposes every unique geometry and material once and detaches from the scene", () => {
    const effect = new BowEffects("weapon.sunwing-bow");
    const parent = new THREE.Group(); parent.add(effect.group);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    effect.group.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      geometries.add(node.geometry);
      const entries = Array.isArray(node.material) ? node.material : [node.material];
      entries.forEach(material => materials.add(material));
    });
    const disposals = [...geometries, ...materials].map(resource => vi.spyOn(resource, "dispose"));
    effect.dispose(); effect.dispose();
    expect(effect.group.parent).toBeNull();
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
    effect.update(0.5, new THREE.Vector3());
    expect(effect.group.visible).toBe(false);
  });
});
