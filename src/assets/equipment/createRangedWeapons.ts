import * as THREE from "three";
import { RANGED_WEAPON_DEFINITIONS, type RangedWeaponId } from "../../domain/rangedWeapons";
import { gearRoot, part, plate, ring, rod, type Point } from "./gearGeometry";

/** Grip is (0,0,0). +Y is up; +Z is the firing/front direction, string draws toward -Z. */
export function createPlayableStaff(index: number): THREE.Group {
  const definition = RANGED_WEAPON_DEFINITIONS[index];
  const root = gearRoot(definition.id, "hand.R");
  root.userData.weaponKind = "staff";
  root.userData.equipmentContract = { gripOrigin: [0,0,0], upAxis: "+Y", forwardAxis: "+Z" };
  const shaftColors = [0x715036,0x51416b,0xa8792d,0x426349,0x7497ae,0x45342a,0x293962,0x316e80,0x252539,0x654730];
  const accentColors = [0x71d5ff,0xc4bcff,0xffcd51,0x81df9c,0xb4efff,0xff933d,0xb49aff,0x7ae8df,0xd682e8,0xf4bf70];
  const accent = accentColors[index];
  rod(root,"staff.shaft",[0,-1.15,0],[0,1.26,0],.058,shaftColors[index]);
  part(root,"staff.grip",new THREE.CylinderGeometry(.074,.074,.42,10),0x3b2a30);
  for (const y of [-.27,.27,1.12]) ring(root,"staff.band."+y,.072,.023,0xc9ad6b,[0,y,0],true);
  part(root,"staff.foot",new THREE.ConeGeometry(.09,.2,8),0xb7a482,[0,-1.2,0]).rotation.z=Math.PI;
  const focus = new THREE.Group(); focus.name="staff.focus"; focus.position.y=1.65; root.add(focus);
  const gem = (name: string, at: Point, scale: Point = [1,1,1]) => {
    const node=part(root,name,new THREE.OctahedronGeometry(.22),accent,at,scale,true);
    (node.material as THREE.MeshStandardMaterial).emissive.setHex(accent);
    (node.material as THREE.MeshStandardMaterial).emissiveIntensity=.28;
    return node;
  };
  switch(index) {
    case 0:
      gem("staff.crystal",[0,1.65,0],[1,1.65,1]);
      for(const sign of [-1,1]) rod(root,"staff.cradle."+sign,[0,1.16,0],[sign*.24,1.56,0],.045,0xd2b978);
      break;
    case 1:
      plate(root,"staff.crescent",[[-.1,1.19],[-.4,1.4],[-.43,1.82],[-.19,2.05],[-.26,1.72],[-.13,1.5],[.15,1.48],[.37,1.68],[.31,1.32],[.1,1.2]],0xc0c5e7,.1);
      gem("staff.moon",[0,1.72,0],[.7,.7,.7]); break;
    case 2:
      ring(root,"staff.sun-disc",.32,.065,0xe9b850,[0,1.65,0]);
      gem("staff.sun-core",[0,1.65,0]);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(root,"staff.sun-ray."+i,[Math.sin(a)*.39,1.65+Math.cos(a)*.39,0],[Math.sin(a)*.55,1.65+Math.cos(a)*.55,0],.04,0xe6bd59);} break;
    case 3:
      for(const sign of [-1,1]) {
        rod(root,"staff.branch."+sign,[0,1.14,0],[sign*.37,1.88,0],.05,0x625138);
        plate(root,"staff.leaf."+sign,[[sign*.22,1.5],[sign*.61,1.8],[sign*.42,1.96],[sign*.23,1.73]],0x68a96b,.045);
      } gem("staff.seed",[0,1.63,0],[.65,1.2,.65]); break;
    case 4:
      for(const sign of [-1,0,1]) gem("staff.ice-spire."+sign,[sign*.23,1.55+(.2*(1-Math.abs(sign))),0],[.5,sign===0?2:1.2,.65]).rotation.z=-sign*.3;
      break;
    case 5:
      gem("staff.ember",[0,1.63,0]);
      for(const x of [-.25,.25]) for(const z of [-.2,.2]) rod(root,`staff.cage.${x}.${z}`,[x,1.25,z],[x,1.98,z],.025,0x544b4b);
      for(const y of [1.25,1.98]) part(root,"staff.cage-cap."+y,new THREE.BoxGeometry(.58,.09,.48),0x8f6c40,[0,y,0]); break;
    case 6:
      gem("staff.star-core",[0,1.65,0]);
      for(let i=0;i<3;i++){const orbit=ring(root,"staff.orbit."+i,.38+i*.055,.025,0xceb8ed,[0,1.65,0]);orbit.rotation.set(i*.7,i*.9,.3);} break;
    case 7:
      for(const sign of [-1,0,1]) {
        const x=sign*.3; rod(root,"staff.tine."+sign,[0,1.1,0],[x,1.4,0],.035,0x71b9b5);
        rod(root,"staff.tine-tip."+sign,[x,1.4,0],[x,sign===0?2.06:1.86,0],.04,0x71b9b5);
      } gem("staff.pearl",[0,1.52,.08],[.7,.7,.7]); break;
    case 8:
      gem("staff.raven-core",[0,1.65,0],[.7,1.2,.7]);
      for(const sign of [-1,1]) plate(root,"staff.raven-wing."+sign,[[0,1.24],[sign*.3,1.42],[sign*.58,1.94],[sign*.29,1.76],[sign*.31,2.03],[sign*.08,1.82]],0x3b344d,.09); break;
    case 9:
      ring(root,"staff.gear",.31,.075,0xc19651,[0,1.65,0]);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;const tooth=part(root,"staff.gear-tooth."+i,new THREE.BoxGeometry(.12,.19,.16),0xb7894c,[Math.sin(a)*.36,1.65+Math.cos(a)*.36,0]);tooth.rotation.z=-a;}
      gem("staff.engine",[0,1.65,0],[.6,.6,.6]);
      rod(root,"staff.axle",[-.28,1.65,0],[.28,1.65,0],.035,0x694a30); break;
  }
  return root;
}

