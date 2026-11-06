import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { MAGIC_EFFECT_IDS, MagicEffects } from "../../src/render/effects/MagicEffects";

const muzzle = new THREE.Vector3(-0.7, 4.2, 0.6);

describe("weapon-specific magic effects", () => {
  it("gives all ten staffs a different projectile silhouette and a complete casting sequence", () => {
    expect(Object.keys(MAGIC_EFFECT_IDS)).toHaveLength(10);
    expect(new Set(Object.values(MAGIC_EFFECT_IDS)).size).toBe(10);
    const signatures = new Set<string>();
    for (const itemId of Object.keys(MAGIC_EFFECT_IDS)) {
      const effect = new MagicEffects(itemId);
      effect.update(-1, muzzle);
      expect(effect.group.visible).toBe(false);
      effect.update(0.4, muzzle);
      expect(effect.group.getObjectByName("magic.casting-circle")?.visible).toBe(true);
      expect(effect.group.getObjectByName("magic.charge")?.position.equals(muzzle)).toBe(true);
      effect.update(0.7, muzzle);
      const projectile = effect.group.children.find(child => child.name.startsWith("magic.projectile."));
      if (!projectile) throw new Error("Missing spell projectile");
      expect(projectile.visible).toBe(true);
      signatures.add(projectile.children.map(child => child.name).join("|"));
      effect.update(1.1, muzzle);
      const burst = effect.group.children.find(child => child.name.startsWith("magic.burst."));
      expect(burst?.visible).toBe(true);
      expect(effect.group.visible).toBe(true);
      expect(projectile.visible).toBe(false);
      effect.update(1.35, muzzle);
      expect(effect.group.visible).toBe(false);
      effect.dispose();
    }
    expect(signatures.size).toBe(10);
  });

  it("reuses meshes through repeated casts and frees every geometry, material and texture once", () => {
    const parent = new THREE.Group();
    const effect = new MagicEffects("weapon.ember-cage-staff");
    parent.add(effect.group);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    effect.group.traverse(node => {
      if (node instanceof THREE.Mesh) geometries.add(node.geometry);
      if (node instanceof THREE.Mesh || node instanceof THREE.Sprite) {
        const list = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of list) {
          materials.add(material);
          if ("map" in material && material.map instanceof THREE.Texture) textures.add(material.map);
        }
      }
    });
    const children: THREE.Object3D[] = [];
    effect.group.traverse(node => children.push(node));
    for (let cycle = 0; cycle < 3; cycle += 1) {
      for (const p of [0, 0.2, 0.5, 0.7, 0.9, 1.1, 1.35, -1]) effect.update(p, muzzle);
    }
    const after: THREE.Object3D[] = [];
    effect.group.traverse(node => after.push(node));
    expect(after).toEqual(children);
    let disposed = 0;
    for (const resource of [...geometries, ...materials, ...textures]) resource.addEventListener("dispose", () => { disposed += 1; });
    effect.dispose();
    effect.dispose();
    expect(disposed).toBe(geometries.size + materials.size + textures.size);
    expect(effect.group.parent).toBeNull();
    effect.update(0.5, muzzle);
    expect(effect.group.visible).toBe(false);
  });
});
