import * as THREE from "three";
import { createRuntimeAvatar } from "../assets/avatar/createRuntimeAvatar";
import type { AvatarGroup, AvatarOutfitId } from "../assets/types";
import { isAvatarOutfitId } from "../assets/types";
import type { CharacterProfile } from "../domain/character";
import { getWeaponKind, type WeaponKind } from "../domain/catalog";
import { WeaponEffects } from "./effects/WeaponEffects";
import { CombatAnimator } from "./CombatAnimator";
import type { AnimationState } from "../game/animationState";

export interface AvatarRendererOptions {
  readonly visualScale?: number;
  readonly createAvatar?: typeof createRuntimeAvatar;
}

export class AvatarRenderer {
  public readonly avatar: AvatarGroup;
  private leftArm!: THREE.Object3D;
  private rightArm!: THREE.Object3D;
  private leftLeg!: THREE.Object3D;
  private rightLeg!: THREE.Object3D;
  private chest!: THREE.Object3D;
  private head!: THREE.Object3D;
  private readonly attackEffect: THREE.Group;
  private readonly attackEffectMaterial: THREE.MeshBasicMaterial;
  private readonly visualScale: number;
  private readonly rangedEffects: WeaponEffects;
  private disposed = false;
  private combat!: CombatAnimator;
  private attacking = false;
  private weaponKind: WeaponKind;
  private readonly base = {
    leftArmX: 0,
    leftArmZ: 0,
    rightArmX: 0,
    rightArmZ: 0,
    leftLegX: 0,
    rightLegX: 0,
    chestX: 0,
    chestZ: 0,
    chestRotationY: 0,
    chestY: 0,
    headZ: 0,
    headY: 0,
    avatarZ: 0,
  };

  public constructor(
    parent: THREE.Object3D,
    profile: CharacterProfile,
    options: AvatarRendererOptions = {},
  ) {
    this.weaponKind = getWeaponKind(profile.equipped.weapon);
    this.visualScale = options.visualScale ?? 1;
    this.avatar = (options.createAvatar ?? createRuntimeAvatar)({
      body: profile.body,
      classId: profile.classId,
      outfitId: getAvatarOutfitId(profile.equipped.outfit),
    });
    this.avatar.name = "player-avatar";
    this.avatar.scale.setScalar(this.visualScale);
    parent.add(this.avatar);
    const attackEffect = createAttackEffect();
    this.attackEffect = attackEffect.group;
    this.attackEffectMaterial = attackEffect.material;
    parent.add(this.attackEffect);

    this.bindRuntimeNodes();
    this.rangedEffects = new WeaponEffects(parent, this.avatar, this.visualScale);
    this.rangedEffects.setWeapon(profile.equipped.weapon);
    void this.avatar.userData.assetReady?.then(() => {
      if (!this.disposed) this.bindRuntimeNodes();
    });
  }

  private bindRuntimeNodes(): void {
    const nodes = this.avatar.userData.sculptRuntime.nodes;
    this.leftArm = requiredNode(nodes, "arm.L.upper");
    this.rightArm = requiredNode(nodes, "arm.R.upper");
    this.leftLeg = requiredNode(nodes, "leg.L.upper");
    this.rightLeg = requiredNode(nodes, "leg.R.upper");
    this.chest = requiredNode(nodes, "chest");
    this.head = requiredNode(nodes, "head");
    this.base.leftArmX = this.leftArm.rotation.x;
    this.base.leftArmZ = this.leftArm.rotation.z;
    this.base.rightArmX = this.rightArm.rotation.x;
    this.base.rightArmZ = this.rightArm.rotation.z;
    this.base.leftLegX = this.leftLeg.rotation.x;
    this.base.rightLegX = this.rightLeg.rotation.x;
    this.base.chestX = this.chest.rotation.x;
    this.base.chestZ = this.chest.rotation.z;
    this.base.chestRotationY = this.chest.rotation.y;
    this.base.chestY = this.chest.position.y;
    this.base.headZ = this.head.rotation.z;
    this.base.headY = this.head.position.y;
    this.base.avatarZ = this.avatar.position.z;
    this.combat = new CombatAnimator(this.avatar);
  }

  public setWeapon(itemId: string | null): void {
    this.weaponKind = getWeaponKind(itemId);
    this.rangedEffects.setWeapon(itemId);
  }

  public get attackEffectName(): string { return this.rangedEffects.name; }

  public get effectPhase(): string { return this.rangedEffects.phase; }

  public get effectProgress(): number { return this.rangedEffects.normalizedProgress; }

  public face(direction: THREE.Vector3, deltaSeconds: number): void {
    if (direction.lengthSq() < 0.000001) return;
    const desiredYaw = Math.atan2(direction.x, direction.z);
    const turn = shortestAngle(this.avatar.rotation.y, desiredYaw);
    const strength = 1 - Math.exp(-14 * Math.max(deltaSeconds, 0));
    this.avatar.rotation.y += turn * strength;
  }