function bowPath(index: number, sign: number): Point[] {
  const shapes: readonly (readonly [number,number])[][] = [
    [[.06,.22],[.17,.62],[.14,1.1],[0,1.42]],
    [[.08,.23],[.3,.63],[.26,1.05],[.08,1.3],[0,1.22]],
    [[.03,.22],[.2,.55],[.13,.88],[.05,1.28]],
    [[.08,.21],[.29,.57],[.19,.94],[0,1.22]],
    [[.05,.24],[.31,.53],[.16,.78],[.28,1.05],[0,1.26]],
    [[.06,.23],[.24,.42],[.25,.91],[0,1.15]],
    [[.08,.22],[.3,.47],[.08,.75],[.25,1.04],[0,1.29]],
    [[.06,.23],[.34,.37],[.13,.62],[.31,.83],[0,1.1]],
    [[.05,.24],[.2,.52],[.24,.82],[0,1.3]],
    [[.05,.24],[.3,.57],[.16,.94],[0,1.23]],
  ];
  return [[0,0,0],...shapes[index].map(([z,y]): Point=>[0,sign*y,z])];
}

export function createPlayableBow(index: number): THREE.Group {
  const root=gearRoot(RANGED_WEAPON_DEFINITIONS[index+10].id,"hand.L");
  root.userData.weaponKind="bow";
  root.userData.equipmentContract={gripOrigin:[0,0,0],upAxis:"+Y",forwardAxis:"+Z"};
  const colors=[0x88603c,0xb0b7d8,0x607349,0xd5a84d,0x9ccfdf,0x96774f,0x477e6a,0x7294c7,0x735745,0x353347];
  const accents=[0xe1c28a,0xb8a3f2,0x9acb6b,0xffda79,0xc8f5ff,0xc8a36a,0xceb86f,0xc1e7ff,0xd77b9e,0xc56d90];
  const color=colors[index],accent=accents[index];
  part(root,"bow.grip",new THREE.CylinderGeometry(.065,.065,.38,10),0x3b2c34);
  for(const sign of [-1,1]) {
    const path=bowPath(index,sign);
    const curve=new THREE.CatmullRomCurve3(path.map(point=>new THREE.Vector3(...point)));
    part(root,"bow.limb."+sign,new THREE.TubeGeometry(curve,24,index===3||index===9?.055:.043,8,false),color);
    const tip = new THREE.Group(); tip.name=sign===1?"bow.tip.upper":"bow.tip.lower";
    tip.position.copy(new THREE.Vector3(...path[path.length-1])); root.add(tip);
    const string=part(root,sign===1?"bow.string.upper":"bow.string.lower",new THREE.CylinderGeometry(.009,.009,1,5),0xe8dcc5);
    string.userData.tip=tip.position.toArray();
    if(index===2) for(const j of [0,1]) rod(root,`bow.antler.${sign}.${j}`,[0,sign*(.56+j*.23),.17],[sign*(.2+j*.09),sign*(.76+j*.23),.2],.027,color);
    if(index===3||index===9) for(let j=0;j<3;j++) {
      const fin=plate(root,`bow.${index===3?"sunwing":"raven"}-feather.${sign}.${j}`,[[0,sign*(.35+j*.19)],[.3,sign*(.57+j*.21)],[.09,sign*(.64+j*.19)],[0,sign*(.56+j*.19)]],index===3?accent:0x4b405d,.05);
      fin.rotation.y=Math.PI/2;
    }
    if(index===4) for(let j=0;j<2;j++) part(root,`bow.ice.${sign}.${j}`,new THREE.OctahedronGeometry(.15),accent,[0,sign*(.6+j*.3),.2],[.6,1.7,.6],true);
    if(index===5) {
      const cam=ring(root,"bow.cam."+sign,.16,.035,accent,[0,sign*1.02,.03]);cam.rotation.y=Math.PI/2;
      rod(root,"bow.brace."+sign,[0,sign*.3,0],[0,sign*.92,.14],.024,0x4b4b4b);
    }
    if(index===6) part(root,"bow.serpent-head."+sign,new THREE.SphereGeometry(.11,10,8),accent,[0,sign*1.21,.06],[.7,1.5,1]);
    if(index===7) {
      const bolt=plate(root,"bow.lightning."+sign,[[0,sign*.3],[.23,sign*.53],[.05,sign*.58],[.27,sign*.85],[.04,sign*.76]],accent,.05);bolt.rotation.y=Math.PI/2;
    }
    if(index===8) {
      for(let j=0;j<3;j++) rod(root,`bow.thorn.${sign}.${j}`,[0,sign*(.46+j*.2),.2],[.12,sign*(.55+j*.2),.27],.019,0x537350);
      for(let j=0;j<5;j++) { const a=j*Math.PI*2/5;part(root,`bow.rose.${sign}.${j}`,new THREE.SphereGeometry(.07,8,6),accent,[Math.sin(a)*.06,sign*.85+Math.cos(a)*.06,.24],[1,1,.6]); }
    }
    if(index===1) ring(root,"bow.moon."+sign,.11,.027,accent,[0,sign*.65,.28]).rotation.y=Math.PI/2;
  }
  const nock=new THREE.Group();nock.name="bow.nock";nock.position.z=-.16;root.add(nock);
  const arrow=new THREE.Group();arrow.name="bow.arrow";root.add(arrow);
  rod(arrow,"arrow.shaft",[0,0,0],[0,0,1.16],.014,0xc3a075);
  const head=part(arrow,"arrow.head",new THREE.ConeGeometry(.045,.18,4),0xd5e4e6,[0,0,1.2]);head.rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){const feather=part(arrow,"arrow.fletching."+i,new THREE.BoxGeometry(.006,.095,.16),accent,[0,0,.1]);feather.rotation.z=i*Math.PI*2/3;}
  updateBowDraw(root,0);
  arrow.visible=false;
  return root;
}

/** Repositions both string segments and the nocked arrow. draw is normalized 0..1. */
export function updateBowDraw(root: THREE.Group, draw: number, arrowVisible=true): void {
  const nock=root.getObjectByName("bow.nock");
  if(!nock)return;
  nock.position.z=-.16-THREE.MathUtils.clamp(draw,0,1)*.65;
  for(const name of ["bow.string.upper","bow.string.lower"]) {
    const segment=root.getObjectByName(name);
    if(!segment)return;
    const tip=new THREE.Vector3(...segment.userData.tip as [number,number,number]);
    const delta=tip.clone().sub(nock.position);
    segment.position.copy(tip.add(nock.position).multiplyScalar(.5));
    segment.scale.y=delta.length();
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  const arrow=root.getObjectByName("bow.arrow");
  if(arrow){arrow.position.copy(nock.position);arrow.visible=arrowVisible;}
}

export const RANGED_WEAPON_FACTORIES: Readonly<Record<RangedWeaponId,()=>THREE.Group>> = Object.fromEntries(
  RANGED_WEAPON_DEFINITIONS.map((item,index)=>[item.id,()=>index<10?createPlayableStaff(index):createPlayableBow(index-10)]),
) as Record<RangedWeaponId,()=>THREE.Group>;
