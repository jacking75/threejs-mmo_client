import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createFantasyTree, createRockCluster } from "../assets/field/createFieldProps";
import { getTerrainHeight, pathDistance } from "../game/terrain";
import type { FieldCollider } from "../game/collision";
import type { CameraObstacle } from "./ThirdPersonCamera";

export type FieldPlacement = readonly [x: number, z: number, rotation: number, scale: number];

// Authored grove centers leave the two trails and the spawn clearing open.
const GROVES = [
  [-17, 15, 9], [20, 24, 12], [-27, -18, 13], [28, -22, 11],
  [-42, 43, 17], [52, 12, 18], [-61, -49, 22], [51, -58, 22],
  [-80, 14, 24], [81, 66, 24], [-67, 85, 23], [19, 91, 19],
  [-104, -87, 13], [94, -93, 16], [103, 0, 12], [-106, 69, 12],
] as const;

function noise(index: number, salt = 0): number {
  const n = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function treePlacements(): FieldPlacement[] {
  const result: FieldPlacement[] = [];
  GROVES.forEach(([cx, cz, radius], grove) => {
    for (let i = 0; i < 22; i += 1) {
      const id = grove * 22 + i;
      const angle = i * 2.399963 + grove;
      const distance = Math.sqrt((i + 0.5) / 22) * radius;
      const x = cx + Math.cos(angle) * distance, z = cz + Math.sin(angle) * distance;
      if (pathDistance(x, z) < 5 || Math.hypot(x, z) < 11) continue;
      result.push([x, z, noise(id, 3) * Math.PI * 2, 1.15 + noise(id, 4) * 1.05]);
    }
  });
  return result;
}

/** Instance each named part once for all placements. No per-plant scene objects/materials. */
function instanceProps(parent: THREE.Group, template: THREE.Group, placements: readonly FieldPlacement[], shadows: boolean): void {
  template.updateMatrixWorld(true);
  const transform = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  template.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const batch = new THREE.InstancedMesh(child.geometry, child.material, placements.length);
    batch.name = `${template.name}.${child.name}`;
    placements.forEach(([x, z, angle, scale], index) => {
      transform.position.set(x, getTerrainHeight(x, z) - 0.035, z);
      transform.rotation.set(0, angle, 0);
      transform.scale.setScalar(scale);
      transform.updateMatrix();
      matrix.multiplyMatrices(transform.matrix, child.matrixWorld);
      batch.setMatrixAt(index, matrix);
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.castShadow = shadows;
    batch.receiveShadow = true;
    batch.computeBoundingSphere();
    parent.add(batch);
  });
}

function createPine(): THREE.Group {
  const root = new THREE.Group();
  root.name = "field.pine";
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x655141 }));
  trunk.position.y = 1.6;
  trunk.name = "trunk";
  root.add(trunk);
  for (let i = 0; i < 3; i += 1) {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.35 - i * 0.28, 2.6 - i * 0.3, 7),
      new THREE.MeshStandardMaterial({ color: [0x356952, 0x457b58, 0x5a8b60][i], roughness: 1, flatShading: true }));
    crown.position.y = 2.2 + i * 0.95;
    crown.name = `crown.${i}`;
    root.add(crown);
  }
  return root;
}

