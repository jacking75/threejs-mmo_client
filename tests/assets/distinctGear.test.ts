import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { DISTINCT_WEAPON_FACTORIES } from "../../src/assets/equipment/createDistinctWeapons";
import { DISTINCT_HEAD_FACTORIES } from "../../src/assets/equipment/createDistinctHeadwear";
import { ACCESSORY_SOCKETS, DISTINCT_ACCESSORY_FACTORIES } from "../../src/assets/equipment/createDistinctAccessories";
import { createAnimeAvatar } from "../../src/assets/avatar/createAnimeAvatar";
import { createRuntimeAvatar } from "../../src/assets/avatar/createRuntimeAvatar";
import { createDefaultProfile } from "../../src/domain/character";
import { EquipmentRenderer } from "../../src/render/EquipmentRenderer";

const categories = [DISTINCT_WEAPON_FACTORIES, DISTINCT_HEAD_FACTORIES, DISTINCT_ACCESSORY_FACTORIES];

function dispose(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => material.dispose());
  });
}

describe("distinct playable gear", () => {
  it("has 5 weapons, 10 head pieces and 5 accessories with unique geometry, not palette duplicates", () => {
    expect(categories.map((category) => Object.keys(category).length)).toEqual([5, 10, 5]);
    for (const category of categories) {
      const signatures = Object.entries(category).map(([id, create]) => {
        const root = create();
        expect(root.name).toBe(id);
        const points: number[] = [];
        root.updateMatrixWorld(true);
        root.traverse((node) => {
          expect(node.name.length).toBeGreaterThan(0);
          if (!(node instanceof THREE.Mesh)) return;
          const positions = node.geometry.getAttribute("position");
          for (let i = 0; i < positions.count; i++) {
            const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
            expect(point.toArray().every(Number.isFinite)).toBe(true);
            points.push(...point.toArray().map((value) => Math.round(value * 1000)));
          }
        });
        const bounds = new THREE.Box3().setFromObject(root);
        expect(bounds.isEmpty()).toBe(false);
        expect(bounds.getSize(new THREE.Vector3()).length()).toBeGreaterThan(.4);
        dispose(root);
        return JSON.stringify(points);
      });
      expect(new Set(signatures).size).toBe(signatures.length);
    }
  });

  it("uses origin grips and explicit socket contracts", () => {
    for (const create of Object.values(DISTINCT_WEAPON_FACTORIES)) {
      const root = create();
      expect(root.getObjectByName("grip")?.position.toArray()).toEqual([0, 0, 0]);
      expect(root.userData.equipmentContract).toMatchObject({ gripOrigin: [0,0,0], bladeAxis: "+Y", frontAxis: "+Z" });
      dispose(root);
    }
    for (const [id, create] of Object.entries(DISTINCT_ACCESSORY_FACTORIES)) {
      const root = create();
      expect(root.userData.attachment.socket).toBe(ACCESSORY_SOCKETS[id as keyof typeof ACCESSORY_SOCKETS]);
      dispose(root);
    }
  });

  it("switches between left hand and back, disposes previous gear, and removes unequipped accessories", () => {
    const profile = createDefaultProfile({ name: "장비검사", body: "masculine", classId: "warrior" });
    const avatar = createAnimeAvatar({ body: profile.body, classId: profile.classId });
    const renderer = new EquipmentRenderer(avatar);
    renderer.sync({ ...profile, equipped: { ...profile.equipped, accessory: "accessory.kite-shield" } });
    const shield = renderer.getActiveVisual("accessory");
    if (!shield) throw new Error("Expected an attached shield");
    expect(shield.parent).toBe(avatar.userData.sculptRuntime.sockets["hand.L"]);
    const shieldMesh = shield.getObjectByName("shield.face") as THREE.Mesh;
    const disposeSpy = vi.spyOn(shieldMesh.geometry, "dispose");
    renderer.sync({ ...profile, equipped: { ...profile.equipped, accessory: "accessory.expedition-pack" } });
    expect(shield.parent).toBe(null);
    expect(disposeSpy).toHaveBeenCalledOnce();
    const pack = renderer.getActiveVisual("accessory");
    expect(pack?.parent).toBe(avatar.userData.sculptRuntime.sockets.back);
    renderer.sync({ ...profile, equipped: { ...profile.equipped, accessory: null } });
    expect(pack?.parent).toBe(null);
    expect(renderer.getActiveVisual("accessory")).toBe(null);
    renderer.dispose();
    dispose(avatar);
  });

  it("renders every new attached item without duplicate objects across repeated switching", () => {
    const profile = createDefaultProfile({ name: "장비검사", body: "feminine", classId: "mage" });
    const avatar = createAnimeAvatar({ body: profile.body, classId: profile.classId });
    const renderer = new EquipmentRenderer(avatar);
    for (const category of categories) for (const id of Object.keys(category)) {
      const slot = id.split(".")[0] as "weapon" | "head" | "accessory";
      const next = { ...profile, equipped: { ...profile.equipped, [slot]: id } };
      renderer.sync(next);
      renderer.sync(next);
      let count = 0;
      avatar.traverse((node) => { if (node.userData.itemId === id) count++; });
      expect(count).toBe(1);
      expect(renderer.getActiveVisual(slot)?.name).toBe(id);
    }
    renderer.dispose();
    expect(renderer.getActiveVisual("accessory")).toBe(null);
    dispose(avatar);
  });

  it("preserves newly attached gear and refits it when the imported rig finishes loading", async () => {
    const profile = createDefaultProfile({ name: "불러오기", body: "feminine", classId: "warrior" });
    let resolveLoad: ((value: { scene: THREE.Group; animations: THREE.AnimationClip[] }) => void) | undefined;
    const pending = new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>((resolve) => { resolveLoad = resolve; });
    const avatar = createRuntimeAvatar({ body: profile.body, classId: profile.classId }, () => pending);
    const renderer = new EquipmentRenderer(avatar);
    renderer.sync({ ...profile, equipped: { ...profile.equipped,
      weapon: "weapon.crystal-flamberge", head: "head.antler-crown", accessory: "accessory.harbor-lantern" } });
    const lantern = renderer.getActiveVisual("accessory");
    const head = renderer.getActiveVisual("head");
    const imported = new THREE.Group();
    for (const name of ["chest", "head", "back", "pelvis", "arm.L.upper", "arm.L.lower", "hand.L",
      "arm.R.upper", "arm.R.lower", "hand.R", "leg.L.upper", "leg.L.lower", "ankle.L",
      "leg.R.upper", "leg.R.lower", "ankle.R", "body.continuous"]) {
      const node = new THREE.Group(); node.name = name; imported.add(node);
    }
    if (!resolveLoad) throw new Error("Expected pending loader");
    resolveLoad({ scene: imported, animations: [] });
    await avatar.userData.assetReady;
    expect(avatar.userData.assetSource).toBe("blender-glb");
    expect(renderer.getActiveVisual("accessory")).toBe(lantern);
    expect(lantern?.parent).toBe(avatar.userData.sculptRuntime.sockets["hand.L"]);
    expect(lantern?.rotation.x).toBeCloseTo(Math.PI);
    expect(head?.parent).toBe(avatar.userData.sculptRuntime.sockets.head);
    expect(head?.scale.x).toBeCloseTo(1.1);
    expect(renderer.getActiveVisual("weapon")?.rotation.z).toBe(0);
    renderer.dispose();
    dispose(avatar);
  });
});
