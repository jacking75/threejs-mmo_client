import { getItemDefinition } from "./catalog";
import type { CharacterProfile } from "./character";

export type EquipItemResult =
  | { readonly ok: true; readonly profile: CharacterProfile }
  | {
      readonly ok: false;
      readonly profile: CharacterProfile;
      readonly reason: "unknown-item" | "item-not-owned";
    };

export function equipOwnedItem(profile: CharacterProfile, itemId: string): EquipItemResult {
  const item = getItemDefinition(itemId);
  if (!item) return { ok: false, profile, reason: "unknown-item" };
  if (!profile.ownedItemIds.includes(itemId)) {
    return { ok: false, profile, reason: "item-not-owned" };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      equipped: {
        ...profile.equipped,
        [item.slot]: item.id === "accessory.none" ? null : item.id,
      },
    },
  };
}

/** Validate the complete selection before committing or persisting anything. */
export function equipOwnedItems(profile: CharacterProfile, itemIds: readonly string[]): EquipItemResult {
  let next = profile;
  for (const itemId of itemIds) {
    const result = equipOwnedItem(next, itemId);
    if (!result.ok) return { ...result, profile };
    next = result.profile;
  }
  return { ok: true, profile: next };
}