  public update(
    deltaSeconds: number,
    elapsedSeconds: number,
    state: AnimationState,
    attackProgress = 0,
  ): void {
    if (!this.avatar.visible) {
      this.updateAttackEffect(0, deltaSeconds);
      return;
    }
    if (state === "attack_1") {
      this.avatar.userData.animationRuntime?.stop?.();
      this.attacking = true;
      this.combat.update(this.weaponKind, attackProgress);
      this.updateAttackEffect(attackProgress, deltaSeconds, true);
      return;
    }
    if (this.attacking) {
      this.combat.reset();
      this.attacking = false;
    }
    if (this.avatar.userData.animationRuntime?.update(state, deltaSeconds) === true) {
      this.updateAttackEffect(0, deltaSeconds);
      return;
    }

    const moving = state !== "idle";
    const frequency = state === "sprint" ? 12 : state === "run" ? 8.5 : 2.1;
    const stride = state === "sprint" ? 0.8 : state === "run" ? 0.56 : 0.035;
    const cycle = Math.sin(elapsedSeconds * frequency);
    const bounceCycle = Math.abs(Math.sin(elapsedSeconds * frequency));
    const bob = moving ? bounceCycle * (state === "sprint" ? 0.105 : 0.065) : Math.sin(elapsedSeconds * frequency) * 0.025;
    const armTarget = cycle * stride;
    const legTarget = -cycle * stride * 0.9;
    const leanTarget = moving ? (state === "sprint" ? 0.14 : 0.07) : 0;
    const damping = moving ? 18 : 10;

    this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, this.base.leftArmX + armTarget, damping, deltaSeconds);
    this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, this.base.rightArmX - armTarget, damping, deltaSeconds);
    this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, this.base.leftLegX + legTarget, damping, deltaSeconds);
    this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, this.base.rightLegX - legTarget, damping, deltaSeconds);
    this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, this.base.leftArmZ, damping, deltaSeconds);
    this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, this.base.rightArmZ, damping, deltaSeconds);
    this.chest.rotation.x = THREE.MathUtils.damp(this.chest.rotation.x, this.base.chestX + leanTarget, damping, deltaSeconds);
    this.chest.rotation.z = THREE.MathUtils.damp(this.chest.rotation.z, this.base.chestZ + (moving ? cycle * 0.025 : Math.sin(elapsedSeconds * 1.4) * 0.012), damping, deltaSeconds);
    this.chest.rotation.y = THREE.MathUtils.damp(this.chest.rotation.y, this.base.chestRotationY, damping, deltaSeconds);
    this.chest.position.y = THREE.MathUtils.damp(this.chest.position.y, this.base.chestY + bob * 0.38, damping, deltaSeconds);
    this.head.position.y = THREE.MathUtils.damp(this.head.position.y, this.base.headY + bob * 0.18, damping, deltaSeconds);
    this.head.rotation.z = THREE.MathUtils.damp(this.head.rotation.z, this.base.headZ + (moving ? -cycle * 0.018 : Math.sin(elapsedSeconds * 1.3) * 0.018), damping, deltaSeconds);
    this.avatar.position.y = THREE.MathUtils.damp(this.avatar.position.y, bob, damping, deltaSeconds);
    this.avatar.position.z = THREE.MathUtils.damp(this.avatar.position.z, this.base.avatarZ, damping, deltaSeconds);
    this.updateAttackEffect(0, deltaSeconds);
  }

  private updateAttackEffect(progress: number, deltaSeconds: number, attacking = false): void {
    this.rangedEffects.update(deltaSeconds, attacking, progress);
    const flight = THREE.MathUtils.clamp((progress - 0.32) / 0.64, 0, 1);
    this.attackEffect.visible = this.weaponKind === "sword" && progress > 0.32 && progress < 0.96;
    this.attackEffectMaterial.opacity = Math.sin(flight * Math.PI) * 0.8;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.avatar.rotation.y);
    this.attackEffect.position.copy(this.avatar.position).addScaledVector(forward, 0.9 * this.visualScale);
    this.attackEffect.position.y += 3 * this.visualScale;
    this.attackEffect.rotation.set(0, this.avatar.rotation.y, 0.5 - flight);
    this.attackEffect.scale.setScalar(this.visualScale);
  }

  public dispose(): void {
    this.disposed = true;
    this.rangedEffects.dispose();
    this.avatar.userData.disposed = true;
    this.avatar.userData.animationRuntime?.dispose();
    this.avatar.userData.animationRuntime = undefined;
    this.avatar.removeFromParent();
    this.attackEffect.removeFromParent();
    this.attackEffect.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    this.attackEffectMaterial.dispose();
    this.avatar.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
  }
}

function createAttackEffect(): { group: THREE.Group; material: THREE.MeshBasicMaterial } {
  const shape = new THREE.Shape();
  const start = -0.82;
  const end = 0.82;
  shape.absarc(0, 0, 1.2, start, end, false);
  shape.absarc(0, 0, 1.04, end, start, true);
  shape.closePath();
  const material = new THREE.MeshBasicMaterial({
    color: 0xc9efff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 28), material);
  mesh.name = "attack_1.sword-arc";
  const group = new THREE.Group();
  group.name = "attack_1.effect";
  group.visible = false;
  mesh.rotation.y = -Math.PI / 2;
  group.add(mesh);
  return { group, material };
}

function getAvatarOutfitId(itemId: string | null): AvatarOutfitId | undefined {
  return isAvatarOutfitId(itemId) ? itemId : undefined;
}

function requiredNode(nodes: Readonly<Record<string, THREE.Object3D>>, name: string): THREE.Object3D {
  const node = nodes[name];
  if (!node) throw new Error(`Avatar animation node is missing: ${name}`);
  return node;
}

function shortestAngle(from: number, to: number): number {
  return THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}
