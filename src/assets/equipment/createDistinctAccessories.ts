import * as THREE from "three";
import { gearRoot, part, plate, ring, rod } from "./gearGeometry";

/** All accessories use named sockets. Back pieces extend toward -Z; hand pieces face +Z. */
export function createKiteShield(): THREE.Group {
  const root=gearRoot("accessory.kite-shield","hand.L");
  plate(root,"shield.outline",[[-.5,.59],[0,.77],[.5,.59],[.42,-.3],[0,-.83],[-.42,-.3]],0xd6bd76,.1,.2);
  plate(root,"shield.face",[[-.43,.53],[0,.68],[.43,.53],[.35,-.27],[0,-.71],[-.35,-.27]],0x356b7d,.08,.27);
  plate(root,"shield.sunburst",[[-.25,.16],[-.07,.23],[0,.52],[.07,.23],[.25,.16],[.07,.09],[0,-.29],[-.07,.09]],0xe0cb91,.03,.33);
  rod(root,"grip",[-.18,0,0],[.18,0,0],.055,0x604a36);
  return root;
}

export function createExpeditionPack(): THREE.Group {
  const root=gearRoot("accessory.expedition-pack","back");
  part(root,"pack.canvas",new THREE.BoxGeometry(.87,.94,.38),0x8a7852,[0,-.13,-.24]);
  part(root,"pack.flap",new THREE.BoxGeometry(.91,.24,.43),0xb9a276,[0,.26,-.25]);
  for(const sign of [-1,1]) part(root,`strap.${sign}`,new THREE.BoxGeometry(.09,.92,.04),0x503c2c,[sign*.27,-.13,-.45]);
  part(root,"bedroll",new THREE.CylinderGeometry(.17,.17,1.14,12),0x6d8c84,[0,.55,-.25]).rotation.z=Math.PI/2;
  part(root,"canteen",new THREE.CylinderGeometry(.17,.17,.16,10),0xa0b8b3,[.58,-.23,-.2]).rotation.x=Math.PI/2;
  rod(root,"walking-stick",[-.53,-.8,-.27],[-.53,.65,-.27],.035,0x775235);
  return root;
}

export function createAstralOrbit(): THREE.Group {
  const root=gearRoot("accessory.astral-orbit","back");
  ring(root,"orbit.outer",.86,.034,0xc5b281,[0,.25,-.43]);
  ring(root,"orbit.tilted",.68,.025,0x80c9cc,[0,.25,-.45]).rotation.y=.65;
  part(root,"core",new THREE.OctahedronGeometry(.24),0x9be3e5,[0,.25,-.45],[1,1.4,.5],true);
  for(let i=0;i<5;i++) {
    const a=i*Math.PI*2/5;
    part(root,`orbit.star.${i}`,new THREE.OctahedronGeometry(.105),i%2?0xe6cc8a:0x9d9ce3,[Math.cos(a)*.86,.25+Math.sin(a)*.86,-.43],[1,1.5,.6],true);
  }
  return root;
}

export function createSignalBanner(): THREE.Group {
  const root=gearRoot("accessory.signal-banner","back");
  rod(root,"mast",[.35,-.7,-.3],[.35,1.64,-.3],.04,0x886037);
  rod(root,"yard",[.28,1.45,-.3],[1.04,1.45,-.3],.035,0xd8b066);
  plate(root,"banner.swallowtail",[[.4,1.41],[1.03,1.41],[1.03,.29],[.73,.54],[.4,.29]],0xa83e4b,.035,-.3);
  plate(root,"banner.compass",[[.71,1.25],[.77,1.01],[.94,.92],[.77,.85],[.71,.63],[.65,.85],[.48,.92],[.65,1.01]],0xf0cf8b,.018,-.275);
  part(root,"mast.finial",new THREE.OctahedronGeometry(.13),0xd8b066,[.35,1.69,-.3],[.7,1.5,.7]);
  return root;
}

export function createHarborLantern(): THREE.Group {
  const root=gearRoot("accessory.harbor-lantern","hand.L");
  ring(root,"grip",.2,.028,0x9c7546,[0,-.19,0]);
  part(root,"lantern.roof",new THREE.ConeGeometry(.33,.2,6),0x497a7c,[0,-.46,0]);
  part(root,"lantern.base",new THREE.CylinderGeometry(.28,.25,.1,6),0x497a7c,[0,-.99,0]);
  const light=part(root,"lantern.amber",new THREE.CylinderGeometry(.18,.18,.39,6),0xffd083,[0,-.73,0]);
  (light.material as THREE.MeshStandardMaterial).emissive.setHex(0x9c4e16);
  (light.material as THREE.MeshStandardMaterial).emissiveIntensity=.55;
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3,x=Math.cos(a)*.25,z=Math.sin(a)*.25;
    rod(root,`cage.${i}`,[x,-.52,z],[x,-.95,z],.021,0x9c7546);
  }
  return root;
}

export const DISTINCT_ACCESSORY_FACTORIES = {
  "accessory.kite-shield":createKiteShield,
  "accessory.expedition-pack":createExpeditionPack,
  "accessory.astral-orbit":createAstralOrbit,
  "accessory.signal-banner":createSignalBanner,
  "accessory.harbor-lantern":createHarborLantern,
} as const;

export const ACCESSORY_SOCKETS = {
  "accessory.kite-shield":"hand.L", "accessory.expedition-pack":"back",
  "accessory.astral-orbit":"back", "accessory.signal-banner":"back",
  "accessory.harbor-lantern":"hand.L",
} as const;
