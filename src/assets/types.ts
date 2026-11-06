import type * as THREE from "three";
import type { BodyPresentation, CharacterClass } from "../domain/character";

export type { BodyPresentation, CharacterClass } from "../domain/character";

export const NEW_OUTFIT_IDS = [
  "outfit.dune-nomad",
  "outfit.tide-captain",
  "outfit.clockwork-artisan",
  "outfit.shrine-keeper",
  "outfit.frost-warden",
  "outfit.mushroom-forager",
  "outfit.sky-courier",
  "outfit.obsidian-knight",
  "outfit.festival-dancer",
  "outfit.astral-scholar",
] as const;

export type NewOutfitId = (typeof NEW_OUTFIT_IDS)[number];

export type AvatarOutfitId =
  | NewOutfitId
  | "outfit.warrior-starter"
  | "outfit.mage-starter"
  | "outfit.ranger-starter"
  | "outfit.traveler";

export function isAvatarOutfitId(value: string | null | undefined): value is AvatarOutfitId {
  return value === "outfit.warrior-starter" || value === "outfit.mage-starter"
    || value === "outfit.ranger-starter" || value === "outfit.traveler"
    || NEW_OUTFIT_IDS.some((id) => id === value);
}

export interface AvatarOptions {
  readonly body: BodyPresentation;
  readonly classId: CharacterClass;
  readonly outfitId?: AvatarOutfitId;
}

export interface SculptRuntime {
  readonly nodes: Readonly<Record<string, THREE.Object3D>>;
  readonly sockets: Readonly<Record<"hand.R" | "hand.L" | "head" | "back", THREE.Object3D>>;
  readonly colliders: readonly THREE.Object3D[];
  readonly destructionGroups: Readonly<Record<string, readonly string[]>>;
}

export interface AvatarAnimationRuntime {
  readonly clipNames: readonly string[];
  update(state: "idle" | "run" | "sprint" | "attack_1", deltaSeconds: number): boolean;
  dispose(): void;
}

export interface AssetDefinition {
  readonly id: string;
  readonly label: string;
  readonly category:
    | "avatar"
    | "npc"
    | "weapon"
    | "outfit"
    | "head"
    | "accessory"
    | "equipment"
    | "fauna"
    | "creature"
    | "world"
    | "field";
  readonly tags?: readonly string[];
  readonly create: () => THREE.Group;
}

export type AvatarGroup = THREE.Group & {
  userData: THREE.Group["userData"] & {
    sculptRuntime: SculptRuntime;
    avatarOptions: AvatarOptions;
    assetSource?: "procedural" | "blender-glb";
    assetStatus?: "ready" | "loading" | "fallback";
    assetReady?: Promise<void>;
    assetError?: unknown;
    animationRuntime?: AvatarAnimationRuntime;
    disposed?: boolean;
    img2threejs: Readonly<Record<string, unknown>>;
  };
};
