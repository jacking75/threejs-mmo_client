import * as THREE from "three";
import { FIELD_SIZE, TERRAIN_SEGMENTS, pathDistance, terrainVertexHeight } from "../game/terrain";

export function createTerrain(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const meadow = new THREE.Color(0x71934c);
  const lightGrass = new THREE.Color(0x91aa59);
  const forest = new THREE.Color(0x4c794b);
  const earth = new THREE.Color(0xb4a17b);
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index), z = positions.getZ(index);
    const y = terrainVertexHeight(x, z);
    positions.setY(index, y);
    const patch = (Math.sin(x * 0.17 + Math.sin(z * 0.09) * 2) * Math.cos(z * 0.13) + 1) / 2;
    color.copy(meadow).lerp(lightGrass, patch * 0.6).lerp(forest, Math.min(y / 25, 0.35));
    const distance = pathDistance(x, z);
    const edge = 2.1 + 0.22 * Math.sin(x * 0.9 + z * 0.7);
    const path = 1 - THREE.MathUtils.smoothstep(distance, edge - 0.65, edge + 0.8);
    color.lerp(earth, path * 0.94);
    color.multiplyScalar(0.97 + Math.sin(x * 1.7 + z * 2.3) * 0.025);
    color.toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.name = "field.ground";
  ground.receiveShadow = true;
  return ground;
}

/** Distant silhouette hides the square map edge; outside the playable field. */
export function createDistantRidges(): THREE.Group {
  const root = new THREE.Group();
  root.name = "field.distant-ridges";
  for (let layer = 0; layer < 2; layer += 1) {
    const vertices: number[] = [];
    const indices: number[] = [];
    const count = 96;
    for (let i = 0; i <= count; i += 1) {
      const angle = i / count * Math.PI * 2;
      const radius = 170 + layer * 40 + 9 * Math.sin(angle * 7);
      const height = 13 + layer * 9 + 7 * Math.sin(angle * 5 + layer) + 5 * Math.cos(angle * 11);
      vertices.push(Math.cos(angle) * radius, -8, Math.sin(angle) * radius);
      vertices.push(Math.cos(angle) * (radius + 55), height, Math.sin(angle) * (radius + 55));
      if (i < count) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: layer ? 0x8ba7a5 : 0x678e7c, roughness: 1, flatShading: true, side: THREE.DoubleSide,
    })));
  }
  return root;
}
