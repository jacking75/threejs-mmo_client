import * as THREE from "three";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createAnimeAvatar, createAvatarOutfitVisual } from "../../src/assets/avatar/createAnimeAvatar";
import { applyImportedOutfit, createRuntimeAvatar } from "../../src/assets/avatar/createRuntimeAvatar";
import { NEW_OUTFIT_IDS, isAvatarOutfitId } from "../../src/assets/types";

describe("expanded playable outfits", () => {
  it("provides ten original geometry signatures independent of color, in both body presentations", () => {
    expect(NEW_OUTFIT_IDS).toHaveLength(10);
    for (const body of ["feminine", "masculine"] as const) {
      const signatures = NEW_OUTFIT_IDS.map((id) => {
        expect(isAvatarOutfitId(id)).toBe(true);
        const avatar = createAnimeAvatar({ body, classId: "ranger", outfitId: id });
        avatar.updateMatrixWorld(true);
        const root = avatar.getObjectByName(`${id}.root`);
        const chest = avatar.getObjectByName(`${id}.chest`);
        if (!root || !chest) throw new Error(`Missing garment modules for ${id}`);
        expect(root.parent?.name).toBe("outfit.mount.root");
        expect(chest.parent?.name).toBe("outfit.mount.chest");
        const bounds = new THREE.Box3().setFromObject(root).union(new THREE.Box3().setFromObject(chest));
        expect(bounds.isEmpty()).toBe(false);
        expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
        expect(bounds.min.y).toBeGreaterThan(0.3);
        expect(bounds.max.y).toBeLessThan(4.1);
        const hash = createHash("sha256");
        for (const group of [root, chest]) {
          group.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            const positions = node.geometry.getAttribute("position").array;
            hash.update(Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength));
            hash.update(JSON.stringify([node.position.toArray(), node.rotation.toArray(), node.scale.toArray()]));
          });
        }
        return hash.digest("hex");
      });
      expect(new Set(signatures).size).toBe(10);
    }
    expect(isAvatarOutfitId("outfit.missing")).toBe(false);
    expect(isAvatarOutfitId(null)).toBe(false);
  });

  it("creates independently disposable garment resources", () => {
    const first = createAvatarOutfitVisual("outfit.astral-scholar");
    const second = createAvatarOutfitVisual("outfit.astral-scholar");
    const firstPart = first.chest.children.find((node) => node instanceof THREE.Mesh) as THREE.Mesh;
    const secondPart = second.chest.children.find((node) => node instanceof THREE.Mesh) as THREE.Mesh;
    expect(firstPart.geometry).not.toBe(secondPart.geometry);
    expect(firstPart.material).not.toBe(secondPart.material);
  });

  it("encloses the masculine chest at front, back and sides without burying its ornaments", () => {
    for (const outfitId of NEW_OUTFIT_IDS) {
      const avatar = createAnimeAvatar({ body: "masculine", classId: "warrior", outfitId });
      avatar.updateMatrixWorld(true);
      const shell = avatar.getObjectByName(`${outfitId}.bodice`) ?? avatar.getObjectByName(`${outfitId}.faceted-cuirass`);
      const body = avatar.getObjectByName("chest.mesh");
      if (!shell || !body) throw new Error(`Missing fitted shell: ${outfitId}`);
      // Cast inward from outside: the clothing must be reached before the body.
      for (const y of [-0.42, -0.2, 0, 0.2, 0.35]) {
        for (const direction of [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)]) {
          const origin = direction.clone().multiplyScalar(2).add(new THREE.Vector3(0, 3.15 + y, 0));
          const ray = new THREE.Raycaster(origin, direction.clone().negate());
          const bodyHit = ray.intersectObject(body)[0];
          const shellHit = ray.intersectObject(shell)[0];
          expect(bodyHit, `${outfitId} body sample ${y}`).toBeDefined();
          expect(shellHit, `${outfitId} shell sample ${y}`).toBeDefined();
          expect(shellHit.distance, `${outfitId} covers ${direction.toArray()} at ${y}`).toBeLessThan(bodyHit.distance);
        }
      }
    }
  });

  it("restores new garments after the asynchronous GLB upgrade and follows its chest bone", async () => {
    const avatar = createRuntimeAvatar({ body: "feminine", classId: "warrior", outfitId: "outfit.dune-nomad" }, async () => ({
      scene: importedScene(), animations: [],
    }));
    await avatar.userData.assetReady;
    expect(avatar.userData.assetSource).toBe("blender-glb");
    const { nodes } = avatar.userData.sculptRuntime;
    const chestOutfit = nodes["outfit.mount.chest"].children[0];
    expect(chestOutfit.name).toBe("outfit.dune-nomad.chest");
    expect(chestOutfit.position.y).toBeCloseTo(0.47);
    expect(chestOutfit.parent?.parent).toBe(nodes.chest);
    expect(nodes["outfit.mount.root"].children[0].name).toBe("outfit.dune-nomad.root");
    expect(avatar.getObjectByName("outfit.warrior.tunic")?.visible).toBe(false);
    const before = chestOutfit.getWorldPosition(new THREE.Vector3());
    nodes.chest.position.x += 0.3;
    expect(chestOutfit.getWorldPosition(new THREE.Vector3()).x - before.x).toBeCloseTo(0.3);
  });

  it("replaces imported garment overlays without duplicates and disposes old geometry", async () => {
    const avatar = createRuntimeAvatar({ body: "feminine", classId: "warrior" }, async () => ({ scene: importedScene(), animations: [] }));
    await avatar.userData.assetReady;
    const { nodes } = avatar.userData.sculptRuntime;
    for (const id of NEW_OUTFIT_IDS) {
      const previous = nodes["outfit.mount.chest"].children[0];
      const previousMesh = previous?.children.find((node) => node instanceof THREE.Mesh) as THREE.Mesh | undefined;
      const disposed = vi.fn();
      previousMesh?.geometry.addEventListener("dispose", disposed);
      expect(applyImportedOutfit(avatar, id)).toBe(true);
      expect(nodes["outfit.mount.chest"].children).toHaveLength(1);
      expect(nodes["outfit.mount.root"].children).toHaveLength(1);
      expect(nodes["outfit.mount.chest"].children[0].name).toBe(`${id}.chest`);
      if (previousMesh) expect(disposed).toHaveBeenCalledOnce();
    }
    expect(applyImportedOutfit(avatar, "outfit.warrior-starter")).toBe(true);
    expect(nodes["outfit.mount.chest"].children).toHaveLength(0);
    expect(nodes["outfit.mount.root"].children).toHaveLength(0);
    expect(avatar.getObjectByName("outfit.warrior.tunic")?.visible).toBe(true);
  });
});

function importedScene(): THREE.Group {
  const scene = new THREE.Group();
  for (const name of ["chest", "head", "back", "pelvis", "arm.L.upper", "arm.L.lower", "hand.L", "arm.R.upper", "arm.R.lower", "hand.R", "leg.L.upper", "leg.L.lower", "ankle.L", "leg.R.upper", "leg.R.lower", "ankle.R", "body.continuous"]) {
    const node = new THREE.Group();
    node.name = name;
    if (name === "chest") node.position.y = 2.68;
    scene.add(node);
  }
  const tunic = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  tunic.name = "outfit.warrior.tunic";
  scene.add(tunic);
  return scene;
}
