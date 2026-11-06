import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { RANGED_WEAPON_FACTORIES, updateBowDraw } from "../../src/assets/equipment/createRangedWeapons";
import { RANGED_WEAPON_DEFINITIONS } from "../../src/domain/catalog";
import { createAnimeAvatar } from "../../src/assets/avatar/createAnimeAvatar";
import { createDefaultProfile } from "../../src/domain/character";
import { EquipmentRenderer } from "../../src/render/EquipmentRenderer";

describe("ranged weapon visuals",()=>{
  it("uses original independent meshes and distinct silhouettes with named animation anchors",()=>{
    const signatures=new Set<string>();
    for(const definition of RANGED_WEAPON_DEFINITIONS){
      const root=RANGED_WEAPON_FACTORIES[definition.id]();
      const duplicate=RANGED_WEAPON_FACTORIES[definition.id]();
      expect(root.name).toBe(definition.id);
      expect(root.userData.original).toBe(true);
      expect(root.userData.attachment.socket).toBe(definition.weaponKind==="bow"?"hand.L":"hand.R");
      const nodes:string[]=[];
      root.traverse(node=>{if(node instanceof THREE.Mesh){nodes.push(node.name);expect(node.geometry.attributes.position.count).toBeGreaterThan(0);}});
      signatures.add(nodes.join(","));
      expect(root.children[0]).not.toBe(duplicate.children[0]);
      expect(root.getObjectByName(definition.weaponKind==="bow"?"bow.nock":"staff.focus")).toBeDefined();
    }
    expect(signatures.size).toBe(20);
  });
  it("pulls both string segments to the arrow nock and releases without changing limb geometry",()=>{
    const root=RANGED_WEAPON_FACTORIES["weapon.scout-bow"]();
    const limb=root.getObjectByName("bow.limb.1") as THREE.Mesh;
    const geometry=limb.geometry;
    updateBowDraw(root,1,true);
    const nock=root.getObjectByName("bow.nock");
    if(!nock)throw new Error("Missing bow nock");
    const arrow=root.getObjectByName("bow.arrow");
    if(!arrow)throw new Error("Missing arrow");
    expect(nock.position.z).toBeCloseTo(-.81);
    expect(arrow.position.equals(nock.position)).toBe(true);
    expect(arrow.visible).toBe(true);
    const upper=root.getObjectByName("bow.string.upper");
    if(!upper)throw new Error("Missing upper string");
    upper.updateMatrix();
    const endpoint=new THREE.Vector3(0,-.5,0).applyMatrix4(upper.matrix);
    expect(endpoint.distanceTo(nock.position)).toBeLessThan(.00001);
    updateBowDraw(root,0,false);
    expect(nock.position.z).toBeCloseTo(-.16);
    expect(arrow.visible).toBe(false);
    expect(limb.geometry).toBe(geometry);
  });
  it("switches weapons between exact hand sockets without leaving duplicate equipment",()=>{
    const profile=createDefaultProfile({name:"Luna",body:"feminine",classId:"warrior"});
    const avatar=createAnimeAvatar({body:profile.body,classId:profile.classId});
    const renderer=new EquipmentRenderer(avatar);
    let previous:THREE.Group|null=null;
    for(const definition of RANGED_WEAPON_DEFINITIONS){
      renderer.sync({...profile,equipped:{...profile.equipped,weapon:definition.id}});
      const current=renderer.getActiveVisual("weapon");
      expect(current?.parent).toBe(avatar.userData.sculptRuntime.sockets[definition.weaponKind==="bow"?"hand.L":"hand.R"]);
      if(previous)expect(previous.parent).toBeNull();
      previous=current;
    }
    renderer.dispose();
    expect(previous?.parent).toBeNull();
  });
  it("keeps a selected shield saved while the bow occupies its hand and restores it on weapon change",()=>{
    const profile=createDefaultProfile({name:"Luna",body:"feminine",classId:"warrior"});
    const avatar=createAnimeAvatar({body:profile.body,classId:profile.classId});
    const renderer=new EquipmentRenderer(avatar);
    const equipped={...profile.equipped,accessory:"accessory.kite-shield",weapon:"weapon.scout-bow"};
    renderer.sync({...profile,equipped});
    const shield=renderer.getActiveVisual("accessory");
    if(!shield)throw new Error("Missing shield");
    expect(shield.visible).toBe(false);
    expect(renderer.getActiveItemId("accessory")).toBe("accessory.kite-shield");
    renderer.sync({...profile,equipped:{...equipped,weapon:"weapon.apprentice-staff"}});
    expect(renderer.getActiveVisual("accessory")).toBe(shield);
    expect(shield.visible).toBe(true);
    renderer.dispose();
  });
});