function createTuft(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i += 1) {
    const geometry = new THREE.BufferGeometry();
    const angle = i * 2.399963;
    const x = Math.cos(angle) * 0.14, z = Math.sin(angle) * 0.14;
    const height = 0.28 + i * 0.055;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      x - 0.055, 0, z, x + 0.055, 0, z, x + Math.cos(angle) * 0.14, height, z + 0.08,
    ], 3));
    geometry.computeVertexNormals();
    parts.push(geometry);
  }
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function scatterGroundCover(parent: THREE.Group): void {
  const grass: FieldPlacement[] = [], flowers: FieldPlacement[] = [], shrubs: FieldPlacement[] = [];
  // A fixed scatter pattern, with denser patches near trails and grove edges.
  for (let i = 0; i < 30000; i += 1) {
    const x = (noise(i, 8) - 0.5) * 234, z = (noise(i, 9) - 0.5) * 234;
    const distance = pathDistance(x, z);
    if (distance < 2.8 || Math.hypot(x, z) < 4.5) continue;
    const patch = Math.sin(x * 0.18 + z * 0.07) * Math.cos(z * 0.21);
    if (patch < -0.36 && distance > 8) continue;
    const placement: FieldPlacement = [x, z, noise(i, 10) * Math.PI * 2, 0.65 + noise(i, 11) * 0.85];
    grass.push(placement);
    if (patch > 0.25 && i % 3 === 0) flowers.push(placement);
    if (i % 41 === 0 && distance > 4.5) shrubs.push([x, z, placement[2], 0.55 + noise(i, 12) * 0.65]);
  }
  const tuft = new THREE.Group();
  tuft.name = "field.grass";
  const blades = new THREE.Mesh(createTuft(), new THREE.MeshStandardMaterial({ color: 0x6d9148, roughness: 1, side: THREE.DoubleSide }));
  blades.name = "blades";
  tuft.add(blades);
  instanceProps(parent, tuft, grass, false);

  const bush = new THREE.Group();
  bush.name = "field.shrub";
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), new THREE.MeshStandardMaterial({ color: 0x527e46, roughness: 1, flatShading: true }));
  leaves.name = "leaves";
  leaves.position.y = 0.38;
  leaves.scale.set(1.1, 0.75, 0.85);
  bush.add(leaves);
  instanceProps(parent, bush, shrubs, true);

  for (let type = 0; type < 2; type += 1) {
    const flower = new THREE.Group();
    flower.name = type ? "field.gold-flowers" : "field.lavender";
    const blossom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({
      color: type ? 0xffe6a0 : 0xb8a1d7, roughness: 1,
    }));
    blossom.name = "blossom";
    blossom.position.y = 0.4;
    blossom.scale.set(type ? 1 : 0.7, type ? 0.5 : 1.8, type ? 1 : 0.7);
    flower.add(blossom);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.021, 0.38, 3), new THREE.MeshStandardMaterial({ color: 0x547a40 }));
    stem.name = "stem";
    stem.position.y = 0.19;
    flower.add(stem);
    instanceProps(parent, flower, flowers.filter((_, i) => i % 2 === type), false);
  }
  parent.userData.groundCoverCount = grass.length + flowers.length + shrubs.length;
}

export function addFieldVegetation(parent: THREE.Group): { colliders: FieldCollider[]; cameraObstacles: CameraObstacle[] } {
  const trees = treePlacements();
  const broadleaf = createFantasyTree();
  broadleaf.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshToonMaterial)) return;
    const previous = child.material;
    child.material = new THREE.MeshStandardMaterial({ color: previous.color, roughness: 1, flatShading: true });
    previous.dispose();
  });
  instanceProps(parent, broadleaf, trees.filter((_, i) => i % 4 !== 0), true);
  instanceProps(parent, createPine(), trees.filter((_, i) => i % 4 === 0), true);
  const rocks: FieldPlacement[] = [];
  for (let i = 0; i < 180; i += 1) {
    const x = (noise(i, 20) - 0.5) * 226, z = (noise(i, 21) - 0.5) * 226;
    if (pathDistance(x, z) < 3.7 || Math.hypot(x, z) < 8) continue;
    rocks.push([x, z, noise(i, 22) * Math.PI * 2, 1.3 + noise(i, 23) * 2.1]);
  }
  instanceProps(parent, createRockCluster(), rocks, true);
  scatterGroundCover(parent);
  parent.userData.treeCount = trees.length;
  const colliders: FieldCollider[] = trees.map(([x, z, , scale]) => ({ type: "circle", x, z, radius: 0.43 * scale }));
  // Conservative bounds cover the rotated three-rock cluster.
  colliders.push(...rocks.map(([x, z, , scale]) => ({
    type: "aabb" as const, minX: x - 0.8 * scale, maxX: x + 0.8 * scale,
    minZ: z - 0.8 * scale, maxZ: z + 0.8 * scale,
  })));
  const cameraObstacles: CameraObstacle[] = trees.flatMap(([x, z, , scale]) => [
    { x, y: getTerrainHeight(x, z) + 3.3 * scale, z, radius: 1.55 * scale },
    { x, y: getTerrainHeight(x, z) + 1.3 * scale, z, radius: 0.55 * scale },
  ]);
  cameraObstacles.push(...rocks.map(([x, z, , scale]) => ({ x, y: getTerrainHeight(x, z) + 0.3 * scale, z, radius: 0.6 * scale })));
  return { colliders, cameraObstacles };
}
