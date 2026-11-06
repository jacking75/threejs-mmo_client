import * as THREE from "three";
import {
  createAvatarOutfitVisual,
  getDefaultAvatarOutfitId,
} from "../assets/avatar/createAnimeAvatar";
import { applyImportedOutfit } from "../assets/avatar/createRuntimeAvatar";
import { createStarterCap } from "../assets/equipment/createHeadEquipment";
import { createMoonSword, createTrainingSword } from "../assets/equipment/createSword";
import { RANGED_WEAPON_FACTORIES } from "../assets/equipment/createRangedWeapons";
import { DISTINCT_WEAPON_FACTORIES } from "../assets/equipment/createDistinctWeapons";
import { DISTINCT_HEAD_FACTORIES } from "../assets/equipment/createDistinctHeadwear";
import { ACCESSORY_SOCKETS, DISTINCT_ACCESSORY_FACTORIES } from "../assets/equipment/createDistinctAccessories";
import { isAvatarOutfitId } from "../assets/types";
import type { AvatarGroup } from "../assets/types";
import { getWeaponKind } from "../domain/catalog";
import type { CharacterProfile, EquipmentSlot } from "../domain/character";

type AttachedSlot = "weapon" | "head" | "accessory";

export interface EquipmentVisual {
  readonly itemId: string;
  readonly slot: AttachedSlot;
  readonly socket?: "hand.R" | "hand.L" | "head" | "back";
  create(): THREE.Group;
}

const createEmptyHead = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = "head.none";
  return group;
};

export const EQUIPMENT_VISUALS: Readonly<Record<string, EquipmentVisual>> = {
  ...Object.fromEntries(Object.entries(RANGED_WEAPON_FACTORIES).map(([itemId, create]) =>
    [itemId, { itemId, slot: "weapon" as const, create, socket: getWeaponKind(itemId) === "bow" ? "hand.L" as const : "hand.R" as const }])),
  ...Object.fromEntries(Object.entries(DISTINCT_WEAPON_FACTORIES).map(([itemId, create]) =>
    [itemId, { itemId, slot: "weapon" as const, create }])),
  ...Object.fromEntries(Object.entries(DISTINCT_HEAD_FACTORIES).map(([itemId, create]) =>
    [itemId, { itemId, slot: "head" as const, create }])),
  ...Object.fromEntries(Object.entries(DISTINCT_ACCESSORY_FACTORIES).map(([itemId, create]) =>
    [itemId, { itemId, slot: "accessory" as const, create, socket: ACCESSORY_SOCKETS[itemId as keyof typeof ACCESSORY_SOCKETS] }])),
  "weapon.training-sword": {
    itemId: "weapon.training-sword",
    slot: "weapon",
    create: createTrainingSword,
  },
  "weapon.moon-sword": {
    itemId: "weapon.moon-sword",
    slot: "weapon",
    create: createMoonSword,
  },
  "head.none": {
    itemId: "head.none",
    slot: "head",
    create: createEmptyHead,
  },
  "head.starter-cap": {
    itemId: "head.starter-cap",
    slot: "head",
    create: createStarterCap,
  },
};

export class EquipmentRenderer {
  private handSocket!: THREE.Object3D;
  private headSocket!: THREE.Object3D;
  private outfitRootMount!: THREE.Object3D;
  private outfitChestMount!: THREE.Object3D;
  private readonly activeVisuals: Partial<Record<AttachedSlot, THREE.Group>> = {};
  private readonly activeItemIds: Partial<Record<EquipmentSlot, string | null>> = {};
  private disposed = false;

  public constructor(private readonly avatar: AvatarGroup) {
    this.bindRuntime();
    this.activeItemIds.outfit = avatar.userData.avatarOptions.outfitId
      ?? getDefaultAvatarOutfitId(avatar.userData.avatarOptions.classId);
    void avatar.userData.assetReady?.then(() => {
      if (!this.disposed) this.bindRuntime();
    });
  }

  public sync(profile: CharacterProfile): void {
    const weaponSocket = profile.equipped.weapon ? EQUIPMENT_VISUALS[profile.equipped.weapon]?.socket : undefined;
    this.syncAttachedVisual("weapon", profile.equipped.weapon,
      weaponSocket === "hand.L" ? this.avatar.userData.sculptRuntime.sockets["hand.L"] : this.handSocket);
    this.syncAttachedVisual("head", profile.equipped.head, this.headSocket);
    const accessoryId = profile.equipped.accessory;
    const accessorySocket = accessoryId ? EQUIPMENT_VISUALS[accessoryId]?.socket : undefined;
    this.syncAttachedVisual("accessory", accessoryId,
      this.avatar.userData.sculptRuntime.sockets[accessorySocket ?? "back"]);
    // A bow occupies the off hand. Preserve the selected accessory in the profile
    // so changing back to a staff or sword restores its appearance immediately.
    const accessory = this.activeVisuals.accessory;
    if (accessory) accessory.visible = !(weaponSocket === "hand.L" && accessorySocket === "hand.L");
    this.syncOutfit(profile.equipped.outfit);
  }

