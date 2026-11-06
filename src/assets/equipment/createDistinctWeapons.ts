import * as THREE from "three";
import { gearRoot, part, plate, ring, rod } from "./gearGeometry";

/** Every weapon has its grip at (0,0,0); +Y points toward the tip and +Z is the broad front face. */
function sword(id: string, gripColor: number): THREE.Group {
  const root = gearRoot(id, "hand.R");
  root.userData.equipmentContract = { gripOrigin: [0, 0, 0], bladeAxis: "+Y", frontAxis: "+Z", dispose: "deep-geometry-and-materials" };
  part(root, "grip", new THREE.CylinderGeometry(0.07, 0.08, 0.48, 8), gripColor);
  return root;
}

export function createSunfangSaber(): THREE.Group {
  const root = sword("weapon.sunfang-saber", 0x803d26);
  plate(root, "blade.sweeping-sunfang", [[-.1,.25],[-.08,.85],[.08,1.45],[.37,1.94],[.64,2.08],[.43,1.57],[.29,.93],[.15,.27]], 0xf1c773);
  rod(root, "guard.knuckle.lower", [.05,-.24,0], [.39,-.12,0], .045, 0xba7f31);
  rod(root, "guard.knuckle.upper", [.39,-.12,0], [.34,.29,0], .045, 0xba7f31);
  rod(root, "guard.cross", [-.27,.27,0], [.35,.27,0], .045, 0xba7f31);
  part(root, "pommel.sun", new THREE.SphereGeometry(.11, 10, 6), 0xe3a936, [0,-.3,0], [1,.7,1], true);
  return root;
}

export function createEstoc(): THREE.Group {
  const root = sword("weapon.estoc", 0x243a55);
  plate(root, "blade.diamond-needle", [[-.065,.24],[-.045,1.92],[0,2.27],[.045,1.92],[.065,.24]], 0xd9e5ed, .09);
  ring(root, "guard.swept-basket", .25, .028, 0xc6b894, [0,.13,0]).rotation.y = Math.PI / 2;
  rod(root, "guard.cross", [-.38,.25,0], [.38,.25,0], .025, 0xc6b894);
  part(root, "pommel.counterweight", new THREE.CylinderGeometry(.08,.11,.2,8), 0xc6b894, [0,-.34,0], [1,1,1], true);
  return root;
}

export function createSawtoothCleaver(): THREE.Group {
  const root = sword("weapon.sawtooth-cleaver", 0x583e32);
  plate(root, "blade.square-cleaver", [[-.23,.26],[-.34,1.57],[-.22,1.83],[.33,1.83],[.33,.33]], 0x6b7881, .13);
  for (let i = 0; i < 5; i++) {
    const y = .44 + i * .23;
    plate(root, `blade.tooth.${i}`, [[.3,y],[.52,y+.15],[.3,y+.2]], 0xd1d5cd, .1);
  }
  part(root, "guard.industrial", new THREE.BoxGeometry(.7,.13,.22), 0xbd7839, [0,.25,0], [1,1,1], true);
  for (const y of [.53,1.42]) part(root,"blade.rivet."+y,new THREE.CylinderGeometry(.06,.06,.16,8),0xe5ba68,[-.16,y,0]).rotation.x=Math.PI/2;
  part(root, "pommel.block", new THREE.BoxGeometry(.2,.17,.18), 0x6b7881, [0,-.32,0]);
  return root;
}

export function createCrescentShotel(): THREE.Group {
  const root = sword("weapon.crescent-shotel", 0x3e6c64);
  plate(root,"blade.deep-hook", [[-.08,.23],[-.29,.74],[-.31,1.32],[-.14,1.81],[.24,2.05],[.65,1.96],[.31,1.79],[.12,1.5],[.09,1.06],[.19,.61],[.12,.24]], 0x95c8bd, .075);
  plate(root,"guard.crescent", [[-.36,.21],[-.23,.39],[0,.32],[.25,.43],[.36,.26],[.02,.2]], 0xddc389, .1);
  ring(root,"pommel.open-ring",.12,.036,0xddc389,[0,-.33,0]);
  return root;
}

export function createCrystalFlamberge(): THREE.Group {
  const root = sword("weapon.crystal-flamberge", 0x40325d);
  plate(root,"blade.wave", [[-.1,.27],[-.2,.55],[-.06,.84],[-.2,1.14],[-.07,1.44],[-.16,1.71],[0,2.13],[.15,1.75],[.06,1.48],[.2,1.18],[.07,.88],[.2,.58],[.1,.27]],0xaf92df,.11);
  for (const sign of [-1,1]) {
    const crystal = part(root,`guard.crystal.${sign}`,new THREE.OctahedronGeometry(.23),0x86ebdf,[sign*.25,.27,0],[.6,1.5,.6],true);
    crystal.rotation.z = -sign*.7;
  }
  part(root,"pommel.amethyst",new THREE.OctahedronGeometry(.14),0xb1a0ec,[0,-.34,0],[1,1.4,1],true);
  return root;
}

export const DISTINCT_WEAPON_FACTORIES = {
  "weapon.sunfang-saber": createSunfangSaber,
  "weapon.estoc": createEstoc,
  "weapon.sawtooth-cleaver": createSawtoothCleaver,
  "weapon.crescent-shotel": createCrescentShotel,
  "weapon.crystal-flamberge": createCrystalFlamberge,
} as const;
