import { ITEM_CATALOG, NEW_ITEM_IDS, RANGED_WEAPON_IDS } from "../domain/catalog";
import { createAnimeAvatar } from "./avatar/createAnimeAvatar";
import { RANGED_WEAPON_FACTORIES } from "./equipment/createRangedWeapons";
import { DISTINCT_WEAPON_FACTORIES } from "./equipment/createDistinctWeapons";
import { DISTINCT_HEAD_FACTORIES } from "./equipment/createDistinctHeadwear";
import { DISTINCT_ACCESSORY_FACTORIES } from "./equipment/createDistinctAccessories";
import { isAvatarOutfitId, type AssetDefinition } from "./types";

const factories = { ...RANGED_WEAPON_FACTORIES, ...DISTINCT_WEAPON_FACTORIES, ...DISTINCT_HEAD_FACTORIES, ...DISTINCT_ACCESSORY_FACTORIES };

/** The same original item meshes used by the game, exposed for gallery inspection. */
export const playableItemAssets: readonly AssetDefinition[] = [...NEW_ITEM_IDS, ...RANGED_WEAPON_IDS].map(id => {
  const item = ITEM_CATALOG[id];
  return {
    id,
    label: item.label,
    category: item.slot,
    tags: ["플레이어", "착용 가능", "신규", item.slot],
    create: () => {
      if (isAvatarOutfitId(id)) {
        const avatar = createAnimeAvatar({ body: "feminine", classId: "warrior", outfitId: id });
        avatar.name = id;
        avatar.userData.fullAvatarPreview = true;
        return avatar;
      }
      const create = factories[id as keyof typeof factories];
      if (!create) throw new Error(`Missing playable item factory: ${id}`);
      return create();
    },
  };
});
