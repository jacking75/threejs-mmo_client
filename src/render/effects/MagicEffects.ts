import * as THREE from "three";

export const MAGIC_EFFECT_IDS: Readonly<Record<string, string>> = {
  "weapon.apprentice-staff": "arcane-resonance",
  "weapon.crescent-staff": "crescent-vortex",
  "weapon.sun-oracle-staff": "solar-judgment",
  "weapon.verdant-staff": "verdant-spiral",
  "weapon.frost-spire-staff": "glacial-lances",
  "weapon.ember-cage-staff": "ember-eruption",
  "weapon.astral-staff": "astral-comet",
  "weapon.tidal-staff": "tidal-trinity",
  "weapon.raven-staff": "raven-eclipse",
  "weapon.clockwork-staff": "clockwork-cascade",
};

type Theme = "arcane" | "moon" | "sun" | "nature" | "ice" | "fire" | "star" | "water" | "raven" | "gear";
const THEMES: readonly Theme[] = ["arcane", "moon", "sun", "nature", "ice", "fire", "star", "water", "raven", "gear"];
const PALETTES: Record<Theme, readonly [number, number, number]> = {
  arcane: [0x52cfff, 0xc7efff, 0x588cff], moon: [0x9282ff, 0xe8e6ff, 0x6b48d8],
  sun: [0xffbe35, 0xffffc3, 0xff6b19], nature: [0x53e98b, 0xd8ff86, 0x23b8a0],
  ice: [0x71ddff, 0xf1ffff, 0x6292ff], fire: [0xff7928, 0xffe4a3, 0xdc2828],
  star: [0xad7bff, 0xffe2ff, 0x57bfff], water: [0x28c6d9, 0xc3ffff, 0x347bff],
  raven: [0xbd58ed, 0xedb5ff, 0x632dab], gear: [0xffb549, 0xffedb0, 0x46efdb],
};

interface Particle { readonly mesh: THREE.Mesh; readonly angle: number; readonly ring: number; }

/** Original procedural spell art. Local +Y is up and +Z is the casting direction. */
export class MagicEffects {
  public readonly group = new THREE.Group();
  private readonly ground = new THREE.Group();
  private readonly charge = new THREE.Group();
  private readonly projectile = new THREE.Group();
  private readonly burst = new THREE.Group();
  private readonly rings: THREE.Mesh[] = [];
  private readonly motes: Particle[] = [];
  private readonly debris: Particle[] = [];
  private readonly trails: THREE.Mesh[] = [];
  private readonly theme: Theme;
  private readonly materials: THREE.MeshBasicMaterial[] = [];
  private readonly groundMaterial: THREE.MeshBasicMaterial;
  private readonly chargeMaterial: THREE.MeshBasicMaterial;
  private readonly shotMaterial: THREE.MeshBasicMaterial;
  private readonly coreMaterial: THREE.MeshBasicMaterial;
  private readonly burstMaterial: THREE.MeshBasicMaterial;
  private readonly haloMaterial: THREE.MeshBasicMaterial;
  private readonly muzzle = new THREE.Vector3();
  private readonly glows: THREE.SpriteMaterial[] = [];
  private readonly glowTexture = createGlowTexture();
  private disposed = false;

  public constructor(itemId: string) {
    const index = Object.keys(MAGIC_EFFECT_IDS).indexOf(itemId);
    this.theme = THEMES[Math.max(0, index)];
    const [color, core, accent] = PALETTES[this.theme];
    this.group.name = `magic.${MAGIC_EFFECT_IDS[itemId] ?? "arcane-resonance"}`;
    this.group.userData.effectId = MAGIC_EFFECT_IDS[itemId] ?? "arcane-resonance";
    this.group.userData.itemId = itemId;
    this.groundMaterial = this.material(color, 0.65);
    this.chargeMaterial = this.material(accent, 0.85);
    this.shotMaterial = this.material(color, 0.95);
    this.coreMaterial = this.material(core, 1, true);
    this.burstMaterial = this.material(color, 0.85);
    this.haloMaterial = this.material(core, 0.4, true);
    this.ground.name = "magic.casting-circle";
    this.charge.name = "magic.charge";
    this.projectile.name = `magic.projectile.${this.theme}`;
    this.burst.name = `magic.burst.${this.theme}`;
    this.group.add(this.ground, this.charge, this.projectile, this.burst);
    this.buildCircle();
    this.buildCharge();
    this.buildProjectile();
    this.buildBurst();
    this.glow(this.charge, color, 2.6);
    this.glow(this.projectile, color, this.theme === "sun" ? 2.7 : 3.1);
    this.glow(this.burst, color, 3.5);
    this.update(-1, this.muzzle);
  }

