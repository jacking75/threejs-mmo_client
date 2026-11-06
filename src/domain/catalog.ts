import type { CharacterClass, EquipmentSlot, EquippedItems } from "./character";
import { NEW_ITEM_DEFINITIONS, NEW_ITEM_IDS } from "./expandedItems";
import { RANGED_WEAPON_DEFINITIONS, RANGED_WEAPON_IDS } from "./rangedWeapons";
export { RANGED_WEAPON_DEFINITIONS, RANGED_WEAPON_IDS } from "./rangedWeapons";
export { NEW_ITEM_DEFINITIONS, NEW_ITEM_IDS } from "./expandedItems";

export const ITEM_IDS = [
  "weapon.training-sword",
  "weapon.moon-sword",
  "outfit.warrior-starter",
  "outfit.mage-starter",
  "outfit.ranger-starter",
  "outfit.traveler",
  "head.none",
  "head.starter-cap",
  "accessory.none",
  ...NEW_ITEM_IDS,
  ...RANGED_WEAPON_IDS,
] as const;

export type ItemId = (typeof ITEM_IDS)[number];

export type WeaponKind = "sword" | "staff" | "bow";

export interface ItemDefinition {
  readonly weaponKind?: WeaponKind;
  readonly id: ItemId;
  readonly label: string;
  readonly slot: EquipmentSlot;
  readonly description?: string;
}

export interface CharacterClassDefinition {
  readonly id: CharacterClass;
  readonly label: string;
  readonly description: string;
  readonly starterEquipment: Readonly<Record<Exclude<EquipmentSlot, "accessory">, ItemId> & { accessory: null }>;
}

export const ITEM_CATALOG: Readonly<Record<ItemId, ItemDefinition>> = {
  ...Object.fromEntries(RANGED_WEAPON_DEFINITIONS.map(item => [item.id, item])) as Record<(typeof RANGED_WEAPON_IDS)[number], ItemDefinition>,
  ...Object.fromEntries(NEW_ITEM_DEFINITIONS.map(item => [item.id, item])) as Record<(typeof NEW_ITEM_IDS)[number], ItemDefinition>,
  "weapon.training-sword": { id: "weapon.training-sword", label: "연습용 검", slot: "weapon" },
  "weapon.moon-sword": { id: "weapon.moon-sword", label: "달빛 검", slot: "weapon" },
  "outfit.warrior-starter": { id: "outfit.warrior-starter", label: "전사 튜닉", slot: "outfit" },
  "outfit.mage-starter": { id: "outfit.mage-starter", label: "마법사 로브", slot: "outfit" },
  "outfit.ranger-starter": { id: "outfit.ranger-starter", label: "궁수 여행복", slot: "outfit" },
  "outfit.traveler": { id: "outfit.traveler", label: "여행자 의상", slot: "outfit" },
  "head.none": { id: "head.none", label: "없음", slot: "head" },
  "head.starter-cap": { id: "head.starter-cap", label: "초보자 모자", slot: "head" },
  "accessory.none": { id: "accessory.none", label: "보조 장비 해제", slot: "accessory" },
};

export const CLASS_CATALOG: Readonly<Record<CharacterClass, CharacterClassDefinition>> = {
  warrior: {
    id: "warrior",
    label: "전사",
    description: "철제 장식의 튜닉을 입고 검 교체 경로를 익히는 클래스다.",
    starterEquipment: {
      weapon: "weapon.training-sword",
      outfit: "outfit.warrior-starter",
      head: "head.none",
      accessory: null,
    },
  },
  mage: {
    id: "mage",
    label: "마법사",
    description: "수정 지팡이를 들어 마력을 모으고 전방으로 마법을 시전하는 클래스다.",
    starterEquipment: {
      weapon: "weapon.apprentice-staff",
      outfit: "outfit.mage-starter",
      head: "head.none",
      accessory: null,
    },
  },
  ranger: {
    id: "ranger",
    label: "궁수",
    description: "활을 들고 시위를 당겨 화살을 발사하는 숲의 궁수 클래스다.",
    starterEquipment: {
      weapon: "weapon.scout-bow",
      outfit: "outfit.ranger-starter",
      head: "head.none",
      accessory: null,
    },
  },
};

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return Object.hasOwn(ITEM_CATALOG, itemId) ? ITEM_CATALOG[itemId as ItemId] : undefined;
}

export function getStartingEquipment(classId: CharacterClass): EquippedItems {
  return { ...CLASS_CATALOG[classId].starterEquipment };
}

export function getStartingOwnedItemIds(classId: CharacterClass): readonly ItemId[] {
  return [
    "weapon.training-sword",
    "weapon.moon-sword",
    CLASS_CATALOG[classId].starterEquipment.outfit,
    "outfit.traveler",
    "head.none",
    "head.starter-cap",
    "accessory.none",
    ...NEW_ITEM_IDS,
    ...RANGED_WEAPON_IDS,
  ];
}

/** Animation follows the equipped item, independently of the character class. */
export function getWeaponKind(itemId: string | null): WeaponKind {
  return itemId ? getItemDefinition(itemId)?.weaponKind ?? "sword" : "sword";
}
