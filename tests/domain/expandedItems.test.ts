import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "../../src/domain/character";
import { ITEM_CATALOG, NEW_ITEM_DEFINITIONS, NEW_ITEM_IDS, getItemDefinition } from "../../src/domain/catalog";
import { equipOwnedItem, equipOwnedItems } from "../../src/domain/equipment";
import { restoreProfile, serializeProfile } from "../../src/domain/save";
import { buildInventorySlotViews } from "../../src/ui/InventoryPanel";
import { EXPANDED_ITEM_ART } from "../../src/ui/expandedItemArt";

const profile = () => createDefaultProfile({ name: "새벽", body: "feminine", classId: "warrior" });

describe("expanded playable item collection", () => {
  it("grants ten outfits, ten heads, five swords and five accessories to new characters", () => {
    const base = profile();
    expect(NEW_ITEM_IDS).toHaveLength(30);
    expect(new Set(NEW_ITEM_IDS).size).toBe(30);
    for (const [slot, count] of [["outfit", 10], ["head", 10], ["weapon", 5], ["accessory", 5]] as const) {
      expect(NEW_ITEM_DEFINITIONS.filter(item => item.slot === slot)).toHaveLength(count);
    }
    expect(base.ownedItemIds).toEqual(expect.arrayContaining([...NEW_ITEM_IDS]));
    expect(new Set(NEW_ITEM_IDS.map(id => EXPANDED_ITEM_ART[id])).size).toBe(30);
    expect(NEW_ITEM_IDS.every(id => Boolean(EXPANDED_ITEM_ART[id]))).toBe(true);
    expect(getItemDefinition("__proto__")).toBeUndefined();
  });

  it("upgrades old saves without discarding existing selections or ownership", () => {
    const base = profile();
    const legacy = { ...base, ownedItemIds: ["weapon.moon-sword", "outfit.traveler", "head.none"], equipped: { weapon: "weapon.moon-sword", outfit: "outfit.traveler", head: "head.none" } };
    const restored = restoreProfile(JSON.stringify(legacy));
    expect(restored?.equipped).toEqual({ ...legacy.equipped, accessory: null });
    expect(restored?.ownedItemIds).toEqual(expect.arrayContaining([...legacy.ownedItemIds, ...NEW_ITEM_IDS]));
    expect(restored?.ownedItemIds).not.toContain("outfit.mage-starter");
    expect(restored).not.toBeNull();
    if (restored) expect(restoreProfile(serializeProfile(restored))).toEqual(restored);
  });

  it("validates old ownership before granting new items and rejects invalid accessory slots", () => {
    const base = profile();
    for (const accessory of [false, 42, "outfit.dune-nomad", "accessory.unknown"]) {
      expect(restoreProfile(JSON.stringify({ ...base, equipped: { ...base.equipped, accessory } }))).toBeNull();
    }
    expect(restoreProfile(JSON.stringify({ ...base, ownedItemIds: base.ownedItemIds.filter(id => id !== "accessory.kite-shield"), equipped: { ...base.equipped, accessory: "accessory.kite-shield" } }))).toBeNull();
  });

  it("equips every addition in its intended slot, preserves the other slots and round-trips", () => {
    const base = profile();
    for (const id of NEW_ITEM_IDS) {
      const result = equipOwnedItem(base, id);
      expect(result.ok).toBe(true);
      expect(result.profile.equipped).toEqual({ ...base.equipped, [ITEM_CATALOG[id].slot]: id });
      expect(restoreProfile(serializeProfile(result.profile))).toEqual(result.profile);
    }
    const withShield = equipOwnedItem(base, "accessory.kite-shield").profile;
    const cleared = equipOwnedItems(withShield, ["weapon.estoc", "accessory.none"]);
    expect(cleared.ok).toBe(true);
    expect(cleared.profile.equipped.accessory).toBeNull();
    expect(cleared.profile.equipped.weapon).toBe("weapon.estoc");
    expect(withShield.equipped.accessory).toBe("accessory.kite-shield");
    const views = buildInventorySlotViews(base);
    expect(views.find(view => view.slot === "accessory")?.items.filter(item => item.equipped).map(item => item.id)).toEqual(["accessory.none"]);
  });
});