  private material(color: number, opacity: number, additive = false): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity,
      depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false });
    this.materials.push(material);
    return material;
  }

  private mesh(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const result = new THREE.Mesh(geometry, material);
    result.name = name;
    parent.add(result);
    return result;
  }

  private ring(parent: THREE.Group, radius: number, material: THREE.Material, tube = 0.035): THREE.Mesh {
    return this.mesh(parent, "magic.ring", new THREE.TorusGeometry(radius, tube, 5, 48), material);
  }

  private glow(parent: THREE.Group, color: number, size: number): void {
    const material = new THREE.SpriteMaterial({ map: this.glowTexture, color, transparent: true,
      opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.glows.push(material);
    const sprite = new THREE.Sprite(material);
    sprite.name = "magic.soft-aura";
    sprite.scale.set(size, size, 1);
    parent.add(sprite);
  }

  private buildCircle(): void {
    this.ground.position.y = 0.08;
    this.ground.rotation.x = -Math.PI / 2;
    for (const radius of [1.25, 1.7, 1.83]) this.ring(this.ground, radius, this.groundMaterial, 0.025);
    const sides = this.theme === "gear" ? 12 : this.theme === "ice" ? 6 : 8;
    for (let i = 0; i < sides; i += 1) {
      const angle = i / sides * Math.PI * 2;
      const rune = this.mesh(this.ground, `magic.rune.${i}`, new THREE.RingGeometry(0.1, 0.14, this.theme === "moon" ? 3 : 4), this.groundMaterial);
      rune.position.set(Math.cos(angle) * 1.47, Math.sin(angle) * 1.47, 0);
      rune.rotation.z = angle + Math.PI / 4;
      const spoke = this.mesh(this.ground, "magic.sigil-line", new THREE.PlaneGeometry(0.025, 0.62), this.groundMaterial);
      spoke.position.set(Math.cos(angle) * 0.86, Math.sin(angle) * 0.86, 0);
      spoke.rotation.z = angle - Math.PI / 2;
    }
  }

  private buildCharge(): void {
    for (let i = 0; i < 3; i += 1) {
      const ring = this.ring(this.charge, 0.52 + i * 0.2, this.chargeMaterial, 0.025);
      ring.rotation.set(i * Math.PI / 3, i * Math.PI / 4, 0);
      this.rings.push(ring);
    }
    for (let i = 0; i < 18; i += 1) {
      const mote = this.mesh(this.charge, `magic.gathering.${i}`, this.particleGeometry(i), i % 3 === 0 ? this.coreMaterial : this.chargeMaterial);
      this.motes.push({ mesh: mote, angle: i * 2.39996, ring: 0.5 + i % 4 * 0.2 });
    }
  }

  private particleGeometry(index: number): THREE.BufferGeometry {
    if (this.theme === "nature") return leafGeometry();
    if (this.theme === "raven") return featherGeometry();
    if (this.theme === "ice") return new THREE.OctahedronGeometry(0.13, 0);
    if (this.theme === "star") return starGeometry(0.17, 0.065, 5);
    if (this.theme === "fire") return new THREE.ConeGeometry(0.1, 0.3, 5);
    if (this.theme === "water") return new THREE.SphereGeometry(0.095, 7, 5);
    if (this.theme === "gear") return new THREE.BoxGeometry(0.08, 0.17, 0.045);
    return new THREE.OctahedronGeometry(index % 3 === 0 ? 0.11 : 0.07, 0);
  }

  private buildProjectile(): void {
    const add = (name: string, geo: THREE.BufferGeometry, material = this.shotMaterial) => this.mesh(this.projectile, name, geo, material);
    switch (this.theme) {
      case "arcane": {
        add("arcane.core", new THREE.IcosahedronGeometry(0.47, 1), this.coreMaterial);
        for (let i = 0; i < 3; i += 1) this.ring(this.projectile, 0.75, this.shotMaterial).rotation.set(i * Math.PI / 3, Math.PI / 3, 0);
        break;
      }
      case "moon": {
        add("moon.crescent", crescentGeometry(), this.coreMaterial).scale.setScalar(1.45);
        for (let i = 0; i < 2; i += 1) this.ring(this.projectile, 0.8 + i * 0.3, this.shotMaterial, 0.055).rotation.y = Math.PI / 3;
        break;
      }
      case "sun": {
        const beam = add("sun.beam", new THREE.CylinderGeometry(0.22, 0.42, 11.5, 12), this.coreMaterial);
        beam.rotation.x = Math.PI / 2;
        beam.position.z = 5.75;
        const aura = add("sun.beam-aura", new THREE.CylinderGeometry(0.45, 0.75, 11.5, 12), this.shotMaterial);
        aura.rotation.x = Math.PI / 2;
        aura.position.z = 5.75;
        for (let i = 0; i < 4; i += 1) this.ring(this.projectile, 0.72 + i * 0.08, this.shotMaterial, 0.05).position.z = i * 3;
        break;
      }
      case "nature": {
        for (let i = 0; i < 3; i += 1) {
          const vine = add("nature.vine", helixGeometry(i * Math.PI * 2 / 3), this.shotMaterial);
          vine.position.z = -1.4;
        }
        add("nature.seed", new THREE.IcosahedronGeometry(0.34, 0), this.coreMaterial);
        break;
      }
      case "ice": {
        for (let i = 0; i < 3; i += 1) {
          const lance = add("ice.lance", new THREE.OctahedronGeometry(0.34, 0), this.coreMaterial);
          lance.scale.set(0.7, 0.7, 4.3);
          lance.position.set((i - 1) * 0.58, Math.abs(i - 1) * 0.35, -Math.abs(i - 1) * 0.8);
        }
        this.ring(this.projectile, 1, this.shotMaterial, 0.035);
        break;
      }
      case "fire": {
        const fireball = add("fire.heart", new THREE.IcosahedronGeometry(0.64, 1), this.coreMaterial);
        fireball.scale.z = 1.3;
        for (let i = 0; i < 7; i += 1) {
          const tongue = add("fire.tongue", new THREE.ConeGeometry(0.25, 1.8, 5));
          tongue.rotation.x = -Math.PI / 2;
          tongue.position.set(Math.sin(i) * 0.46, Math.cos(i) * 0.46, -0.8);
        }
        break;
      }
      case "star": {
        add("astral.star", starGeometry(0.9, 0.37, 5), this.coreMaterial);
        for (let i = 0; i < 3; i += 1) this.ring(this.projectile, 1 + i * 0.1, this.shotMaterial).rotation.set(i * 1.2, i * 0.8, 0);
        break;
      }
      case "water": {
        for (let i = 0; i < 3; i += 1) {
          const wave = this.ring(this.projectile, 0.85 + i * 0.16, this.shotMaterial, 0.13);
          wave.scale.y = 0.65;
          wave.position.z = -i * 1.25;
          wave.rotation.z = i * 0.35;
        }
        add("water.pearl", new THREE.SphereGeometry(0.3, 12, 8), this.coreMaterial);
        break;
      }
      case "raven": {
        add("raven.dark-star", new THREE.OctahedronGeometry(0.4, 0), this.coreMaterial);
        for (let i = 0; i < 10; i += 1) {
          const feather = add("raven.wing", featherGeometry());
          const side = i % 2 === 0 ? -1 : 1;
          feather.position.set(side * (0.35 + Math.floor(i / 2) * 0.21), 0.15, -Math.floor(i / 2) * 0.22);
          feather.rotation.z = side * (0.6 + Math.floor(i / 2) * 0.16);
          feather.scale.setScalar(2.2);
        }
        break;
      }
      case "gear": {
        for (let i = 0; i < 3; i += 1) {
          const cog = add("clockwork.cog", gearGeometry(0.7 - i * 0.1, 12), i % 2 ? this.coreMaterial : this.shotMaterial);
          cog.position.z = -i * 0.65;
          cog.rotation.y = i * 0.35;
        }
        break;
      }
    }
    for (let i = 0; i < 12; i += 1) {
      const trail = this.mesh(this.projectile, `magic.trail.${i}`, this.particleGeometry(i), i % 3 === 0 ? this.coreMaterial : this.shotMaterial);
      this.trails.push(trail);
    }
  }

  private buildBurst(): void {
    for (let i = 0; i < 3; i += 1) {
      const ring = this.ring(this.burst, 0.9 + i * 0.28, i === 1 ? this.haloMaterial : this.burstMaterial, 0.055);
      ring.name = `magic.shockwave.${i}`;
      ring.rotation.set(i * Math.PI / 3, i * Math.PI / 4, 0);
    }
    const count = this.theme === "sun" || this.theme === "fire" ? 28 : 20;
    for (let i = 0; i < count; i += 1) {
      let geometry = this.particleGeometry(i);
      if (this.theme === "moon") geometry = crescentGeometry();
      if (this.theme === "sun") geometry = new THREE.ConeGeometry(0.12, 1.1, 4);
      if (this.theme === "gear") geometry = gearGeometry(0.24, 8);
      const fragment = this.mesh(this.burst, `magic.fragments.${this.theme}.${i}`, geometry, i % 3 === 0 ? this.haloMaterial : this.burstMaterial);
      this.debris.push({ mesh: fragment, angle: i * 2.39996, ring: 0.65 + i % 5 * 0.14 });
    }
  }

  public update(progress: number, muzzle: THREE.Vector3): void {
    this.group.visible = !this.disposed && progress >= 0.04 && progress < 1.3;
    if (!this.group.visible) return;
    const charge = clamp((progress - 0.04) / 0.5);
    const flight = clamp((progress - 0.54) / 0.34);
    const impact = clamp((progress - 0.88) / 0.42);
    const flying = progress >= 0.54 && progress < 0.9;
    this.muzzle.copy(muzzle);
    this.ground.visible = progress < 0.8;
    this.ground.rotation.z = progress * (this.theme === "gear" ? -3 : 1.8);
    this.ground.scale.setScalar(0.55 + charge * 0.45);
    this.groundMaterial.opacity = Math.sin(Math.min(progress / 0.8, 1) * Math.PI) * 0.8;
    this.charge.visible = progress < 0.6;
    this.charge.position.copy(muzzle);
    this.charge.scale.setScalar(0.5 + charge * 0.6);
    this.chargeMaterial.opacity = (1 - clamp((progress - 0.5) / 0.1)) * 0.82;
    this.rings.forEach((ring, i) => { ring.rotation.z = progress * (i % 2 ? -8 : 7); ring.rotation.y = i + progress * 3; });
    this.motes.forEach(({ mesh, angle, ring }, i) => {
      const radius = ring * (1.65 - charge * 0.95);
      mesh.position.set(Math.cos(angle + progress * 5) * radius, Math.sin(angle + progress * 5) * radius, Math.sin(angle * 2 + progress * 6) * radius * 0.65);
      mesh.rotation.set(progress * 6 + i, progress * 4 + i, angle + progress * 3);
      mesh.scale.setScalar(0.6 + charge * 0.8);
    });
    this.projectile.visible = flying;
    this.projectile.position.copy(muzzle);
    if (this.theme !== "sun") this.projectile.position.z += flight * 11.5;
    this.projectile.rotation.z = this.theme === "gear" ? progress * -14 : this.theme === "water" ? Math.sin(progress * 9) * 0.12 : progress * 4;
    if (this.theme === "sun") this.projectile.rotation.z = 0;
    this.projectile.scale.setScalar(this.theme === "sun" ? 0.6 + Math.sin(flight * Math.PI) * 0.4 : 0.8 + Math.sin(flight * Math.PI) * 0.25);
    this.shotMaterial.opacity = flying ? 0.82 : 0;
    this.trails.forEach((mesh, i) => {
      const radius = 0.15 + (i / 12) * 0.55;
      const angle = progress * 17 + i * 2.4;
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.3 - i * 0.3);
      mesh.rotation.set(angle, angle * 0.7, angle);
      mesh.scale.setScalar((1 - i / 14) * (this.theme === "fire" ? 2.1 : 1.3));
    });
    this.burst.visible = progress >= 0.88;
    this.burst.position.copy(muzzle);
    this.burst.position.z += 11.5;
    this.burst.scale.setScalar(0.4 + Math.sin(impact * Math.PI / 2) * 2.3);
    this.burst.rotation.z = progress * (this.theme === "gear" ? -4 : 1);
    this.glows[0].opacity = 0.4 + charge * 0.35;
    this.glows[1].opacity = 0.7;
    this.glows[2].opacity = (1 - impact) * 0.85;
    this.burstMaterial.opacity = Math.pow(1 - impact, 1.2) * 0.9;
    this.haloMaterial.opacity = (1 - impact) * 0.55;
    this.debris.forEach(({ mesh, angle, ring }, i) => {
      const radius = ring * (0.4 + impact * 1.6);
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(i * 2.1) * radius * 0.7);
      mesh.rotation.set(angle + impact * 5, i + impact * 3, angle + impact * 6);
      mesh.scale.setScalar((this.theme === "moon" ? 0.32 : 1.1) * (1 - impact * 0.55));
    });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.group.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>();
    this.group.traverse(node => { if (node instanceof THREE.Mesh) geometries.add(node.geometry); });
    geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
    this.glows.forEach(material => material.dispose());
    this.glowTexture.dispose();
    this.group.visible = false;
  }
}

