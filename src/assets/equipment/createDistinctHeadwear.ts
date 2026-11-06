import * as THREE from "three";
import { gearRoot, part, plate, ring, rod } from "./gearGeometry";

/** Head origin is the face center; +Y is up, +Z faces forward. */
export function createWitchHat(): THREE.Group {
  const root=gearRoot("head.witch-hat","head");
  part(root,"brim.wide",new THREE.CylinderGeometry(.88,.86,.065,24),0x362b58,[0,.48,0],[1,1,.84]);
  const crown=part(root,"crown.leaning",new THREE.ConeGeometry(.48,1.05,12),0x58417c,[.1,1,0]); crown.rotation.z=-.19;
  ring(root,"band.gold",.46,.045,0xd5a967,[0,.56,0],true);
  part(root,"charm.star",new THREE.OctahedronGeometry(.13),0xf1d47c,[-.48,.37,.48],[1,1,.35]);
  return root;
}

export function createAntlerCrown(): THREE.Group {
  const root=gearRoot("head.antler-crown","head");
  ring(root,"circlet.vine",.5,.035,0x658057,[0,.43,0],true);
  for(const sign of [-1,1]) {
    rod(root,`antler.stem.${sign}`,[sign*.43,.48,0],[sign*.75,1.2,-.12],.045,0xc7b48f);
    rod(root,`antler.tip.${sign}`,[sign*.75,1.2,-.12],[sign*.91,1.42,-.1],.027,0xc7b48f);
    rod(root,`antler.fork.${sign}`,[sign*.58,.84,-.06],[sign*.93,1.04,.06],.03,0xc7b48f);
    rod(root,`antler.inner.${sign}`,[sign*.71,1.12,-.1],[sign*.49,1.4,-.02],.027,0xc7b48f);
    part(root,`leaf.${sign}`,new THREE.OctahedronGeometry(.17),0x75985a,[sign*.38,.49,.3],[1.3,.5,.4]).rotation.z=sign*.4;
  }
  return root;
}

export function createDivingHelm(): THREE.Group {
  const root=gearRoot("head.diving-helm","head");
  // Rear and upper shell leave an actual open face window, rather than painting over the face.
  part(root,"shell.rear",new THREE.SphereGeometry(.66,18,12,Math.PI,Math.PI),0xb3874a,[0,.13,0],[1,1,.95],true);
  ring(root,"collar",.53,.085,0x77572f,[0,-.27,0],true);
  ring(root,"porthole.rim",.42,.075,0xe5ba73,[0,.12,.55]);
  for(const x of [-.23,0,.23]) rod(root,`porthole.bar.${x}`,[x,-.2,.59],[x,.44,.59],.018,0x685439);
  part(root,"air.valve",new THREE.CylinderGeometry(.11,.11,.2,8),0x567c7b,[.68,.06,0]).rotation.z=Math.PI/2;
  return root;
}

export function createKitsuneMask(): THREE.Group {
  const root=gearRoot("head.kitsune-mask","head");
  plate(root,"mask.fox",[[-.39,.21],[-.34,.63],[-.12,.43],[.12,.43],[.34,.63],[.39,.21],[.23,-.17],[0,-.32],[-.23,-.17]],0xf4e7cf,.07,.59);
  for(const sign of [-1,1]) {
    plate(root,`eye.slit.${sign}`,[[sign*.08,.17],[sign*.3,.24],[sign*.22,.09]],0x963b3e,.016,.645);
    plate(root,`cheek.mark.${sign}`,[[sign*.12,-.02],[sign*.3,.01],[sign*.18,-.12]],0xc95045,.016,.645);
  }
  part(root,"nose",new THREE.OctahedronGeometry(.07),0x352b31,[0,-.12,.69],[1,.65,.5]);
  return root;
}

export function createPhoenixCrest(): THREE.Group {
  const root=gearRoot("head.phoenix-crest","head");
  ring(root,"circlet.copper",.5,.045,0xb56b33,[0,.4,0],true);
  for(let i=0;i<7;i++) {
    const angle=(i-3)*.23;
    const feather=plate(root,`crest.feather.${i}`,[[-.065,0],[-.1,.37],[0,.65],[.09,.35],[.04,0]],i%2?0xf4bd48:0xc95134,.045,-.06);
    feather.position.x=Math.sin(angle)*.28; feather.position.y=.48; feather.rotation.z=-angle;
  }
  plate(root,"brow.wings",[[-.48,.43],[-.2,.59],[0,.48],[.2,.59],[.48,.43],[.2,.36],[0,.4],[-.2,.36]],0xe8b34c,.04,.36);
  return root;
}

