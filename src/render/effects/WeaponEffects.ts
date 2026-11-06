import * as THREE from "three";
import type { AvatarGroup } from "../../assets/types";
import { getWeaponKind } from "../../domain/catalog";
import { getAttackDuration } from "../../game/animationState";
import { MagicEffects, MAGIC_EFFECT_IDS } from "./MagicEffects";
import { BowEffects, BOW_EFFECT_IDS } from "./BowEffects";

export type EffectPhase = "idle" | "charge" | "flight" | "burst";
interface RangedEffect {
  readonly group: THREE.Group;
  update(progress: number, muzzle: THREE.Vector3): void;
  dispose(): void;
}

/** Retains a released cast in world space while the player moves or turns. */
export class WeaponEffects {
  private effect: RangedEffect | null = null;
  private itemId: string | null = null;
  private progress = -1;
  private wasAttacking = false;
  private released = false;
  private readonly muzzle = new THREE.Vector3();
  private readonly worldPosition = new THREE.Vector3();
  private readonly worldRotation = new THREE.Quaternion();
  private readonly parentRotation = new THREE.Quaternion();
  public phase: EffectPhase = "idle";
  public name = "";

  public get normalizedProgress(): number { return this.progress; }

  public constructor(
    private readonly parent: THREE.Object3D,
    private readonly avatar: AvatarGroup,
    private readonly visualScale: number,
  ) {}

  public setWeapon(itemId: string | null): void {
    if (this.itemId === itemId) return;
    this.disposeEffect();
    this.itemId = itemId;
    const kind = getWeaponKind(itemId);
    this.effect = kind === "staff" && itemId ? new MagicEffects(itemId)
      : kind === "bow" && itemId ? new BowEffects(itemId) : null;
    this.name = itemId ? MAGIC_EFFECT_IDS[itemId] ?? BOW_EFFECT_IDS[itemId] ?? "" : "";
    if (this.effect) {
      this.effect.group.name = "weapon.cast-effect";
      this.effect.group.scale.setScalar(this.visualScale);
      this.parent.add(this.effect.group);
      this.effect.update(-1, this.muzzle);
    }
  }

  public update(deltaSeconds: number, attacking: boolean, attackProgress: number): void {
    const effect = this.effect;
    if (!effect) return;
    const kind = getWeaponKind(this.itemId);
    const release = kind === "staff" ? 0.54 : 0.62;
    if (attacking) {
      if (!this.wasAttacking || attackProgress < this.progress - 0.1) this.released = false;
      this.progress = attackProgress;
    } else if (this.progress >= 0 && this.progress < 1.35) {
      this.progress = Math.max(this.progress, this.wasAttacking ? 1 : 0) + Math.max(0, deltaSeconds) / getAttackDuration(kind);
    } else {
      this.progress = -1;
    }
    this.wasAttacking = attacking;
    const group = effect.group;
    if (this.progress >= 0 && !this.released) {
      group.position.copy(this.avatar.position);
      group.quaternion.copy(this.avatar.quaternion);
      group.updateWorldMatrix(true, true);
      const source = this.avatar.getObjectByName(kind === "staff" ? "staff.focus" : "bow.nock");
      if (source) {
        this.avatar.updateWorldMatrix(true, true);
        group.worldToLocal(source.getWorldPosition(this.muzzle));
      } else {
        this.muzzle.set(kind === "staff" ? -0.8 : 0.2, kind === "staff" ? 4.4 : 3.25, 1);
      }
      if (this.progress >= release) {
        group.getWorldPosition(this.worldPosition);
        group.getWorldQuaternion(this.worldRotation);
        this.released = true;
      }
    }
    if (this.released) {
      group.position.copy(this.worldPosition);
      this.parent.worldToLocal(group.position);
      this.parent.getWorldQuaternion(this.parentRotation).invert();
      group.quaternion.copy(this.parentRotation.multiply(this.worldRotation));
    }
    effect.update(this.progress, this.muzzle);
    this.phase = this.progress < 0 || this.progress >= 1.3 ? "idle"
      : this.progress < release ? "charge"
      : this.progress < (kind === "staff" ? 0.88 : 0.9) ? "flight" : "burst";
  }

  public dispose(): void {
    this.disposeEffect();
    this.itemId = null;
  }

  private disposeEffect(): void {
    this.effect?.group.removeFromParent();
    this.effect?.dispose();
    this.effect = null;
    this.progress = -1;
    this.wasAttacking = false;
    this.released = false;
    this.phase = "idle";
    this.name = "";
  }
}
