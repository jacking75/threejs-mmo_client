import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FIELD_SIZE, createField } from "../../src/render/createField";
import { getTerrainHeight, northPathX, eastPathZ } from "../../src/game/terrain";
import { intersectsAny } from "../../src/game/collision";

describe("createField", () => {
  it("builds the documented field, atmosphere, props, and player root", () => {
    const field = createField();
    const ground = field.scene.getObjectByName("field.ground") as THREE.Mesh | undefined;

    expect(field.scene.userData.fieldSize).toBe(FIELD_SIZE);
    expect(FIELD_SIZE).toBe(240);
    expect(field.scene.fog).toBeInstanceOf(THREE.Fog);
    expect(ground?.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(field.scene.getObjectByName("field.hemisphere-light")).toBeInstanceOf(THREE.HemisphereLight);
    expect(field.scene.getObjectByName("field.sun")).toBeInstanceOf(THREE.DirectionalLight);
    expect(field.scene.getObjectByName("field.player-fill")).toBeInstanceOf(THREE.PointLight);
    expect(field.scene.getObjectByName("player-root")).toBe(field.playerTarget);
    expect(field.scene.getObjectByName("field.sun")?.parent).toBe(field.playerTarget);
    expect(field.scene.getObjectByName("field.sun-target")?.parent).toBe(field.playerTarget);
    expect(field.colliders.some(({ type }) => type === "circle")).toBe(true);
    expect(field.colliders.some(({ type }) => type === "aabb")).toBe(true);
    expect(field.colliders.some((collider) => {
      const x = collider.type === "circle" ? collider.x : (collider.minX + collider.maxX) / 2;
      const z = collider.type === "circle" ? collider.z : (collider.minZ + collider.maxZ) / 2;
      return Math.hypot(x, z) > 80;
    })).toBe(true);
    expect(field.scene.getObjectByName("field.fantasy-tree.tree.trunk")).toBeInstanceOf(THREE.InstancedMesh);
    expect(field.scene.getObjectByName("field.rock-cluster.rock.1")).toBeInstanceOf(THREE.InstancedMesh);
    expect(field.scene.getObjectByName("field.waystone.1")).toBeDefined();

    field.dispose();
  });

  it("grounds the player on the rendered triangles across slopes and keeps trails passable", () => {
    const field = createField();
    const ground = field.scene.getObjectByName("field.ground") as THREE.Mesh;
    field.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const heights: number[] = [];
    for (const [x, z] of [[0, 0], [-31.73, 35.24], [43.28, -30.69], [12.12, 52.67], [-64.8, -55.3], [119.5, 119.5]]) {
      ray.set(new THREE.Vector3(x, 40, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(ground)[0];
      if (!hit) throw new Error("Terrain ray missed the playable surface");
      expect(getTerrainHeight(x, z)).toBeCloseTo(hit.point.y, 4);
      heights.push(hit.point.y);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(12);
    expect(field.playerTarget.position.y).toBe(getTerrainHeight(0, 0));
    for (let distance = -115; distance <= 115; distance += 0.5) {
      expect(intersectsAny({ x: northPathX(distance), z: distance }, 0.48, field.colliders)).toBe(false);
      expect(intersectsAny({ x: distance, z: eastPathZ(distance) }, 0.48, field.colliders)).toBe(false);
    }
    field.dispose();
  });

  it("batches dense vegetation and releases instance buffers when leaving the field", () => {
    const field = createField();
    const world = field.scene.getObjectByName("field.world");
    if (!world) throw new Error("Missing field world");
    expect(world.userData.treeCount).toBeGreaterThan(250);
    expect(world.userData.groundCoverCount).toBeGreaterThan(15000);
    let batches = 0, released = 0;
    world.traverse((node) => {
      if (!(node instanceof THREE.InstancedMesh)) return;
      batches += 1;
      node.addEventListener("dispose", () => { released += 1; });
    });
    expect(batches).toBeLessThan(30);
    field.dispose();
    expect(released).toBe(batches);
  });
});