  public getActiveItemId(slot: EquipmentSlot): string | null {
    return this.activeItemIds[slot] ?? null;
  }

  public getActiveVisual(slot: AttachedSlot): THREE.Group | null {
    return this.activeVisuals[slot] ?? null;
  }

  public dispose(): void {
    this.disposed = true;
    this.clearAttachedVisual("weapon");
    this.clearAttachedVisual("head");
    this.clearAttachedVisual("accessory");
    clearMount(this.outfitRootMount);
    clearMount(this.outfitChestMount);
    this.activeItemIds.outfit = null;
  }

  private syncAttachedVisual(
    slot: AttachedSlot,
    itemId: string | null,
    socket: THREE.Object3D,
  ): void {
    if (this.activeItemIds[slot] === itemId) return;
    this.clearAttachedVisual(slot);
    this.activeItemIds[slot] = itemId;
    if (!itemId) return;

    const definition = EQUIPMENT_VISUALS[itemId];
    if (!definition || definition.slot !== slot) return;
    const visual = definition.create();
    visual.userData.itemId = itemId;
    this.fitAttachedVisual(slot, visual);
    socket.add(visual);
    this.activeVisuals[slot] = visual;
  }

  private clearAttachedVisual(slot: AttachedSlot): void {
    const visual = this.activeVisuals[slot];
    if (!visual) return;
    visual.removeFromParent();
    disposeObject(visual);
    this.activeVisuals[slot] = undefined;
  }

  private syncOutfit(itemId: string | null): void {
    if (this.activeItemIds.outfit === itemId || !isAvatarOutfitId(itemId)) return;
    clearMount(this.outfitRootMount);
    clearMount(this.outfitChestMount);
    if (applyImportedOutfit(this.avatar, itemId)) {
      this.activeItemIds.outfit = itemId;
      this.avatar.userData.avatarOptions = { ...this.avatar.userData.avatarOptions, outfitId: itemId };
      return;
    }
    const outfit = createAvatarOutfitVisual(itemId, this.avatar.userData.avatarOptions.body);
    this.outfitRootMount.add(outfit.root);
    this.outfitChestMount.add(outfit.chest);
    this.activeItemIds.outfit = itemId;
    this.avatar.userData.avatarOptions = {
      ...this.avatar.userData.avatarOptions,
      outfitId: itemId,
    };
  }

  private bindRuntime(): void {
    const runtime = this.avatar.userData.sculptRuntime;
    this.handSocket = runtime.sockets["hand.R"];
    this.headSocket = runtime.sockets.head;
    this.outfitRootMount = requiredNode(runtime.nodes, "outfit.mount.root");
    this.outfitChestMount = requiredNode(runtime.nodes, "outfit.mount.chest");
    // Runtime upgrades preserve the attachment objects. Refit them here so loading order
    // cannot change a hat's scale or a left-hand accessory's orientation.
    for (const slot of ["weapon", "head", "accessory"] as const) {
      const visual = this.activeVisuals[slot];
      if (visual) this.fitAttachedVisual(slot, visual);
    }
  }

  private fitAttachedVisual(slot: AttachedSlot, visual: THREE.Group): void {
    const imported = this.avatar.userData.assetSource === "blender-glb";
    if (slot === "weapon") {
      const ranged = visual.userData.weaponKind === "staff" || visual.userData.weaponKind === "bow";
      visual.rotation.set(0.08, 0, ranged ? (imported ? Math.PI : 0) : (imported ? 0 : Math.PI));
      visual.position.set(0, -0.15, 0.08);
    } else if (slot === "head") {
      visual.position.set(0, 0, 0);
      visual.scale.setScalar(imported ? 1.1 : 1);
    } else if (visual.userData.attachment?.socket === "hand.L") {
      // Imported hand bones point down and their +Z faces backward. Flip both axes
      // so a shield's decorated face remains forward and lanterns hang below the hand.
      visual.rotation.set(imported ? Math.PI : 0, 0, 0);
    }
  }
}

function requiredNode(nodes: Readonly<Record<string, THREE.Object3D>>, name: string): THREE.Object3D {
  const node = nodes[name];
  if (!node) throw new Error(`Avatar equipment node is missing: ${name}`);
  return node;
}

function clearMount(mount: THREE.Object3D): void {
  for (const child of [...mount.children]) {
    child.removeFromParent();
    disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
