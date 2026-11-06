import * as THREE from "three";
import { updateBowDraw } from "../assets/equipment/createRangedWeapons";
import type { AvatarGroup } from "../assets/types";
import type { WeaponKind } from "../domain/catalog";

/** Hand targets are in the canonical, unscaled avatar space (+Z forward). */
export class CombatAnimator {
  private readonly rest = new Map<THREE.Object3D, THREE.Quaternion>();
  private readonly weaponRest = new WeakMap<THREE.Object3D, THREE.Quaternion>();
  private readonly point = new THREE.Vector3();
  private readonly end = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly from = new THREE.Vector3();
  private readonly to = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private readonly parentRotation = new THREE.Quaternion();

  public constructor(private readonly avatar: AvatarGroup) {
    for (const name of ["chest", "head", "arm.L.upper", "arm.L.lower", "hand.L", "arm.R.upper", "arm.R.lower", "hand.R", "leg.L.upper", "leg.R.upper"]) {
      const node = avatar.userData.sculptRuntime.nodes[name];
      if (node) this.rest.set(node, node.quaternion.clone());
    }
  }

  public reset(): void {
    for (const [node, quaternion] of this.rest) node.quaternion.copy(quaternion);
    for (const socket of Object.values(this.avatar.userData.sculptRuntime.sockets)) {
      for (const visual of socket.children) {
        const quaternion = this.weaponRest.get(visual);
        if (quaternion) visual.quaternion.copy(quaternion);
        if (visual.getObjectByName("bow.nock")) updateBowDraw(visual as THREE.Group, 0);
      }
    }
  }

  public update(kind: WeaponKind, progress: number): void {
    this.reset();
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const recovery = smooth(0.72, 1, p);
    const weight = smooth(0, 0.18, p) * (1 - recovery);
    const nodes = this.avatar.userData.sculptRuntime.nodes;
    const chest = nodes.chest;
    const strike = smooth(0.3, 0.52, p);
    chest.rotateY((kind === "sword" ? THREE.MathUtils.lerp(-0.3, 0.36, strike) : kind === "bow" ? -0.18 : -0.12) * weight);
    chest.rotateX((kind === "sword" ? 0.08 : -0.04) * weight);
    nodes["leg.L.upper"].rotateX(-0.1 * weight);
    nodes["leg.R.upper"].rotateX(0.12 * weight);

    this.avatar.updateWorldMatrix(true, true);
    const rightIdle = this.avatar.worldToLocal(nodes["hand.R"].getWorldPosition(new THREE.Vector3()));
    const leftIdle = this.avatar.worldToLocal(nodes["hand.L"].getWorldPosition(new THREE.Vector3()));
    let right: THREE.Vector3;
    let left: THREE.Vector3;
    let direction: THREE.Vector3;
    if (kind === "sword") {
      right = new THREE.Vector3(-0.95, 3.65, 0.25).lerp(new THREE.Vector3(0.5, 2.8, 1.12), strike);
      left = new THREE.Vector3(0.75, 2.75, 0.25);
      direction = new THREE.Vector3(-0.25, 0.9, -0.35).lerp(new THREE.Vector3(0.85, 0.1, 0.75), strike).normalize();
    } else if (kind === "staff") {
      const release = smooth(0.5, 0.65, p);
      right = new THREE.Vector3(-0.85, 2.7, 0.45 + release * 0.25);
      left = new THREE.Vector3(0.25, 3.1, 0.95 + release * 0.2);
      direction = new THREE.Vector3(0.05, 1, 0.15 + release * 0.35).normalize();
    } else {
      const draw = smooth(0.18, 0.55, p);
      const release = smooth(0.6, 0.68, p);
      left = new THREE.Vector3(0.2, 3.25, 1.15);
      right = new THREE.Vector3(0.18 - draw * 0.65, 3.25, 0.98 - draw * 0.93 + release * 0.2);
      direction = new THREE.Vector3(0, 1, 0);
    }
    rightIdle.lerp(right, weight);
    leftIdle.lerp(left, weight);
    this.solveArm("L", leftIdle);
    this.solveArm("R", rightIdle);
    const socket = this.avatar.userData.sculptRuntime.sockets[kind === "bow" ? "hand.L" : "hand.R"];
    const visual = socket.children.find((child) => typeof child.userData.itemId === "string" && child.userData.itemId.startsWith("weapon."));
    if (visual) {
      if (!this.weaponRest.has(visual)) this.weaponRest.set(visual, visual.quaternion.clone());
      this.avatar.getWorldQuaternion(this.rotation);
      const aim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      this.rotation.multiply(aim);
      visual.parent?.getWorldQuaternion(this.parentRotation).invert();
      const target = this.parentRotation.multiply(this.rotation);
      visual.quaternion.slerp(target, weight);
      if (kind === "bow") {
        const draw = smooth(0.18, 0.55, p) * (1 - smooth(0.6, 0.68, p));
        updateBowDraw(visual as THREE.Group, draw, p < 0.62 || p > 0.94);
        const nock = visual.getObjectByName("bow.nock");
        if (nock && p < 0.64) {
          this.avatar.updateWorldMatrix(true, true);
          const grip = this.avatar.worldToLocal(nock.getWorldPosition(new THREE.Vector3()));
          this.solveArm("R", rightIdle.lerp(grip, weight));
        }
      }
    }
  }

