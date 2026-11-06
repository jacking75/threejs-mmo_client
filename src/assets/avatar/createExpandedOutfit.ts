import * as THREE from "three";
import { extrudedShape, mesh } from "../geometry";
import { metal, standard, toon } from "../materials";
import { NEW_OUTFIT_IDS } from "../types";
import type { NewOutfitId } from "../types";

/** Original rigid garment modules. +Y up, +Z front; chest uses Y=3.15 in the canonical rig. */
export function isExpandedOutfitId(id: string): id is NewOutfitId {
  return NEW_OUTFIT_IDS.some((outfitId) => outfitId === id);
}

type Point = readonly [number, number];
type Position = readonly [number, number, number];

export function addExpandedOutfit(id: NewOutfitId, root: THREE.Group, chest: THREE.Group): void {
  const cloth = (color: number) => toon(color);
  const panel = (parent: THREE.Group, name: string, points: readonly Point[], color: number, z: number) => {
    const result = extrudedShape(`${id}.${name}`, points, 0.055, cloth(color), 0.012);
    result.position.z = z;
    parent.add(result);
    return result;
  };
  const box = (parent: THREE.Group, name: string, dimensions: Position, color: number, position: Position) => {
    const result = mesh(`${id}.${name}`, new THREE.BoxGeometry(...dimensions), standard(color), position);
    parent.add(result);
    return result;
  };
  const gem = (parent: THREE.Group, name: string, radius: number, color: number, position: Position) => {
    const result = mesh(`${id}.${name}`, new THREE.OctahedronGeometry(radius), metal(color), position);
    parent.add(result);
    return result;
  };
  const ring = (parent: THREE.Group, name: string, radius: number, thickness: number, color: number, position: Position) => {
    const result = mesh(`${id}.${name}`, new THREE.TorusGeometry(radius, thickness, 6, 24), standard(color), position);
    parent.add(result);
    return result;
  };
  const vest = (color: number, length = 1.16) => chest.add(mesh(`${id}.bodice`,
    new THREE.CylinderGeometry(0.52, 0.4, length, 16), cloth(color), [0, -0.09, 0], [1, 1, 0.8]));
  const belt = (color: number, width = 0.98) => {
    box(root, "belt", [width, 0.13, 0.65], color, [0, 2.44, 0]);
  };
  // A fitted opaque waist foundation closes the space between the torso and
  // separate skirts/coattails, including the imported avatar's exposed pelvis.
  const hipColors: Record<NewOutfitId, number> = {
    "outfit.dune-nomad": 0xaf693f,
    "outfit.tide-captain": 0x233e65,
    "outfit.clockwork-artisan": 0x354f54,
    "outfit.shrine-keeper": 0xa52d40,
    "outfit.frost-warden": 0x384d69,
    "outfit.mushroom-forager": 0x9b7347,
    "outfit.sky-courier": 0x236880,
    "outfit.obsidian-knight": 0x353448,
    "outfit.festival-dancer": 0xa8316b,
    "outfit.astral-scholar": 0x2e315d,
  };
  root.add(mesh(`${id}.waist-foundation`, new THREE.CylinderGeometry(0.49, 0.53, 0.52, 20),
    cloth(hipColors[id]), [0, 2.24, 0], [1, 1, 0.8]));

  switch (id) {
    case "outfit.dune-nomad": {
      vest(0xc1884b);
      // A slanted, one-piece desert poncho with a long left fringe.
      panel(chest, "asymmetric-poncho", [[-0.46, 0.46], [0.48, 0.42], [0.8, -0.02], [0.4, -0.35], [-0.7, -0.86], [-0.84, -0.11]], 0xe3c38a, 0.43);
      panel(chest, "poncho-back", [[-0.51, 0.45], [0.5, 0.45], [0.77, -0.38], [-0.7, -0.75]], 0x997444, -0.4);
      for (let n = 0; n < 7; n++) {
        const fringe = box(chest, `fringe.${n}`, [0.045, 0.2, 0.05], 0x654131, [-0.68 + n * 0.14, -0.86 + n * 0.065, 0.46]);
        fringe.rotation.z = -0.2;
      }
      const wrap = ring(chest, "neck-wrap", 0.3, 0.095, 0x369296, [0, 0.49, 0]);
      wrap.rotation.x = Math.PI / 2;
      panel(root, "wrapped-skirt", [[-0.48, 2.46], [0.48, 2.46], [0.56, 1.72], [-0.25, 1.43], [-0.53, 1.74]], 0xaf693f, 0.3);
      belt(0x6a4334);
      gem(root, "turquoise-knot", 0.12, 0x42cac1, [-0.28, 2.43, 0.4]);
      break;
    }
    case "outfit.tide-captain": {
      vest(0x233e65);
      for (const s of [-1, 1]) {
        panel(chest, `lapel.${s}`, [[s * 0.05, 0.3], [s * 0.43, 0.44], [s * 0.27, -0.23]], 0xf0e3bd, 0.45);
        box(chest, `epaulette.${s}`, [0.33, 0.12, 0.53], 0xdca951, [s * 0.6, 0.4, 0]);
        for (let n = 0; n < 3; n++) gem(chest, `button.${s}.${n}`, 0.045, 0xe5c569, [s * 0.2, 0.04 - n * 0.22, 0.46]);
        panel(root, `split-coattail.${s}`, [[s * 0.03, 2.49], [s * 0.5, 2.49], [s * 0.62, 1.19], [s * 0.19, 1.05]], 0x233e65, -0.23);
        panel(root, `coat-front.${s}`, [[s * 0.03, 2.49], [s * 0.48, 2.49], [s * 0.58, 1.58], [s * 0.17, 1.49]], 0x233e65, 0.43);
        box(root, `front-gold-hem.${s}`, [0.32, 0.04, 0.04], 0xdca951, [s * 0.35, 1.59, 0.49]);
        box(root, `tail-braid.${s}`, [0.05, 1.02, 0.05], 0xdca951, [s * 0.48, 1.84, -0.18]);
      }
      box(chest, "officer-sash", [0.14, 1.1, 0.055], 0xa6383f, [0, -0.01, 0.51]).rotation.z = -0.48;
      belt(0x8d3d3b);
      break;
    }
    case "outfit.clockwork-artisan": {
      vest(0x354f54);
      panel(chest, "leather-bib", [[-0.27, 0.26], [0.27, 0.26], [0.41, -0.68], [-0.41, -0.68]], 0xb5753e, 0.44);
      panel(root, "asymmetric-apron", [[-0.41, 2.49], [0.41, 2.49], [0.52, 1.44], [0.07, 1.3], [-0.45, 1.58]], 0xb5753e, 0.37);
      for (const s of [-1, 1]) box(chest, `bib-strap.${s}`, [0.08, 0.48, 0.06], 0x74492c, [s * 0.27, 0.34, 0.39]).rotation.z = s * 0.25;
      const gear = ring(chest, "brass-drive", 0.19, 0.045, 0xe1b55e, [0.16, -0.08, 0.54]);
      for (let n = 0; n < 8; n++) {
        const a = n * Math.PI / 4;
        const tooth = box(chest, `gear-tooth.${n}`, [0.07, 0.09, 0.05], 0xe1b55e, [gear.position.x + Math.sin(a) * 0.22, gear.position.y + Math.cos(a) * 0.22, 0.54]);
        tooth.rotation.z = -a;
      }
      box(root, "tool-pocket", [0.43, 0.3, 0.11], 0x70442d, [-0.06, 1.91, 0.45]);
      box(root, "wrench-handle", [0.07, 0.45, 0.07], 0xa2b8bd, [0.49, 2.15, 0.09]);
      ring(root, "wrench-jaw", 0.09, 0.025, 0xa2b8bd, [0.49, 2.42, 0.09]);
      break;
    }
    case "outfit.shrine-keeper": {
      vest(0xf4ead7);
      panel(chest, "crossed-robe-left", [[-0.44, 0.44], [0.1, 0.37], [0.36, -0.58], [-0.41, -0.58]], 0xe8e2d2, 0.44);
      panel(chest, "scarlet-collar", [[-0.3, 0.43], [-0.22, 0.47], [0.27, -0.4], [0.2, -0.43]], 0xb72e45, 0.5);
      for (const s of [-1, 1]) {
        panel(root, `hakama.${s}`, [[s * 0.02, 2.48], [s * 0.46, 2.48], [s * 0.64, 1.2], [s * 0.08, 1.2]], 0xa52d40, 0.26);
        box(root, `pleat.${s}`, [0.035, 1.02, 0.04], 0xd05c64, [s * 0.3, 1.83, 0.31]);
        panel(chest, `shoulder-fold.${s}`, [[s * 0.37, 0.43], [s * 0.75, 0.22], [s * 0.65, -0.12], [s * 0.4, 0.02]], 0xf4ead7, 0.05);
      }
      belt(0xd6b35d);
      for (const s of [-1, 1]) panel(root, `obi-bow.${s}`, [[0, 2.45], [s * 0.41, 2.67], [s * 0.4, 2.25]], 0xb62f43, -0.44);
      gem(chest, "bell", 0.09, 0xd6b35d, [0, -0.06, 0.51]);
      break;
    }
    case "outfit.frost-warden": {
      vest(0x647c96);
      // Broad fur mantle and a heavy square quilted coat.
      for (let n = 0; n < 9; n++) {
        const a = n * Math.PI / 8;
        chest.add(mesh(`${id}.fur-tuft.${n}`, new THREE.IcosahedronGeometry(0.18, 1), cloth(0xe7ebde), [Math.cos(a) * 0.57, 0.28 + Math.sin(a) * 0.1, Math.sin(a) * 0.32], [1.3, 0.9, 1.1]));
      }
      panel(root, "quilted-coat-front", [[-0.49, 2.49], [0.49, 2.49], [0.64, 1.25], [-0.64, 1.25]], 0x647c96, 0.35);
      panel(root, "quilted-coat-back", [[-0.49, 2.49], [0.49, 2.49], [0.64, 1.25], [-0.64, 1.25]], 0x384d69, -0.37);
      for (let n = 0; n < 4; n++) box(root, `quilt-line.${n}`, [1.04 + n * 0.045, 0.035, 0.04], 0x9eafc3, [0, 2.29 - n * 0.27, 0.4]);
      for (let n = 0; n < 3; n++) box(chest, `antler-toggle.${n}`, [0.2, 0.06, 0.065], 0xe0ceb1, [0, 0.07 - n * 0.22, 0.47]);
      belt(0x413c3b, 1.03);
      break;
    }
    case "outfit.mushroom-forager": {
      vest(0x6c7c39);
      for (let n = 0; n < 7; n++) {
        const a = n * Math.PI * 2 / 7;
        chest.add(mesh(`${id}.leaf-mantle.${n}`, new THREE.SphereGeometry(0.3, 10, 8), cloth(n % 2 ? 0x718d48 : 0x91a858), [Math.cos(a) * 0.43, 0.23, Math.sin(a) * 0.32], [1, 0.35, 1.3]));
      }
      panel(root, "split-overalls", [[-0.43, 2.5], [0.43, 2.5], [0.48, 1.65], [0, 1.87], [-0.48, 1.65]], 0x9b7347, 0.32);
      for (const s of [-1, 1]) box(chest, `overall-strap.${s}`, [0.09, 0.82, 0.05], 0x9b7347, [s * 0.27, 0.05, 0.43]);
      for (let n = 0; n < 3; n++) {
        const x = -0.48 + n * 0.13;
        root.add(mesh(`${id}.mushroom-stem.${n}`, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), cloth(0xf0dcb8), [x, 2.29, 0.47]));
        root.add(mesh(`${id}.mushroom-cap.${n}`, new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cloth(0xc35743), [x, 2.4, 0.47], [1.2, 0.7, 1]));
      }
      box(root, "gathering-pouch", [0.35, 0.42, 0.26], 0x8a5b36, [-0.5, 2.07, 0.23]);
      break;
    }
    case "outfit.sky-courier": {
      vest(0x28a9c0, 0.9);
      panel(chest, "white-flight-yoke", [[-0.48, 0.4], [0.48, 0.4], [0.38, 0.03], [0, 0.18], [-0.38, 0.03]], 0xe7f3ed, 0.43);
      ring(chest, "wind-scarf", 0.29, 0.07, 0xf2b44d, [0, 0.46, 0]).rotation.x = Math.PI / 2;
      panel(chest, "streaming-scarf", [[-0.14, 0.43], [-0.29, 0.4], [-0.93, -0.23], [-0.7, -0.32], [-0.17, 0.12]], 0xf2b44d, -0.36);
      for (const s of [-1, 1]) {
        panel(root, `short-flight-flap.${s}`, [[s * 0.04, 2.49], [s * 0.46, 2.49], [s * 0.55, 2.04], [s * 0.12, 2.15]], 0x236880, 0.26);
        box(chest, `harness.${s}`, [0.07, 0.88, 0.055], 0x493e35, [s * 0.22, -0.05, 0.48]).rotation.z = s * 0.25;
      }
      belt(0xf2b44d);
      box(root, "dispatch-case", [0.24, 0.32, 0.15], 0xe4e2d3, [0.49, 2.19, 0.11]);
      gem(chest, "wing-pin", 0.09, 0xe7f3ed, [0, 0.08, 0.53]);
      break;
    }
    case "outfit.obsidian-knight": {
      chest.add(mesh(`${id}.faceted-cuirass`, new THREE.CylinderGeometry(0.6, 0.47, 1.16, 8), metal(0x353448), [0, -0.1, 0], [1, 1, 0.87]));
      panel(chest, "crystal-keel", [[0, 0.44], [0.17, 0.08], [0.08, -0.46], [0, -0.64], [-0.08, -0.46], [-0.17, 0.08]], 0x9e71cd, 0.49);
      for (const s of [-1, 1]) {
        chest.add(mesh(`${id}.angular-pauldron.${s}`, new THREE.OctahedronGeometry(0.3), metal(0x4b405d), [s * 0.56, 0.33, 0], [1.35, 0.8, 1.05]));
        for (let n = 0; n < 3; n++) {
          const x = s * (0.3 + n * 0.035);
          panel(root, `overlapping-tasset.${s}.${n}`, [[x - 0.2, 2.46 - n * 0.22], [x + 0.2, 2.46 - n * 0.22], [x + 0.18, 2.16 - n * 0.22], [x, 2.07 - n * 0.22], [x - 0.18, 2.16 - n * 0.22]], n % 2 ? 0x55425c : 0x353448, 0.35 + n * 0.035);
        }
      }
      belt(0x8e628e);
      break;
    }
    case "outfit.festival-dancer": {
      vest(0xa8316b, 0.94);
      panel(chest, "sweetheart-bodice", [[-0.42, 0.21], [-0.2, 0.33], [0, 0.15], [0.2, 0.33], [0.42, 0.21], [0.29, -0.53], [-0.29, -0.53]], 0xd74b84, 0.45);
      for (let n = 0; n < 10; n++) {
        const petal = new THREE.Group();
        petal.name = `${id}.petal-mount.${n}`;
        petal.rotation.y = n * Math.PI / 5;
        panel(petal, `flared-petal.${n}`, [[-0.15, 2.47], [0.15, 2.47], [0.3, 1.63], [0, 1.38], [-0.3, 1.63]], n % 2 ? 0xf1a04c : 0xd74b84, 0.48);
        root.add(petal);
      }
      for (let n = 0; n < 7; n++) {
        const x = -0.39 + n * 0.13;
        gem(chest, `coin-necklace.${n}`, 0.045, 0xffd46d, [x, 0.3 - Math.sin(n / 6 * Math.PI) * 0.22, 0.51]);
      }
      belt(0xffd46d);
      for (const s of [-1, 1]) panel(chest, `ribbon.${s}`, [[s * 0.41, 0.35], [s * 0.58, 0.42], [s * 0.77, -0.34], [s * 0.57, -0.18]], 0xf1a04c, -0.1);
      break;
    }
    case "outfit.astral-scholar": {
      vest(0x2e315d);
      panel(root, "ivory-inner-tabard", [[-0.27, 2.49], [0.27, 2.49], [0.32, 1.06], [0, 0.87], [-0.32, 1.06]], 0xc7c3dc, 0.38);
      // Open high collar, separate long stoles, a copper orbital chest instrument.
      for (const s of [-1, 1]) {
        panel(chest, `standing-collar.${s}`, [[s * 0.13, 0.36], [s * 0.31, 0.83], [s * 0.48, 0.65], [s * 0.44, 0.25]], 0x8c89b6, -0.2);
        panel(root, `long-stole.${s}`, [[s * 0.14, 2.5], [s * 0.39, 2.5], [s * 0.5, 0.89], [s * 0.3, 0.65], [s * 0.18, 0.91]], 0x5b5488, 0.29);
        for (let n = 0; n < 4; n++) gem(root, `stole-star.${s}.${n}`, 0.05, 0xd8c78e, [s * (0.29 + n * 0.025), 2.13 - n * 0.34, 0.35]);
      }
      panel(root, "scholar-rear-robe", [[-0.47, 2.49], [0.47, 2.49], [0.67, 0.89], [0, 0.65], [-0.67, 0.89]], 0x2e315d, -0.38);
      const orbit = ring(chest, "astrolabe-outer", 0.22, 0.022, 0xd7ad6c, [0, -0.03, 0.53]);
      orbit.rotation.z = 0.38;
      ring(chest, "astrolabe-inner", 0.14, 0.018, 0xd7ad6c, [0, -0.03, 0.54]).rotation.y = 0.8;
      gem(chest, "astrolabe-core", 0.08, 0xa9e5ef, [0, -0.03, 0.55]);
      belt(0xb39467);
      break;
    }
  }
  root.userData.design = id;
  chest.userData.design = id;
  for (const group of [root, chest]) group.traverse((node) => {
    node.userData.original = true;
    node.userData.procedural = true;
    node.userData.source = "project-original-procedural";
  });
}
