import * as THREE from "three";
import { createWaystone } from "../assets/field/createFieldProps";
import type { FieldCollider } from "../game/collision";
import { FIELD_SIZE, getTerrainHeight, northPathX, eastPathZ } from "../game/terrain";
import { createTerrain, createDistantRidges } from "./fieldTerrain";
import { addFieldVegetation } from "./fieldVegetation";
import type { CameraObstacle } from "./ThirdPersonCamera";

export { FIELD_SIZE } from "../game/terrain";

export interface FieldRuntime {
  readonly scene: THREE.Scene;
  readonly playerTarget: THREE.Group;
  readonly colliders: readonly FieldCollider[];
  readonly cameraObstacles: readonly CameraObstacle[];
  dispose(): void;
}

export function createField(): FieldRuntime {
  const scene = new THREE.Scene();
  scene.name = "field.scene";
  scene.background = new THREE.Color(0xb3d4dc);
  scene.fog = new THREE.Fog(0xb3d4dc, 65, 250);
  scene.userData.fieldSize = FIELD_SIZE;

  const world = new THREE.Group();
  world.name = "field.world";
  scene.add(world);

  world.add(createTerrain(), createDistantRidges());
  const { colliders, cameraObstacles } = addFieldVegetation(world);
  // Trail-side markers sit on the same surface as the player, leaving paths clear.
  for (const [index, distance] of [-76, -24, 24, 76].entries()) {
    const positions = [[northPathX(distance) + 4, distance], [distance, eastPathZ(distance) - 4]];
    for (const [branch, [x, z]] of positions.entries()) {
      const marker = createWaystone();
      marker.name = `field.waystone.${index * 2 + branch + 1}`;
      marker.position.set(x, getTerrainHeight(x, z) - 0.05, z);
      marker.rotation.y = branch ? Math.PI / 2 : 0;
      marker.traverse((child) => {
        if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      world.add(marker);
      colliders.push({ type: "circle", x, z, radius: 0.57 });
    }
  }

  const playerTarget = new THREE.Group();
  playerTarget.name = "player-root";
  playerTarget.position.y = getTerrainHeight(0, 0);
  world.add(playerTarget);

  const playerFill = new THREE.PointLight(0xc9ecff, 0.72, 9, 1.7);
  playerFill.name = "field.player-fill";
  playerFill.position.set(-1.8, 4.6, -2.2);
  playerTarget.add(playerFill);

  const hemisphere = new THREE.HemisphereLight(0xe4f7ff, 0x4e603d, 1.85);
  hemisphere.name = "field.hemisphere-light";
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffedc7, 2.6);
  sun.name = "field.sun";
  sun.position.set(-18, 28, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  const sunTarget = new THREE.Object3D();
  sunTarget.name = "field.sun-target";
  sun.target = sunTarget;
  playerTarget.add(sun, sunTarget);

  return {
    scene,
    playerTarget,
    colliders,
    cameraObstacles,
    dispose() {
      disposeObject(scene);
    },
  };
}

function disposeObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child instanceof THREE.InstancedMesh) child.dispose();
    geometries.add(child.geometry);
    (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  object.traverse((child) => { if (child instanceof THREE.Light && child.shadow) child.shadow.dispose(); });
}
