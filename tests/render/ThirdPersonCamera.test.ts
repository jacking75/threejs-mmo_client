import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
  ThirdPersonCamera,
} from "../../src/render/ThirdPersonCamera";

describe("ThirdPersonCamera", () => {
  it("keeps the intended orbit direction while following through camera obstructions", () => {
    const target = new THREE.Object3D();
    const clearCamera = new THREE.PerspectiveCamera(), blockedCamera = new THREE.PerspectiveCamera();
    const clear = new ThirdPersonCamera(clearCamera, target);
    const obstacles = [{ x: -1, y: 2.4, z: -4, radius: 2.5 }];
    const blocked = new ThirdPersonCamera(blockedCamera, target, 1.35, undefined, obstacles);
    const lookAt = new THREE.Vector3();
    let wasShortened = false;
    for (let frame = 0; frame < 100; frame += 1) {
      target.position.set(Math.sin(frame * 0.05) * 2, 0, frame * 0.04);
      clear.update(1 / 30);
      blocked.update(1 / 30);
      lookAt.copy(target.position).y += 1.35;
      const freeDirection = clearCamera.position.clone().sub(lookAt);
      const blockedDirection = blockedCamera.position.clone().sub(lookAt);
      if (blockedDirection.length() < freeDirection.length() - 1) wasShortened = true;
      expect(freeDirection.normalize().dot(blockedDirection.normalize())).toBeCloseTo(1, 6);
    }
    expect(wasShortened).toBe(true);
  });

  it("moves in front of an obstructing tree and restores the orbit after it clears", () => {
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const obstacles: { x: number; y: number; z: number; radius: number }[] = [];
    const controller = new ThirdPersonCamera(camera, target, 1.25, () => 0, obstacles);
    controller.update(0);
    const lookAt = new THREE.Vector3(0, 1.25, 0);
    const center = lookAt.clone().lerp(camera.position, 0.6);
    obstacles.push({ x: center.x, y: center.y, z: center.z, radius: 1.1 });
    controller.update(1 / 60);
    expect(camera.position.distanceTo(lookAt)).toBeLessThan(4.5);
    obstacles.length = 0;
    controller.update(1);
    expect(camera.position.distanceTo(lookAt)).toBeCloseTo(DEFAULT_CAMERA_DISTANCE, 2);
  });

  it("keeps the camera and its sight line above rising terrain during low orbits and follow", () => {
    const height = (x: number, z: number): number => 0.55 * Math.hypot(x, z);
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, target, 1.25, height);
    controller.rotate(0, -1000);
    controller.zoom(100);
    for (let frame = 0; frame < 60; frame += 1) {
      target.position.set(frame * 0.15, height(frame * 0.15, 0), 0);
      controller.rotate(5, 0);
      controller.update(1 / 60);
      const lookAt = target.position.clone().add(new THREE.Vector3(0, 1.25, 0));
      for (let step = 1; step <= 16; step += 1) {
        const sample = lookAt.clone().lerp(camera.position, step / 16);
        expect(sample.y).toBeGreaterThanOrEqual(height(sample.x, sample.z) + 0.64999);
      }
    }
  });

  it("keeps a stable orbit distance and looks at the target", () => {
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, target);

    controller.update(0);

    const lookAt = new THREE.Vector3(0, 1.35, 0);
    expect(camera.position.distanceTo(lookAt)).toBeCloseTo(DEFAULT_CAMERA_DISTANCE, 5);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const expectedForward = lookAt.clone().sub(camera.position).normalize();
    expect(forward.dot(expectedForward)).toBeCloseTo(1, 5);
  });

  it("orbits and follows a moved target without changing its contract", () => {
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, target);
    controller.update(0);
    const initialPosition = camera.position.clone();

    controller.rotate(140, -35);
    controller.update(1);
    expect(camera.position.distanceTo(initialPosition)).toBeGreaterThan(1);

    target.position.set(5, 0, -3);
    controller.update(1);
    const lookAt = new THREE.Vector3(5, 1.35, -3);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    expect(forward.dot(lookAt.sub(camera.position).normalize())).toBeCloseTo(1, 5);
  });

  it("updates the perspective aspect ratio on resize", () => {
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, new THREE.Object3D());
    controller.resize(1600, 900);
    expect(camera.aspect).toBeCloseTo(16 / 9, 5);
  });

  it("clamps MMO-style zoom to the documented near and far distances", () => {
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, target);

    controller.zoom(-100);
    controller.update(0);
    expect(camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0))).toBeCloseTo(MIN_CAMERA_DISTANCE, 5);

    controller.zoom(100);
    controller.update(2);
    expect(camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0))).toBeCloseTo(MAX_CAMERA_DISTANCE, 5);
  });
});
