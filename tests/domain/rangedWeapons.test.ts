import { describe, expect, it } from "vitest";
import { getWeaponKind, RANGED_WEAPON_DEFINITIONS, RANGED_WEAPON_IDS } from "../../src/domain/catalog";
import { createDefaultProfile } from "../../src/domain/character";
import { equipOwnedItem } from "../../src/domain/equipment";
import { restoreProfile, serializeProfile } from "../../src/domain/save";

const profile = () => createDefaultProfile({name:"Luna",body:"feminine",classId:"warrior"});
describe("playable staff and bow collection",()=>{
  it("grants ten of each kind, with distinct definitions and class-specific starters",()=>{
    expect(RANGED_WEAPON_DEFINITIONS.filter(item=>item.weaponKind==="staff")).toHaveLength(10);
    expect(RANGED_WEAPON_DEFINITIONS.filter(item=>item.weaponKind==="bow")).toHaveLength(10);
    expect(new Set(RANGED_WEAPON_IDS).size).toBe(20);
    expect(profile().ownedItemIds).toEqual(expect.arrayContaining(RANGED_WEAPON_IDS));
    expect(createDefaultProfile({name:"Mage",body:"masculine",classId:"mage"}).equipped.weapon).toBe("weapon.apprentice-staff");
    expect(createDefaultProfile({name:"Archer",body:"masculine",classId:"ranger"}).equipped.weapon).toBe("weapon.scout-bow");
  });
  it("preserves legacy selections while granting new weapons and round-trips every new weapon",()=>{
    const base=profile();
    const legacy={...base,ownedItemIds:base.ownedItemIds.filter(id=>!RANGED_WEAPON_IDS.includes(id as typeof RANGED_WEAPON_IDS[number]))};
    const restored=restoreProfile(JSON.stringify(legacy));
    expect(restored?.equipped).toEqual(legacy.equipped);
    expect(restored?.ownedItemIds).toEqual(expect.arrayContaining(RANGED_WEAPON_IDS));
    for(const item of RANGED_WEAPON_DEFINITIONS){
      const result=equipOwnedItem(base,item.id);
      expect(result.ok).toBe(true);
      expect(result.profile.equipped).toEqual({...base.equipped,weapon:item.id});
      expect(getWeaponKind(item.id)).toBe(item.weaponKind);
      expect(restoreProfile(serializeProfile(result.profile))).toEqual(result.profile);
    }
    expect(getWeaponKind("weapon.moon-sword")).toBe("sword");
  });
});