export function createDesertTurban(): THREE.Group {
  const root=gearRoot("head.desert-turban","head");
  part(root,"crown.wrapped",new THREE.SphereGeometry(.55,16,10,0,Math.PI*2,0,Math.PI*.6),0xddcbb2,[0,.42,0],[1.1,.66,1]);
  for(let i=0;i<3;i++) { const wrap=ring(root,`wrap.${i}`,.5-i*.035,.065, i%2?0xa7754b:0xe4d3b8,[0,.46+i*.09,0],true); wrap.rotation.z=(i-1)*.1; }
  plate(root,"scarf.tail",[[.42,.44],[.59,.36],[.57,-.65],[.39,-.86],[.38,-.28]],0xa7754b,.045,-.18);
  part(root,"brow.jewel",new THREE.OctahedronGeometry(.11),0x309e9d,[0,.49,.53],[1,1.2,.5],true);
  return root;
}

export function createEngineerGoggles(): THREE.Group {
  const root=gearRoot("head.engineer-goggles","head");
  ring(root,"strap",.51,.045,0x614636,[0,.19,0],true);
  for(const sign of [-1,1]) {
    ring(root,`lens.rim.${sign}`,.17,.045,0xb28b49,[sign*.22,.19,.51]);
    part(root,`lens.glass.${sign}`,new THREE.CylinderGeometry(.15,.15,.04,16),0x79b5bb,[sign*.22,.19,.54],[1,1,1],true).rotation.x=Math.PI/2;
  }
  rod(root,"bridge",[-.08,.21,.56],[.08,.21,.56],.03,0xb28b49);
  part(root,"loupe.arm",new THREE.BoxGeometry(.08,.25,.06),0xb28b49,[.43,.33,.46]);
  ring(root,"loupe",.1,.025,0xb28b49,[.43,.48,.49]);
  return root;
}

export function createLotusTiara(): THREE.Group {
  const root=gearRoot("head.lotus-tiara","head");
  ring(root,"band.silver",.49,.026,0xc5d6d8,[0,.4,0],true);
  for(let i=0;i<5;i++) {
    const angle=(i-2)*.4;
    const petal=plate(root,`lotus.petal.${i}`,[[0,0],[-.105,.16],[0,.42],[.105,.16]],i%2?0xc988bf:0xf0bfd8,.035,.44);
    petal.position.set(Math.sin(angle)*.13,.43,.44); petal.rotation.z=-angle;
  }
  part(root,"lotus.pearl",new THREE.SphereGeometry(.08,10,8),0xf7e5c4,[0,.48,.51]);
  return root;
}

export function createSamuraiKabuto(): THREE.Group {
  const root=gearRoot("head.samurai-kabuto","head");
  part(root,"dome.lacquer",new THREE.SphereGeometry(.58,12,8,0,Math.PI*2,0,Math.PI/2),0x343b4c,[0,.35,0],[1,.8,1]);
  for(let i=0;i<3;i++) for(const sign of [-1,1]) {
    part(root,`neck.lamella.${sign}.${i}`,new THREE.BoxGeometry(.22,.12,.7),i%2?0x713e43:0x343b4c,[sign*(.49+i*.035),.3-i*.12,-.05]).rotation.z=sign*.25;
  }
  plate(root,"crest.golden-crescent",[[-.52,.85],[-.28,.58],[0,.53],[.28,.58],[.52,.85],[.4,.48],[0,.35],[-.4,.48]],0xd5ad58,.065,.4);
  return root;
}

export function createMushroomCap(): THREE.Group {
  const root=gearRoot("head.mushroom-cap","head");
  part(root,"cap.red-dome",new THREE.SphereGeometry(.84,20,10,0,Math.PI*2,0,Math.PI/2),0xb95347,[0,.43,0],[1,.61,1]);
  part(root,"cap.gills",new THREE.CylinderGeometry(.79,.62,.07,24),0xe9d3aa,[0,.42,0]);
  for(let i=0;i<7;i++) {
    const angle=i*2.4, radius=.24+(i%3)*.16;
    part(root,`cap.spot.${i}`,new THREE.SphereGeometry(.09+(i%2)*.03,8,6),0xf3dfbd,
      [Math.cos(angle)*radius,.44+.5*Math.sqrt(1-radius*radius/(.84*.84)),Math.sin(angle)*radius],[1,.22,1]);
  }
  return root;
}

export const DISTINCT_HEAD_FACTORIES = {
  "head.witch-hat":createWitchHat, "head.antler-crown":createAntlerCrown,
  "head.diving-helm":createDivingHelm, "head.kitsune-mask":createKitsuneMask,
  "head.phoenix-crest":createPhoenixCrest, "head.desert-turban":createDesertTurban,
  "head.engineer-goggles":createEngineerGoggles, "head.lotus-tiara":createLotusTiara,
  "head.samurai-kabuto":createSamuraiKabuto, "head.mushroom-cap":createMushroomCap,
} as const;