function clamp(value: number): number { return THREE.MathUtils.clamp(value, 0, 1); }
function shapeGeometry(points: readonly (readonly [number, number])[]): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => { if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y); });
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}
function leafGeometry(): THREE.BufferGeometry { return shapeGeometry([[0, -.28], [.13, -.08], [.17, .12], [0, .37], [-.17, .12], [-.13, -.08]]); }
function featherGeometry(): THREE.BufferGeometry { return shapeGeometry([[0, -.35], [.12, -.05], [.08, .1], [.16, .25], [.03, .51], [-.1, .25], [-.15, .07]]); }
function starGeometry(outer: number, inner: number, points: number): THREE.BufferGeometry {
  return shapeGeometry(Array.from({ length: points * 2 }, (_, i) => {
    const angle = i / points * Math.PI + Math.PI / 2;
    const radius = i % 2 ? inner : outer;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  }));
}
function crescentGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, .7, .75, Math.PI * 2 - .75, false);
  shape.absarc(.29, 0, .53, -1.25, 1.25, true);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 24);
}
function gearGeometry(radius: number, teeth: number): THREE.BufferGeometry {
  return shapeGeometry(Array.from({ length: teeth * 4 }, (_, i) => {
    const angle = i / (teeth * 4) * Math.PI * 2;
    const r = radius * (i % 4 < 2 ? 1 : .76);
    return [Math.cos(angle) * r, Math.sin(angle) * r] as const;
  }));
}
function helixGeometry(offset: number): THREE.BufferGeometry {
  const points = Array.from({ length: 30 }, (_, i) => {
    const angle = i / 29 * Math.PI * 4 + offset;
    return new THREE.Vector3(Math.cos(angle) * .35, Math.sin(angle) * .35, i / 29 * 2.7);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 35, .065, 5, false);
}

/** Small generated radial texture keeps luminous particles soft without an external asset. */
function createGlowTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
      const alpha = Math.pow(Math.max(0, 1 - radius), 2.2);
      const index = (y * size + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}