  private solveArm(side: "L" | "R", target: THREE.Vector3): void {
    const nodes = this.avatar.userData.sculptRuntime.nodes;
    const hand = nodes[`hand.${side}`];
    this.avatar.updateWorldMatrix(true, true);
    this.point.copy(target);
    this.avatar.localToWorld(this.point);
    const upper = nodes[`arm.${side}.upper`];
    const lower = nodes[`arm.${side}.lower`];
    const shoulder = upper.getWorldPosition(new THREE.Vector3());
    const elbow = lower.getWorldPosition(new THREE.Vector3());
    const wrist = hand.getWorldPosition(new THREE.Vector3());
    const upperLength = shoulder.distanceTo(elbow);
    const lowerLength = elbow.distanceTo(wrist);
    const direction = this.point.clone().sub(shoulder);
    const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(upperLength - lowerLength) + 0.001, upperLength + lowerLength - 0.001);
    direction.normalize();
    const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    // Keep the elbow outside the torso, with a stable bend plane through the swing.
    this.avatar.getWorldQuaternion(this.rotation);
    const pole = new THREE.Vector3(side === "L" ? 1 : -1, -0.4, 0.3).applyQuaternion(this.rotation);
    pole.addScaledVector(direction, -pole.dot(direction)).normalize();
    const elbowTarget = shoulder.clone().addScaledVector(direction, along).addScaledVector(pole, height);
    const wristTarget = shoulder.clone().addScaledVector(direction, distance);
    this.aimJoint(upper, lower, elbowTarget);
    this.aimJoint(lower, hand, wristTarget);
  }

  private aimJoint(joint: THREE.Object3D, endpoint: THREE.Object3D, target: THREE.Vector3): void {
    joint.getWorldPosition(this.origin);
    endpoint.getWorldPosition(this.end);
    this.from.subVectors(this.end, this.origin).normalize();
    this.to.subVectors(target, this.origin).normalize();
    this.rotation.setFromUnitVectors(this.from, this.to);
    joint.getWorldQuaternion(this.parentRotation);
    this.rotation.multiply(this.parentRotation);
    joint.parent?.getWorldQuaternion(this.parentRotation).invert();
    joint.quaternion.copy(this.parentRotation.multiply(this.rotation));
    joint.updateWorldMatrix(false, true);
  }
}

function smooth(a: number, b: number, p: number): number {
  const t = THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
